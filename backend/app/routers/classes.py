from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.class_model import ClassCreate, ClassRead, ClassUpdate
from app.services.class_service import (
    create_class,
    delete_class,
    get_class,
    get_classes,
    update_class,
)
from app.services.import_service import parse_import_file

router = APIRouter()


@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
async def create_class_endpoint(
    class_in: ClassCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> ClassRead:
    return await create_class(class_in)


@router.get("/", response_model=list[ClassRead])
async def list_classes(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[ClassRead]:
    return await get_classes(skip=skip, limit=limit)


@router.get("/{class_id}", response_model=ClassRead)
async def get_class_endpoint(
    class_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> ClassRead:
    class_model = await get_class(class_id)
    if not class_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return class_model


@router.put("/{class_id}", response_model=ClassRead)
async def update_class_endpoint(
    class_id: int,
    class_in: ClassUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> ClassRead:
    class_model = await get_class(class_id)
    if not class_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return await update_class(class_model, class_in)


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class_endpoint(
    class_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    class_model = await get_class(class_id)
    if not class_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    await delete_class(class_model)
    return None


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_classes(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []
    
    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_class(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Class ID {row['id']} already exists)")
                    continue
            class_in = ClassCreate(**row)
            await create_class(class_in)
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
