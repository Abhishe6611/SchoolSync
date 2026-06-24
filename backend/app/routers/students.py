from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.student import StudentCreate, StudentRead, StudentUpdate
from app.services.student_service import (
    create_student,
    delete_student,
    get_student,
    get_students,
    update_student,
    get_passed_out_students,
)
from app.services.import_service import parse_import_file

router = APIRouter()


from app.models.admin_user import AdminUser
from app.services.audit_service import log_activity

@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
async def create_student_endpoint(
    student_in: StudentCreate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> StudentRead:
    try:
        student = await create_student(student_in)
        await log_activity(
            user_id=current_user.id,
            user_email=current_user.email,
            action="CREATE",
            entity="Student",
            entity_id=student.id,
            details={"name": f"{student.first_name} {student.last_name}"}
        )
        return student
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/", response_model=list[StudentRead])
async def list_students(
    skip: int = 0,
    limit: int = 10000,
    class_id: int = None,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[StudentRead]:
    return await get_students(skip=skip, limit=limit, class_id=class_id)


@router.get("/passed-out", response_model=list[StudentRead])
async def list_passed_out_students(
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[StudentRead]:
    return await get_passed_out_students()


@router.get("/{student_id}", response_model=StudentRead)
async def get_student_endpoint(
    student_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> StudentRead:
    student = await get_student(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=StudentRead)
async def update_student_endpoint(
    student_id: int,
    student_in: StudentUpdate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> StudentRead:
    student = await get_student(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    updated_student = await update_student(student, student_in)
    await log_activity(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE",
        entity="Student",
        entity_id=student.id,
        details={"updated_fields": list(student_in.model_dump(exclude_unset=True).keys())}
    )
    return updated_student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_endpoint(
    student_id: int,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> None:
    student = await get_student(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    await delete_student(student)
    await log_activity(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE",
        entity="Student",
        entity_id=student_id,
        details={"name": f"{student.first_name} {student.last_name}"}
    )
    return None


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_students(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_student(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Student ID {row['id']} already exists)")
                    continue
            student_in = StudentCreate(**row)
            await create_student(student_in)
            count += 1
        except ValidationError as e:
            errors.append(f"Row {i+2}: Validation error - {e.errors()[0]['msg']}")
        except ValueError as e:
            errors.append(f"Row {i+2}: {str(e)}")
        except Exception as e:
            errors.append(f"Row {i+2}: Unexpected error - {str(e)}")
            
    if errors:
        return {"count": count, "errors": errors, "message": "Import completed with some errors"}
    
    return {"count": count, "message": "Import completed successfully"}


@router.post("/{student_id}/photo")
async def upload_student_photo(
    student_id: int,
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed.")

    import os, uuid
    student = await get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    # Delete old photo if exists
    if student.photo_url:
        old_rel_path = student.photo_url.lstrip('/')
        old_filepath = os.path.join(base_dir, old_rel_path)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except Exception:
                pass
    
    ext = ".png" if file.content_type == "image/png" else (".webp" if file.content_type == "image/webp" else ".jpg")
    filename = f"{student_id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = os.path.join(base_dir, "uploads", "students")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    student.photo_url = f"/uploads/students/{filename}"
    await student.save()
    return {"photo_url": student.photo_url}
