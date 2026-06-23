from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import jwt
import os
import time

# In-memory cache to prevent database lookups on every single API request
_LICENSE_CACHE = {
    "key": None,
    "valid": False,
    "last_checked": 0
}

CACHE_TTL = 300  # 5 minutes

def clear_license_cache():
    _LICENSE_CACHE["last_checked"] = 0

class LicenseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow auth state to resolve so user can login and access the settings page
        excluded_paths = ["/admin/update-license", "/auth/login", "/auth/me", "/docs", "/openapi.json", "/redoc", "/uploads"]
        if any(request.url.path.startswith(path) for path in excluded_paths) or request.method == "OPTIONS":
            return await call_next(request)
            
        current_time = time.time()
        
        # If cache expired (older than 5 mins), re-fetch from DB
        if current_time - _LICENSE_CACHE["last_checked"] > CACHE_TTL:
            from app.models.school_settings import SchoolSettings
            try:
                settings = await SchoolSettings.find_one()
                _LICENSE_CACHE["key"] = settings.license_key if settings else None
            except Exception:
                _LICENSE_CACHE["key"] = None
                
            _LICENSE_CACHE["last_checked"] = current_time
            _LICENSE_CACHE["valid"] = False
            
            if _LICENSE_CACHE["key"]:
                LICENSE_SECRET_KEY = os.getenv("LICENSE_SECRET_KEY", "super_secret_master_license_key_for_this_deployment")
                try:
                    # Automatically validates expiration ('exp' claim)
                    jwt.decode(_LICENSE_CACHE["key"], LICENSE_SECRET_KEY, algorithms=["HS256"])
                    _LICENSE_CACHE["valid"] = True
                except Exception:
                    _LICENSE_CACHE["valid"] = False

        if not _LICENSE_CACHE["key"]:
            return JSONResponse(status_code=402, content={"detail": "License key missing. Please contact support to activate your product."})
            
        if not _LICENSE_CACHE["valid"]:
            return JSONResponse(status_code=402, content={"detail": "License Expired or Invalid. Please contact billing."})
            
        return await call_next(request)
