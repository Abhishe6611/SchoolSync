from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.models.admin_user import AdminUser
from app.schemas.grade import GradeCreate, GradeRead, GradeUpdate
from app.services.grade_service import (
    create_grade,
    delete_grade,
    get_grade,
    get_grades,
    update_grade,
)
from app.services.import_service import parse_import_file
from app.services.audit_service import log_activity

router = APIRouter(prefix="/grades", tags=["grades"])

@router.post("/", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade_endpoint(
    grade_in: GradeCreate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> GradeRead:
    try:
        grade = await create_grade(grade_in)
        await log_activity(
            user_id=current_user.id,
            user_email=current_user.email,
            action="CREATE",
            entity="Grade",
            entity_id=grade.id,
            details={"exam_id": grade.exam_id, "student_id": grade.student_id}
        )
        return grade
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get("/", response_model=list[GradeRead])
async def list_grades(
    skip: int = 0,
    limit: int = 500,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[GradeRead]:
    return await get_grades(skip=skip, limit=limit)

@router.get("/{grade_id}", response_model=GradeRead)
async def get_grade_endpoint(
    grade_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> GradeRead:
    grade = await get_grade(grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    return grade

@router.put("/{grade_id}", response_model=GradeRead)
async def update_grade_endpoint(
    grade_id: int,
    grade_in: GradeUpdate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> GradeRead:
    grade = await get_grade(grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    updated = await update_grade(grade, grade_in)
    await log_activity(
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE",
        entity="Grade",
        entity_id=grade.id,
        details={"updated_fields": list(grade_in.model_dump(exclude_unset=True).keys())}
    )
    return updated

@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade_endpoint(
    grade_id: int,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> None:
    grade = await get_grade(grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    await delete_grade(grade)
    await log_activity(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE",
        entity="Grade",
        entity_id=grade.id,
        details={"exam_id": grade.exam_id, "student_id": grade.student_id}
    )
    return None

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_grades(
    file: UploadFile = File(...),
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_grade(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Grade ID {row['id']} already exists)")
                    continue
            grade_in = GradeCreate(**row)
            await create_grade(grade_in)
            count += 1
        except ValidationError as e:
            errors.append(f"Row {i+2}: Validation error - {e.errors()[0]['msg']}")
        except ValueError as e:
            errors.append(f"Row {i+2}: {str(e)}")
        except Exception as e:
            errors.append(f"Row {i+2}: Unexpected error - {str(e)}")
            
    if count > 0:
        await log_activity(
            user_id=current_user.id,
            user_email=current_user.email,
            action="CREATE",
            entity="Grade",
            entity_id="BULK",
            details={"imported_count": count}
        )
            
    if errors:
        return {"count": count, "errors": errors, "message": "Import completed with some errors"}
    
    return {"count": count, "message": "Import completed successfully"}
