"""
Authentication endpoints using Supabase Auth.
POST /api/auth/signup  — create account with email + password + name + role
POST /api/auth/login   — sign in, returns access_token
GET  /api/auth/me      — returns current user profile from JWT
"""
from __future__ import annotations
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.db.supabase import get_db

router = APIRouter(tags=["auth"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "customer"


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _user_to_dict(u) -> dict:
    """Serialize a Supabase user object to a clean dict."""
    if u is None:
        return {}
    # Handle both dict-like and object forms from different supabase-py versions
    if isinstance(u, dict):
        return u
    user_dict = {}
    for attr in ("id", "email", "email_confirmed_at", "created_at", "last_sign_in_at"):
        val = getattr(u, attr, None)
        if val is not None:
            user_dict[attr] = str(val)
    # user_metadata
    meta = getattr(u, "user_metadata", None) or {}
    if meta:
        user_dict["user_metadata"] = dict(meta)
    return user_dict


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/api/auth/signup")
async def signup(body: SignupRequest):
    """Register a new user via Supabase Auth."""
    email = body.email.strip().lower()
    password = body.password
    name = body.name.strip()
    role = body.role.strip().lower() or "customer"

    # Basic server-side validation
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    try:
        db = get_db()
        result = db.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"name": name, "role": role}
            },
        })

        user = result.user
        session = result.session

        if user is None:
            raise HTTPException(status_code=400, detail="Signup failed — please try again")

        # If email confirmation is disabled, session is returned immediately
        access_token = session.access_token if session else None

        return {
            "message": "Account created successfully",
            "user": _user_to_dict(user),
            "access_token": access_token,
            "email_confirmation_required": access_token is None,
        }

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e).lower()
        if "already registered" in err_msg or "already exists" in err_msg or "duplicate" in err_msg:
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
        if "password" in err_msg:
            raise HTTPException(status_code=400, detail="Password is too weak. Use at least 8 characters with a number.")
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")


@router.post("/api/auth/login")
async def login(body: LoginRequest):
    """Sign in with email + password, returns access_token."""
    email = body.email.strip().lower()
    password = body.password

    try:
        db = get_db()
        result = db.auth.sign_in_with_password({"email": email, "password": password})

        user = result.user
        session = result.session

        if user is None or session is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "message": "Signed in successfully",
            "user": _user_to_dict(user),
            "access_token": session.access_token,
            "token_type": "bearer",
        }

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e).lower()
        if "invalid" in err_msg or "credentials" in err_msg or "not found" in err_msg or "wrong" in err_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if "email not confirmed" in err_msg:
            raise HTTPException(status_code=403, detail="Please confirm your email before signing in")
        raise HTTPException(status_code=401, detail="Login failed. Check your credentials and try again.")


@router.get("/api/auth/me")
async def get_me(request: Request):
    """Get current user profile from Authorization Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No authentication token provided")

    token = auth_header.removeprefix("Bearer ").strip()

    try:
        db = get_db()
        user_response = db.auth.get_user(token)
        user = user_response.user

        if user is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return {"user": _user_to_dict(user)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token validation failed — please sign in again")
