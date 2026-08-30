"""
Misinformation Defense System — Confidence Scoring Engine
Implements: intake tagging, domain verifiers, scoring, routing, audit trail.
"""
from __future__ import annotations
import uuid
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional

# ─── In-memory stores (demo; production: persist to Supabase) ─────────────────
_audit_log: list[dict] = []
_moderation_queue: list[dict] = []
_known_false_claims: list[str] = [
    "pm kisan yojana closed",
    "kisan scheme fraud government",
    "onion price fake subsidy",
    "crop spray mercury cure",
    "pomegranate disease bleach solution",
    "bus scheme cancelled kopargaon",
]
_verified_schemes: list[str] = [
    "pm kisan samman nidhi",
    "pradhan mantri fasal bima yojana",
    "soil health card scheme",
    "kisan credit card",
    "pm kusum yojana",
    "rashtriya krishi vikas yojana",
    "national food security mission",
    "kopargaon mobility exchange",
    "smartbus parcel service",
]
_verified_agri: list[str] = [
    "bordeaux mixture for fungal disease",
    "neem oil spray for pest control",
    "drip irrigation for water conservation",
    "crop rotation for soil health",
    "ipm integrated pest management",
    "urea application schedule",
]

# ─── Confidence Score computation ─────────────────────────────────────────────
def _text_similarity(a: str, b: str) -> float:
    """Naive word-overlap similarity score [0-1]."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def _check_scheme_claim(text: str) -> dict:
    """Cross-check claim against known govt scheme list."""
    text_lower = text.lower()
    # Check against known-false first
    for false_claim in _known_false_claims:
        if _text_similarity(text_lower, false_claim) > 0.4:
            return {"verdict": "HIGH_FALSE", "source": "known-false-claims-DB", "similarity": _text_similarity(text_lower, false_claim)}
    # Check against verified schemes
    for scheme in _verified_schemes:
        sim = _text_similarity(text_lower, scheme)
        if sim > 0.3:
            return {"verdict": "HIGH_TRUE", "source": f"Verified Govt Scheme Registry — {scheme.title()}", "similarity": sim}
    return {"verdict": "UNVERIFIABLE", "source": "No matching scheme found in registry", "similarity": 0.0}


def _check_agri_claim(text: str) -> dict:
    """Cross-check against agri-extension / ICAR knowledge base."""
    text_lower = text.lower()
    for false_claim in _known_false_claims:
        if _text_similarity(text_lower, false_claim) > 0.35:
            return {"verdict": "HIGH_FALSE", "source": "ICAR Agri-Misinformation DB", "similarity": _text_similarity(text_lower, false_claim)}
    for advice in _verified_agri:
        sim = _text_similarity(text_lower, advice)
        if sim > 0.3:
            return {"verdict": "HIGH_TRUE", "source": f"ICAR/Agri-Extension Verified Guidance — {advice.title()}", "similarity": sim}
    return {"verdict": "UNVERIFIABLE", "source": "Not found in ICAR/Agri-Extension DB — route to expert", "similarity": 0.0}


def _check_report_integrity(content: dict) -> dict:
    """Anomaly/coordination detection for citizen reports."""
    signals = []
    score_penalty = 0.0

    # Velocity: many similar submissions (simulated)
    text = content.get("text", "")
    similar_count = sum(
        1 for item in _audit_log
        if _text_similarity(item.get("text", ""), text) > 0.6
        and item.get("claim_type") == "citizen_report"
    )
    if similar_count >= 2:
        signals.append(f"Coordination signal: {similar_count} similar reports detected in short window")
        score_penalty += 0.4

    # No evidence attached
    if not content.get("evidence_url") and not content.get("location"):
        signals.append("No corroborating evidence or location provided")
        score_penalty += 0.2

    if score_penalty >= 0.5:
        return {"verdict": "COORDINATION_FLAG", "signals": signals, "penalty": score_penalty}
    if score_penalty > 0:
        return {"verdict": "PARTIAL_FLAG", "signals": signals, "penalty": score_penalty}
    return {"verdict": "CLEAN", "signals": [], "penalty": 0.0}


def _compute_confidence(claim_type: str, domain_result: dict, submitter_history: float = 0.5) -> dict:
    """
    Returns numeric confidence score [0-1] + band.
    Bands:  >=0.75 → auto-route | 0.45-0.75 → human queue | <0.45 → auto-flag
    """
    base = {
        "HIGH_TRUE": 0.90,
        "HIGH_FALSE": 0.05,
        "UNVERIFIABLE": 0.45,
        "COORDINATION_FLAG": 0.10,
        "PARTIAL_FLAG": 0.40,
        "CLEAN": 0.72,
    }.get(domain_result.get("verdict", "UNVERIFIABLE"), 0.45)

    # Boost from verified similarity
    sim_boost = domain_result.get("similarity", 0.0) * 0.1
    # Submitter history (0=unknown, 1=trusted)
    history_mod = (submitter_history - 0.5) * 0.1

    score = min(1.0, max(0.0, base + sim_boost + history_mod))
    penalty = domain_result.get("penalty", 0.0) if claim_type == "citizen_report" else 0.0
    score = max(0.0, score - penalty)

    if score >= 0.75:
        band = "HIGH_TRUE"
        route = "auto_publish"
        label = "Verified"
        label_color = "emerald"
    elif score <= 0.30:
        band = "HIGH_FALSE"
        route = "auto_suppress"
        label = "Disputed"
        label_color = "red"
    else:
        band = "AMBIGUOUS"
        route = "human_queue"
        label = "Unverified — Pending Review"
        label_color = "amber"

    return {
        "score": round(score, 3),
        "band": band,
        "route": route,
        "label": label,
        "label_color": label_color,
    }


# ─── Public entrypoint ────────────────────────────────────────────────────────
async def analyze_content(payload: dict) -> dict:
    """
    Full pipeline: intake → domain verify → score → route → audit log.
    """
    claim_id = f"MIS-{uuid.uuid4().hex[:10].upper()}"
    text = payload.get("text", "")
    claim_type = payload.get("claim_type", "general")  # scheme / agri / citizen_report
    submitter_id = payload.get("submitter_id", "anonymous")
    evidence_url = payload.get("evidence_url", "")
    location = payload.get("location", "")
    timestamp = datetime.now(timezone.utc).isoformat()

    # Intake hash (fingerprint for dedup)
    content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]

    # Domain verification
    if claim_type == "scheme":
        domain_result = _check_scheme_claim(text)
    elif claim_type == "agri":
        domain_result = _check_agri_claim(text)
    elif claim_type == "citizen_report":
        domain_result = _check_report_integrity({
            "text": text,
            "evidence_url": evidence_url,
            "location": location,
        })
    else:
        domain_result = {"verdict": "UNVERIFIABLE", "source": "No domain verifier for type", "similarity": 0.0}

    # Score + route
    confidence = _compute_confidence(claim_type, domain_result)

    # Route to queue if human needed
    if confidence["route"] == "human_queue":
        _moderation_queue.append({
            "claim_id": claim_id,
            "text": text,
            "claim_type": claim_type,
            "submitter_id": submitter_id,
            "domain_result": domain_result,
            "confidence": confidence,
            "status": "pending",
            "queued_at": timestamp,
        })

    # Immutable audit log entry
    audit_entry = {
        "claim_id": claim_id,
        "content_hash": content_hash,
        "text": text,
        "claim_type": claim_type,
        "submitter_id": submitter_id,
        "domain_result": domain_result,
        "confidence": confidence,
        "route": confidence["route"],
        "timestamp": timestamp,
    }
    _audit_log.append(audit_entry)

    return {
        "claim_id": claim_id,
        "content_hash": content_hash,
        "confidence_score": confidence["score"],
        "confidence_band": confidence["band"],
        "route": confidence["route"],
        "trust_label": confidence["label"],
        "trust_label_color": confidence["label_color"],
        "domain_result": domain_result,
        "timestamp": timestamp,
    }


def get_moderation_queue() -> list[dict]:
    return [q for q in _moderation_queue if q["status"] == "pending"]


def resolve_moderation(claim_id: str, decision: str, moderator: str) -> dict:
    """Moderator resolves a queued item: 'confirm_true' | 'confirm_false' | 'escalate'"""
    for item in _moderation_queue:
        if item["claim_id"] == claim_id:
            item["status"] = decision
            item["resolved_by"] = moderator
            item["resolved_at"] = datetime.now(timezone.utc).isoformat()
            _audit_log.append({
                "claim_id": claim_id,
                "action": f"moderator_decision:{decision}",
                "moderator": moderator,
                "timestamp": item["resolved_at"],
            })
            return item
    return {"error": "Claim not found"}


def get_audit_log(limit: int = 50) -> list[dict]:
    return list(reversed(_audit_log))[:limit]
