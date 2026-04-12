from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
import jwt
import os

from app.database import get_db
from app.models.user import User
from app.models.security import RevokedToken
from app.schemas.schemas import UserCreate, UserLogin, UserResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.rate_limit import limiter

router = APIRouter()

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )
    hashed_pass = get_password_hash(user_in.password)
    new_user = User(email=user_in.email, hashed_password=hashed_pass)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, response: Response, user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token, jti = create_refresh_token(data={"sub": str(user.id)})
    
    # Determine if we should use secure cookies
    # Local dev on http://localhost doesn't support Secure cookies
    is_prod = os.getenv("ENV", "development").lower() == "production"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax", # More permissive for cross-port local dev
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax", # More permissive for cross-port local dev
        path="/api/v1/auth/refresh",
    )
    return {"message": "Login successful"}

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    
    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        jti = payload.get("jti")
        
        if token_type != "refresh" or not user_id or not jti:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
            
        # Check revocation store
        revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if revoked:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has already been used or revoked")
            
        # Write to revocation store
        db.add(RevokedToken(jti=jti))
        db.commit()
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # Determine if we should use secure cookies
    is_prod = os.getenv("ENV", "development").lower() == "production"

    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token, new_jti = create_refresh_token(data={"sub": str(user.id)})
    
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/api/v1/auth/refresh",
    )
    
    # Cleanup task for old revoked tokens
    try:
        # Cleanup expired revoked tokens (e.g., older than 30 days)
        # Using python datetime for cross-database compatibility (SQLite/MySQL)
        expiry_threshold = datetime.now(timezone.utc) - timedelta(days=30)
        db.execute(
            text("DELETE FROM revoked_tokens WHERE revoked_at < :threshold"),
            {"threshold": expiry_threshold}
        )
        db.commit()
    except Exception:
        db.rollback()
        
    return {"message": "Token refreshed"}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti:
                # Make sure it's not already revoked
                if not db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
                    db.add(RevokedToken(jti=jti))
                    db.commit()
        except jwt.InvalidTokenError:
            pass # We don't care if it's invalid during logout

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"message": "Logged out"}
