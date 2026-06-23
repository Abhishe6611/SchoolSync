from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from app.services.subject_service import (
    create_subject,
    delete_subject,
    get_subject,
    get_subjects,
    update_subject,
)
from app.services.import_service import parse_import_file

router = APIRouter()


@router.post("/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject_endpoint(
    subject_in: SubjectCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> SubjectRead:
    try:
        return await create_subject(subject_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/", response_model=list[SubjectRead])
async def list_subjects(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[SubjectRead]:
    return await get_subjects(skip=skip, limit=limit)


@router.get("/{subject_id}", response_model=SubjectRead)
async def get_subject_endpoint(
    subject_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> SubjectRead:
    subject = await get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.put("/{subject_id}", response_model=SubjectRead)
async def update_subject_endpoint(
    subject_id: int,
    subject_in: SubjectUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> SubjectRead:
    subject = await get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return await update_subject(subject, subject_in)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject_endpoint(
    subject_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    subject = await get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    await delete_subject(subject)
    return None


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_subjects(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_subject(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Subject ID {row['id']} already exists)")
                    continue
            subject_in = SubjectCreate(**row)
            await create_subject(subject_in)
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
