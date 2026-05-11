from app.models.fee import Fee
from app.models.student import Student
from app.schemas.fee import FeeCreate, FeeUpdate

def _calculate_status(amount: float, paid_amount: float) -> str:
    if paid_amount >= amount:
        return "paid"
    if paid_amount > 0:
        return "partial"
    return "due"

async def create_fee(fee_in: FeeCreate) -> Fee:
    student = await Student.get(fee_in.student_id)
    if not student:
        raise ValueError("Student not found")

    status = _calculate_status(fee_in.amount, fee_in.paid_amount)
    fee = Fee(**fee_in.model_dump(), status=status)
    await fee.insert()
    return fee

async def get_fees(skip: int = 0, limit: int = 100) -> list[Fee]:
    return await Fee.find_all().skip(skip).limit(limit).to_list()

async def get_fee(fee_id: int) -> Fee | None:
    return await Fee.get(fee_id)

async def update_fee(fee: Fee, fee_in: FeeUpdate) -> Fee:
    data = fee_in.model_dump(exclude_unset=True)
    if "amount" in data or "paid_amount" in data:
        amount = float(data.get("amount", fee.amount))
        paid_amount = float(data.get("paid_amount", fee.paid_amount))
        data["status"] = _calculate_status(amount, paid_amount)
    for field, value in data.items():
        setattr(fee, field, value)
    await fee.save()
    return fee

async def delete_fee(fee: Fee) -> None:
    await fee.delete()
