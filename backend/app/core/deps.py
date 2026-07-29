from datetime import timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import PyJWTError as JWTError
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..core.security import decode_token
from ..models.user import User

bearer_scheme = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        email: str = payload.get("sub")
        issued_at = payload.get("iat")
        if not email or issued_at is None:
            raise exc
    except JWTError:
        raise exc

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise exc

    if user.password_changed_at is not None:
        password_changed_at = user.password_changed_at
        if password_changed_at.tzinfo is None:
            password_changed_at = password_changed_at.replace(tzinfo=timezone.utc)
        # Truncate to whole seconds: JWT `iat` only has second-level
        # precision, so a token issued in the same second as the password
        # change must not be rejected as stale.
        if issued_at < int(password_changed_at.timestamp()):
            raise exc

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador",
        )
    return current_user
