import os, re
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import require_roles
from app.core.security import get_password_hash, verify_password
from app.models.school_settings import SchoolSettings
from app.models.student import Student
from app.models.class_model import ClassModel

router = APIRouter()

# ── Helper: get or create singleton settings ──
async def get_settings() -> SchoolSettings:
    s = await SchoolSettings.find_one()
    if not s:
        s = SchoolSettings()
        await s.insert()
    return s

# ── PIN Verification ──
class PinBody(BaseModel):
    pin: str

@router.post("/verify-pin")
async def verify_pin(body: PinBody, _=Depends(require_roles(["superadmin"]))):
    settings = await get_settings()
    if not settings.admin_pin:
        raise HTTPException(status_code=400, detail="PIN not set")
        
    if settings.admin_pin.startswith("$2"):
        if not verify_password(body.pin, settings.admin_pin):
            raise HTTPException(status_code=401, detail="Invalid PIN")
    else:
        # Fallback for plain text PINs (legacy), upgrade immediately
        if body.pin != settings.admin_pin:
            raise HTTPException(status_code=401, detail="Invalid PIN")
        settings.admin_pin = get_password_hash(body.pin)
        await settings.save()
        
    return {"verified": True}

# ── School Settings CRUD ──
@router.get("/school-settings")
async def read_school_settings():
    s = await get_settings()
    data = s.model_dump()
    data.pop("admin_pin", None)  # Never expose the PIN publicly
    return data

@router.get("/school-settings/full")
async def read_school_settings_full(_=Depends(require_roles(["superadmin"]))):
    """Full settings including admin_pin — superadmin only."""
    return await get_settings()

class SchoolSettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_no: Optional[str] = None
    principal_name: Optional[str] = None
    admission_head: Optional[str] = None
    hr_head: Optional[str] = None
    admin_pin: Optional[str] = None

@router.put("/school-settings")
async def update_school_settings(body: SchoolSettingsUpdate, _=Depends(require_roles(["superadmin"]))):
    s = await get_settings()
    update_data = body.model_dump(exclude_none=True)
    
    if "admin_pin" in update_data:
        update_data["admin_pin"] = get_password_hash(update_data["admin_pin"])

    for field, value in update_data.items():
        setattr(s, field, value)
    await s.save()
    return s

class LicenseUpdate(BaseModel):
    license_key: str

@router.post("/update-license")
async def update_license(body: LicenseUpdate, _=Depends(require_roles(["superadmin"]))):
    s = await get_settings()
    s.license_key = body.license_key
    await s.save()
    
    # Instantly clear the cache so the middleware recognizes the new license
    from app.core.license_middleware import clear_license_cache
    clear_license_cache()
    
    return {"message": "License updated successfully."}

@router.post("/school-logo")
async def upload_school_logo(file: UploadFile = File(...), _=Depends(require_roles(["superadmin"]))):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed.")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "branding")
    os.makedirs(uploads_dir, exist_ok=True)
    
    ext = ".png" if file.content_type == "image/png" else (".webp" if file.content_type == "image/webp" else ".jpg")
    
    filepath = os.path.join(uploads_dir, f"school_logo{ext}")
    with open(filepath, "wb") as f:
        f.write(await file.read())
    s = await get_settings()
    s.logo_url = f"/uploads/branding/school_logo{ext}"
    await s.save()
    return {"logo_url": s.logo_url}

# ── Student Promotion ──
def extract_grade(name: str) -> Optional[int]:
    match = re.search(r'(\d+)', name or "")
    if match:
        return int(match.group(1))
    return None

@router.get("/promotion-preview")
async def promotion_preview(_=Depends(require_roles(["superadmin"]))):
    classes = await ClassModel.find_all().to_list()
    students = await Student.find(Student.is_active == True).to_list()
    
    class_map = {c.id: c for c in classes}
    grade_to_classes = {}
    for c in classes:
        g = extract_grade(c.name)
        if g is not None:
            grade_to_classes.setdefault(g, []).append(c)
    
    max_grade = max(grade_to_classes.keys()) if grade_to_classes else 10
    
    preview = []
    for grade in sorted(grade_to_classes.keys()):
        count = sum(1 for s in students if s.class_id in [c.id for c in grade_to_classes[grade]])
        if grade >= max_grade:
            preview.append({"from_grade": grade, "to": "Passed Out", "count": count})
        else:
            preview.append({"from_grade": grade, "to_grade": grade + 1, "to": f"Grade {grade + 1}", "count": count})
    
    return {"max_grade": max_grade, "preview": preview, "total_students": len(students)}

@router.post("/promote-students")
async def promote_students(_=Depends(require_roles(["superadmin"]))):
    classes = await ClassModel.find_all().to_list()
    students = await Student.find(Student.is_active == True).to_list()
    
    class_map = {c.id: c for c in classes}
    grade_to_classes = {}
    for c in classes:
        g = extract_grade(c.name)
        if g is not None:
            grade_to_classes.setdefault(g, []).append(c)
    
    max_grade = max(grade_to_classes.keys()) if grade_to_classes else 10
    
    promoted = 0
    passed_out = 0
    errors = 0
    
    for student in students:
        cls = class_map.get(student.class_id)
        if not cls:
            errors += 1
            continue
        
        current_grade = extract_grade(cls.name)
        if current_grade is None:
            errors += 1
            continue
        
        if current_grade >= max_grade:
            # Mark as passed out
            student.is_active = False
            await student.save()
            passed_out += 1
        else:
            # Find next grade class with same section
            next_grade = current_grade + 1
            next_classes = grade_to_classes.get(next_grade, [])
            
            # Try to match section first
            target = None
            for nc in next_classes:
                if nc.section == cls.section:
                    target = nc
                    break
            if not target and next_classes:
                target = next_classes[0]
            
            if target:
                student.class_id = target.id
                await student.save()
                promoted += 1
            else:
                errors += 1
    
    return {
        "message": f"Promotion complete. {promoted} promoted, {passed_out} passed out, {errors} skipped.",
        "promoted": promoted,
        "passed_out": passed_out,
        "errors": errors
    }
