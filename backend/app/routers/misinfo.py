"""
Misinformation Defense System — FastAPI Router
Endpoints: analyze, moderation queue, resolve, audit log.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.misinformation import (
    analyze_content,
    get_moderation_queue,
    resolve_moderation,
    get_audit_log,
)

router = APIRouter(prefix="/api/misinfo", tags=["misinformation"])


class AnalyzeRequest(BaseModel):
    text: str
    claim_type: str  # "scheme" | "agri" | "citizen_report" | "general"
    submitter_id: Optional[str] = "anonymous"
    evidence_url: Optional[str] = ""
    location: Optional[str] = ""


class ResolveRequest(BaseModel):
    decision: str   # "confirm_true" | "confirm_false" | "escalate"
    moderator: str


@router.post("/analyze")
async def analyze(body: AnalyzeRequest):
    """
    Submit content for misinformation analysis.
    Returns: confidence score, trust label, routing decision, provenance.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text content is required")
    result = await analyze_content(body.dict())
    return result


@router.get("/queue")
async def get_queue():
    """Return pending human moderation queue (gray-zone items)."""
    return {"queue": get_moderation_queue(), "count": len(get_moderation_queue())}


@router.post("/queue/{claim_id}/resolve")
async def resolve(claim_id: str, body: ResolveRequest):
    """Moderator resolves a queued claim."""
    valid = {"confirm_true", "confirm_false", "escalate"}
    if body.decision not in valid:
        raise HTTPException(status_code=400, detail=f"Decision must be one of: {valid}")
    result = resolve_moderation(claim_id, body.decision, body.moderator)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/audit")
async def audit_log(limit: int = 50):
    """Return immutable audit trail (most recent first)."""
    return {"log": get_audit_log(limit), "total": len(get_audit_log(limit))}
