from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.deps import get_current_admin, get_db
from ..core.security import get_password_hash
from ..models.user import User
from ..schemas.user import UserResponse


class UserAdminUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str


router = APIRouter(prefix="/users", tags=["users"])


def _get_target_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


def _ensure_not_superadmin(user: User) -> None:
    if user.is_superadmin:
        raise HTTPException(
            status_code=400,
            detail="La cuenta superadmin no se puede modificar ni eliminar",
        )


def _ensure_mutable_user(actor: User, target: User, body: UserAdminUpdateRequest) -> None:
    _ensure_not_superadmin(target)

    if target.is_admin:
        # Solo el superadmin puede quitar admin a otro admin normal.
        only_removing_admin = (
            actor.is_superadmin
            and body.is_admin is False
            and body.is_active is None
        )
        if not only_removing_admin:
            raise HTTPException(
                status_code=400,
                detail="Las cuentas admin solo pueden ser modificadas por el superadmin para quitarles admin",
            )


@router.get("/", response_model=list[UserResponse])
def list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserAdminUpdateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if body.is_active is None and body.is_admin is None:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")

    user = _get_target_user(user_id, db)
    _ensure_mutable_user(current_user, user, body)

    if body.is_active is not None:
      user.is_active = body.is_active
    if body.is_admin is not None:
      user.is_admin = body.is_admin

    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/reset-password", status_code=204)
def reset_user_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contrasena debe tener al menos 6 caracteres",
        )

    user = _get_target_user(user_id, db)
    if user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="No se puede resetear la contrasena de una cuenta admin",
        )
    _ensure_not_superadmin(user)
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = _get_target_user(user_id, db)
    if user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar una cuenta admin",
        )
    _ensure_not_superadmin(user)
    db.delete(user)
    db.commit()
