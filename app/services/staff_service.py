from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate

async def create_staff(staff_in: StaffCreate) -> Staff:
    staff = Staff(**staff_in.model_dump())
    await staff.insert()
    return staff

async def get_staff_list(skip: int = 0, limit: int = 100) -> list[Staff]:
    return await Staff.find_all().skip(skip).limit(limit).to_list()

async def get_staff(staff_id: int) -> Staff | None:
    return await Staff.get(staff_id)

async def update_staff(staff: Staff, staff_in: StaffUpdate) -> Staff:
    for field, value in staff_in.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    await staff.save()
    return staff

async def delete_staff(staff: Staff) -> None:
    await staff.delete()
