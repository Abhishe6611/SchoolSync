from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.models.admin_user import AdminUser
from app.schemas.exam import ExamCreate, ExamRead, ExamUpdate
from app.services.exam_service import (
    create_exam,
    delete_exam,
    get_exam,
    get_exams,
    update_exam,
)
from app.services.audit_service import log_activity

router = APIRouter()

@router.post("/", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
async def create_exam_endpoint(
    exam_in: ExamCreate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> ExamRead:
    try:
        exam = await create_exam(exam_in)
        await log_activity(
            user_id=current_user.id,
            user_email=current_user.email,
            action="CREATE",
            entity="Exam",
            entity_id=exam.id,
            details={"name": exam.name, "term": exam.term}
        )
        return exam
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get("/", response_model=list[ExamRead])
async def list_exams(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[ExamRead]:
    return await get_exams(skip=skip, limit=limit)

@router.get("/{exam_id}", response_model=ExamRead)
async def get_exam_endpoint(
    exam_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> ExamRead:
    exam = await get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam

@router.put("/{exam_id}", response_model=ExamRead)
async def update_exam_endpoint(
    exam_id: int,
    exam_in: ExamUpdate,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> ExamRead:
    exam = await get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    try:
        updated = await update_exam(exam, exam_in)
        await log_activity(
            user_id=current_user.id,
            user_email=current_user.email,
            action="UPDATE",
            entity="Exam",
            entity_id=exam.id,
            details={"updated_fields": list(exam_in.model_dump(exclude_unset=True).keys())}
        )
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_endpoint(
    exam_id: int,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
) -> None:
    exam = await get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    await delete_exam(exam)
    await log_activity(
        user_id=current_user.id,
        user_email=current_user.email,
        action="DELETE",
        entity="Exam",
        entity_id=exam.id,
        details={"name": exam.name}
    )
    return None
