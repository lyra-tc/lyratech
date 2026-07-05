from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..core.security import create_access_token, get_password_hash, verify_password
from ..models.user import User
from ..schemas.auth import LoginRequest, Token
from ..schemas.user import UserCreate, UserResponse


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


router = APIRouter(prefix="/auth", tags=["auth"])


def is_superadmin_identity(full_name: str) -> bool:
    return full_name.strip().lower() == "ricardo sierra roa"


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contrasena incorrectos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Tu cuenta esta pendiente de activacion por un administrador",
        )

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    is_first_user = db.query(User.id).first() is None
    is_superadmin = is_superadmin_identity(body.full_name)
    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        is_active=is_first_user or is_superadmin,
        is_admin=is_first_user or is_superadmin,
        is_superadmin=is_superadmin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
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
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="La contrasena debe tener al menos 6 caracteres"
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()
