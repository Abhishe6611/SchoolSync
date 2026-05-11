from app.models.fee import Fee
from app.models.payment import Payment
from app.models.student import Student
from app.models.class_model import ClassModel
from app.schemas.payment import PaymentCreate, PaymentUpdate, FeeOverviewItem


async def get_fee_overview() -> list[FeeOverviewItem]:
    """Build one row per student with aggregated fee/payment data."""
    students = await Student.find_all().to_list()
    fees = await Fee.find_all().to_list()
    payments = await Payment.find_all().to_list()
    classes = await ClassModel.find_all().to_list()

    class_map = {c.id: f"{c.name} {c.section}" for c in classes}

    # Build payment totals per student
    payment_totals = {}
    payment_counts = {}
    for p in payments:
        payment_totals[p.student_id] = payment_totals.get(p.student_id, 0) + p.amount
        payment_counts[p.student_id] = payment_counts.get(p.student_id, 0) + 1

    # Build fee totals per student
    fee_totals = {}
    for f in fees:
        fee_totals[f.student_id] = fee_totals.get(f.student_id, 0) + f.amount

    results = []
    for s in students:
        total_fees = fee_totals.get(s.id, 0)
        total_paid = payment_totals.get(s.id, 0)
        balance = total_fees - total_paid

        if balance <= 0 and total_fees > 0:
            status = "paid"
        elif total_paid > 0:
            status = "partial"
        elif total_fees > 0:
            status = "pending"
        else:
            status = "no fees"

        results.append(FeeOverviewItem(
            student_id=s.id,
            student_name=f"{s.first_name} {s.last_name}",
            class_id=s.class_id,
            class_name=class_map.get(s.class_id, str(s.class_id)),
            total_fees=total_fees,
            total_paid=total_paid,
            balance=max(0, balance),
            base_fee=s.base_fee,
            other_fee=s.other_fee,
            transport_fee=s.transport_fee,
            status=status,
            payment_count=payment_counts.get(s.id, 0),
        ))

    return results

from datetime import datetime
from app.models.base import Counter

def _generate_receipt_prefix() -> str:
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Financial/Academic year typically starts in April in India
    if month >= 4:
        ay_start = str(year)[-2:]
        ay_end = str(year + 1)[-2:]
    else:
        ay_start = str(year - 1)[-2:]
        ay_end = str(year)[-2:]
        
    return f"{ay_start}/{ay_end}-{month:02d}"

async def get_next_receipt_number() -> str:
    prefix = _generate_receipt_prefix()
    counter_id = f"receipt_{prefix}"
    counter = await Counter.get(counter_id)
    seq = counter.seq + 1 if counter else 1
    return f"{prefix}{seq:04d}"

async def _generate_and_increment_receipt_number() -> str:
    prefix = _generate_receipt_prefix()
    counter_id = f"receipt_{prefix}"
    
    counter = await Counter.get(counter_id)
    if not counter:
        counter = Counter(id=counter_id, seq=1)
        await counter.insert()
    else:
        counter.seq += 1
        await counter.save()
        
    return f"{prefix}{counter.seq:04d}"

async def get_payments_by_student(student_id: int) -> list[Payment]:
    return await Payment.find(Payment.student_id == student_id).sort("-payment_date").to_list()

async def create_payment(payment_in: PaymentCreate) -> Payment:
    student = await Student.get(payment_in.student_id)
    if not student:
        raise ValueError("Student not found")

    payment_data = payment_in.model_dump()
    
    # Auto-generate receipt number
    payment_data["receipt_number"] = await _generate_and_increment_receipt_number()
    
    # Handle transaction number for Cash/Cheque
    if payment_data.get("mode") in ["Cash", "Cheque"]:
        payment_data["transaction_no"] = None
        
    payment = Payment(**payment_data)
    await payment.insert()

    # Auto-update the parent Fee record's paid_amount and status
    await _recalculate_fee(payment_in.student_id)

    return payment


async def get_payment(payment_id: int) -> Payment | None:
    return await Payment.get(payment_id)


async def update_payment(payment: Payment, payment_in: PaymentUpdate) -> Payment:
    for field, value in payment_in.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)
    await payment.save()

    # Recalculate fee after update
    await _recalculate_fee(payment.student_id)

    return payment


async def delete_payment(payment: Payment) -> None:
    student_id = payment.student_id
    await payment.delete()

    # Recalculate fee after deletion
    await _recalculate_fee(student_id)


async def _recalculate_fee(student_id: int) -> None:
    """Recalculate the Fee record's paid_amount and status based on all payments."""
    fee = await Fee.find_one(Fee.student_id == student_id)
    if not fee:
        return

    payments = await Payment.find(Payment.student_id == student_id).to_list()
    total_paid = sum(p.amount for p in payments)

    fee.paid_amount = total_paid
    if total_paid >= fee.amount:
        fee.status = "paid"
    elif total_paid > 0:
        fee.status = "partial"
    else:
        fee.status = "pending"

    await fee.save()
