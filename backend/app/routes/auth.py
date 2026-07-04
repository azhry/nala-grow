from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import settings
from app.middleware.auth import get_current_user
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
)
from app.services.supabase import get_supabase_admin_client, get_supabase_client

router = APIRouter()


@router.post(
    "/auth/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=AuthResponse,
)
async def signup(body: SignupRequest):
    client = get_supabase_client()
    try:
        response = client.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"full_name": body.full_name}},
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    user = response.user
    session = response.session

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User could not be created",
        )

    return AuthResponse(
        access_token=session.access_token if session else "",
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": (user.user_metadata or {}).get("full_name", body.full_name),
        },
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    client = get_supabase_client()
    try:
        response = client.auth.sign_in_with_password(
            {
                "email": body.email,
                "password": body.password,
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return AuthResponse(
        access_token=response.session.access_token,
        token_type="bearer",
        user={
            "id": response.user.id,
            "email": response.user.email,
            "full_name": (response.user.user_metadata or {}).get("full_name", ""),
        },
    )


@router.get("/auth/oauth/google")
async def oauth_google(
    redirect_to: str = Query(
        default=f"{settings.supabase_url}/auth/v1/callback",
        description="URL to redirect after OAuth",
    ),
):
    params = {"provider": "google", "redirect_to": redirect_to}
    oauth_url = f"{settings.supabase_url}/auth/v1/authorize?{urlencode(params)}"
    return {"url": oauth_url}


@router.post("/auth/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    redirect_to: str = Query(
        default=f"{settings.supabase_url}/auth/v1/callback",
        description="URL to redirect after password reset",
    ),
):
    client = get_supabase_client()
    try:
        client.auth.reset_password_for_email(
            body.email,
            {"redirect_to": redirect_to},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return {"message": "Reset email sent"}


@router.get("/auth/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
):
    admin_client = get_supabase_admin_client()
    try:
        user_data = admin_client.auth.admin.get_user_by_id(current_user["id"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    metadata = (user_data.user.user_metadata or {}) if user_data.user else {}

    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": metadata.get("full_name", ""),
    }
