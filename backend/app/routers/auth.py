import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..core.limiter import limiter
from ..core.security import create_access_token, get_password_hash, verify_password
from ..models.user import User
from ..schemas.auth import LoginRequest, Token
from ..schemas.user import UserCreate, UserResponse

logger = logging.getLogger("security")

MIN_PASSWORD_LENGTH = 6


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning(
            "Failed login attempt for %s from %s",
            body.email,
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contrasena incorrectos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Tu cuenta esta pendiente de activacion por un administrador",
        )

    logger.info(
        "Successful login for %s from %s",
        user.email,
        request.client.host if request.client else "unknown",
    )
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/hour")
def register(request: Request, body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"La contrasena debe tener al menos {MIN_PASSWORD_LENGTH} caracteres",
        )

    is_first_user = db.query(User.id).first() is None
    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        is_active=is_first_user,
        is_admin=is_first_user,
        is_superadmin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(
        "New user registered: %s (active=%s, admin=%s) from %s",
        user.email,
        user.is_active,
        user.is_admin,
        request.client.host if request.client else "unknown",
    )
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.email and body.email != current_user.email:
        if db.query(User).filter(User.email == body.email).first():
            raise HTTPException(status_code=400, detail="El correo ya esta en uso")
        current_user.email = body.email
    if body.full_name:
        current_user.full_name = body.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/change-password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"La contrasena debe tener al menos {MIN_PASSWORD_LENGTH} caracteres",
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    logger.warning("Password changed by %s (all previous sessions invalidated)", current_user.email)
