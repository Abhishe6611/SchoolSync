from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.fee import FeeCreate, FeeRead, FeeUpdate
from app.schemas.payment import PaymentCreate, PaymentRead, PaymentUpdate, FeeOverviewItem, MockWebhookPayload
from app.services.fee_service import create_fee, delete_fee, get_fee, get_fees, update_fee
from app.services.payment_service import (
    get_fee_overview,
    get_payments_by_student,
    create_payment,
    get_payment,
    update_payment,
    delete_payment,
    get_next_receipt_number,
)
from app.services.import_service import parse_import_file

router = APIRouter()


# ── Fee Overview (MUST be before any /{param} routes) ────

@router.get("/overview", response_model=list[FeeOverviewItem])
async def fee_overview(
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[FeeOverviewItem]:
    return await get_fee_overview()


# ── Fee List & Create ────────────────────────────────────

@router.get("/", response_model=list[FeeRead])
async def list_fees(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[FeeRead]:
    return await get_fees(skip=skip, limit=limit)


@router.post("/", response_model=FeeRead, status_code=status.HTTP_201_CREATED)
async def create_fee_endpoint(
    fee_in: FeeCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> FeeRead:
    try:
        return await create_fee(fee_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# ── Payment CRUD (uses /payments/ prefix to avoid conflicts) ─

@router.post("/mock-webhook")
async def mock_payment_webhook(payload: MockWebhookPayload):
    from datetime import datetime
    import random
    
    # 1. Enforce strict status checking
    if payload.status != "success":
        # Simulate logging the failed attempt
        print(f"[AUDIT LOG] Failed payment attempt for student {payload.student_id}. Reason: Insufficient Funds/User Cancelled.")
        return {"status": "ignored", "message": "Payment was not successful. No receipt generated."}
        
    # 2. Simulate successful payment processing
    fake_txn_id = f"UPI{random.randint(100000000000, 999999999999)}"
    
    payment_in = PaymentCreate(
        student_id=payload.student_id,
        fee_type="Tuition", # Defaulting for demo
        amount=payload.amount,
        payment_date=datetime.now().date(),
        mode=payload.mode,
        receipt_number=None, # Will auto-generate
        transaction_no=fake_txn_id,
        remarks="Paid via Parent Portal (Mock Razorpay)"
    )
    
    try:
        await create_payment(payment_in)
        return {"status": "success", "message": "Payment recorded and receipt generated", "transaction_id": fake_txn_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/portal/{student_id}", response_model=dict)
async def get_parent_portal_details(student_id: int):
    # Public endpoint to fetch student name and outstanding balance
    from app.models.student import Student
    from app.models.fee import Fee
    from app.models.class_model import ClassModel
    
    student = await Student.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    fee = await Fee.find_one(Fee.student_id == student_id)
    class_info = await ClassModel.get(student.class_id)
    
    balance = (fee.amount - fee.paid_amount) if fee else 0
    
    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "class_name": f"{class_info.name} {class_info.section}" if class_info else "",
        "balance": balance
    }

@router.get("/payments/next-receipt", response_model=dict)
async def next_receipt_number(
    _=Depends(require_roles(["admin", "superadmin"])),
):
    return {"receipt_number": await get_next_receipt_number()}

@router.get("/payments/by-student/{student_id}", response_model=list[PaymentRead])
async def list_payments(
    student_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[PaymentRead]:
    return await get_payments_by_student(student_id)


@router.post("/payments/by-student/{student_id}", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def create_payment_endpoint(
    student_id: int,
    payment_in: PaymentCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> PaymentRead:
    if payment_in.student_id != student_id:
        raise HTTPException(status_code=400, detail="student_id in path and body must match")
    try:
        return await create_payment(payment_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put("/payments/{payment_id}", response_model=PaymentRead)
async def update_payment_endpoint(
    payment_id: int,
    payment_in: PaymentUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> PaymentRead:
    payment = await get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return await update_payment(payment, payment_in)


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_endpoint(
    payment_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    payment = await get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    await delete_payment(payment)
    return None


# ── Fee by ID (MUST be last — /{fee_id} is a catch-all) ─

@router.get("/{fee_id}", response_model=FeeRead)
async def get_fee_endpoint(
    fee_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> FeeRead:
    fee = await get_fee(fee_id)
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    return fee


@router.put("/{fee_id}", response_model=FeeRead)
async def update_fee_endpoint(
    fee_id: int,
    fee_in: FeeUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> FeeRead:
    fee = await get_fee(fee_id)
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    return await update_fee(fee, fee_in)


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_endpoint(
    fee_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    fee = await get_fee(fee_id)
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee not found")
    await delete_fee(fee)
    return None


# ── Import ───────────────────────────────────────────────

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_fees(
    file: UploadFile = File(...),
    _=Depends(require_roles(["admin", "superadmin"])),
):
    rows = await parse_import_file(file)
    count = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            if "id" in row and row["id"]:
                existing = await get_fee(int(row["id"]))
                if existing:
                    errors.append(f"Row {i+2}: Skipped (Fee ID {row['id']} already exists)")
                    continue
            fee_in = FeeCreate(**row)
            await create_fee(fee_in)
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
