import logging
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import SUPABASE_JWT_SECRET

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

security = HTTPBearer()

# Global cache for JWKS
jwks_client = None

def get_supabase_jwks():
    global jwks_client
    # If using requests (blocking) - simpler for this context
    import requests
    from app.config import SUPABASE_URL
    
    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    print(f"DEBUG: Fetching JWKS from {jwks_url}")
    response = requests.get(jwks_url)
    return response.json()

def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        token = credentials.credentials
        header = jwt.get_unverified_header(token)
        print(f"DEBUG: JWT Header: {header}")
        
        # Determine Algorithm
        alg = header.get("alg", "HS256")
        
        # 1. Handle Symmetric (HMAC) - The most likely default
        if alg.startswith("HS"):
            # Try plain, then base64
            secret = SUPABASE_JWT_SECRET
            try:
                return jwt.decode(token, secret, algorithms=[alg], options={"verify_aud": False})
            except JWTError:
                import base64
                if "Signature verification failed" in str(e_initial): # type: ignore
                     secret = base64.b64decode(SUPABASE_JWT_SECRET)
                     return jwt.decode(token, secret, algorithms=[alg], options={"verify_aud": False})
                raise

        # 2. Handle Asymmetric (RSA/EC) - Needs Public Key from JWKS
        elif alg.startswith("RS") or alg.startswith("PS") or alg.startswith("ES"):
             jwks = get_supabase_jwks()
             return jwt.decode(
                 token, 
                 jwks, 
                 algorithms=[alg], 
                 options={"verify_aud": False}
             )

        else:
            raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR: Auth Failed:\n{error_trace}")
        raise HTTPException(status_code=401, detail=f"Auth Error: {str(e)}")
