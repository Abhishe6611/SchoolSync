from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any

from app.core.dependencies import require_roles
from app.models.timetable import Timetable
from app.schemas.timetable import TimetableGenerateRequest, TimetableSaveRequest
from app.services.timetable_service import generate_timetable

router = APIRouter(prefix="/timetable", tags=["Timetable"])

@router.post("/generate")
async def generate_schedule(
    request: TimetableGenerateRequest,
    _=Depends(require_roles(["admin", "superadmin"])),
):
    try:
        allocations_dict = [alloc.model_dump() for alloc in request.allocations]
        settings_dict = request.settings.model_dump()
        
        grids = generate_timetable(
            class_ids=request.class_ids,
            allocations=allocations_dict,
            settings=settings_dict
        )
        return {"grids": grids}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/")
async def save_timetable(
    request: TimetableSaveRequest,
    _=Depends(require_roles(["admin", "superadmin"])),
):
    # Check if exists
    existing = await Timetable.find_one(Timetable.class_id == request.class_id)
    if existing:
        existing.grid = request.grid
        existing.settings = request.settings
        existing.name = request.name
        existing.year = request.year
        await existing.save()
        return existing
        
    tt = Timetable(**request.model_dump())
    await tt.insert()
    return tt

@router.get("/class/{class_id}")
async def get_timetable(
    class_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher", "student", "parent"])),
):
    tt = await Timetable.find_one(Timetable.class_id == class_id)
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found for this class")
    return tt


@router.get("/teacher/{staff_id}")
async def get_teacher_timetable(
    staff_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
):
    """Build a personal timetable for a teacher by scanning all saved class timetables."""
    from app.models.student import Student
    from app.models.class_model import ClassModel

    # Get teacher name
    staff_member = None
    try:
        from app.models.staff import Staff
        staff_member = await Staff.get(staff_id)
    except Exception:
        pass
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    teacher_name = f"{staff_member.first_name} {staff_member.last_name}"

    # Fetch ALL saved timetables
    all_timetables = await Timetable.find_all().to_list()
    if not all_timetables:
        raise HTTPException(status_code=404, detail="No timetables have been generated yet")

    # Build class_id -> class_name map
    all_classes = await ClassModel.find_all().to_list()
    class_name_map = {c.id: f"{c.name} {c.section}" for c in all_classes}

    # Use the settings from the first timetable (they should all share the same settings)
    settings = all_timetables[0].settings
    days = settings.get("days_per_week", 6)
    periods = settings.get("periods_per_day", 6)

    # Build the teacher's personal grid
    teacher_grid = [[None for _ in range(periods)] for _ in range(days)]

    for tt in all_timetables:
        class_label = class_name_map.get(tt.class_id, f"Class {tt.class_id}")
        for day_idx, day_row in enumerate(tt.grid):
            if day_idx >= days:
                break
            for period_idx, cell in enumerate(day_row):
                if period_idx >= periods:
                    break
                if cell and cell.get("teacher", "") == teacher_name:
                    teacher_grid[day_idx][period_idx] = {
                        "subject": cell.get("subject", ""),
                        "class_name": class_label,
                        "type": cell.get("type", "Class"),
                    }

    return {
        "teacher_name": teacher_name,
        "staff_id": staff_id,
        "settings": settings,
        "grid": teacher_grid,
    }
