from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, ValidationError

from app.core.dependencies import require_roles
from app.schemas.attendance import AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.services.attendance_service import (
    delete_attendance,
    get_attendance,
    get_attendance_list,
    get_class_overview,
    mark_attendance,
    mark_all,
    mark_holiday,
    update_attendance,
)
from app.services.import_service import parse_import_file

router = APIRouter()


# ─── Pydantic bodies for new bulk endpoints ──────────────────────────
class MarkHolidayBody(BaseModel):
    class_id: int
    date: date

class MarkAllBody(BaseModel):
    class_id: int
    date: date
    status: str


@router.post("/", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
async def create_attendance_endpoint(
    attendance_in: AttendanceCreate,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> AttendanceRead:
    try:
        return await mark_attendance(attendance_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


from typing import Optional


# ─── NEW BULK ENDPOINTS ─────────────────────────────────────────────

@router.get("/overview")
async def attendance_overview(
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
):
    try:
        return await get_class_overview()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/mark-holiday")
async def attendance_mark_holiday(
    body: MarkHolidayBody,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
):
    try:
        count = await mark_holiday(body.class_id, body.date)
        return {"count": count, "message": f"Marked {count} students as holiday"}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/mark-all")
async def attendance_mark_all(
    body: MarkAllBody,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
):
    try:
        count = await mark_all(body.class_id, body.date, body.status)
        return {"count": count, "message": f"Marked {count} students as {body.status}"}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get("/", response_model=list[AttendanceRead])
async def list_attendance(
    class_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[AttendanceRead]:
    return await get_attendance_list(skip=skip, limit=limit, class_id=class_id)


@router.get("/{attendance_id}", response_model=AttendanceRead)
async def get_attendance_endpoint(
    attendance_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> AttendanceRead:
    attendance = await get_attendance(attendance_id)
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    return attendance


@router.put("/{attendance_id}", response_model=AttendanceRead)
async def update_attendance_endpoint(
    attendance_id: int,
    attendance_in: AttendanceUpdate,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> AttendanceRead:
    attendance = await get_attendance(attendance_id)
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    return await update_attendance(attendance, attendance_in)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance_endpoint(
    attendance_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> None:
    attendance = await get_attendance(attendance_id)
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    await delete_attendance(attendance)
    return None


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_attendance(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_attendance(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Attendance ID {row['id']} already exists)")
                    continue
            attendance_in = AttendanceCreate(**row)
            await mark_attendance(attendance_in)
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
