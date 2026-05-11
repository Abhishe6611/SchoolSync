from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate
from app.services.staff_service import (
    create_staff,
    delete_staff,
    get_staff,
    get_staff_list,
    update_staff,
)
from app.services.import_service import parse_import_file

router = APIRouter()


@router.post("/", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
async def create_staff_endpoint(
    staff_in: StaffCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> StaffRead:
    return await create_staff(staff_in)


@router.get("/", response_model=list[StaffRead])
async def list_staff(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[StaffRead]:
    return await get_staff_list(skip=skip, limit=limit)


@router.get("/{staff_id}", response_model=StaffRead)
async def get_staff_endpoint(
    staff_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> StaffRead:
    staff = await get_staff(staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
    return staff


@router.put("/{staff_id}", response_model=StaffRead)
async def update_staff_endpoint(
    staff_id: int,
    staff_in: StaffUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> StaffRead:
    staff = await get_staff(staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
    return await update_staff(staff, staff_in)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff_endpoint(
    staff_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    staff = await get_staff(staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
    await delete_staff(staff)
    return None


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_staff(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_staff(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Staff ID {row['id']} already exists)")
                    continue
            staff_in = StaffCreate(**row)
            await create_staff(staff_in)
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


@router.post("/{staff_id}/photo")
async def upload_staff_photo(
    staff_id: int,
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    import os, uuid
    member = await get_staff(staff_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{staff_id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "staff")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    member.photo_url = f"/uploads/staff/{filename}"
    await member.save()
    return {"photo_url": member.photo_url}
