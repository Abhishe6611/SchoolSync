from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentBase(BaseModel):
    student_id: int
    fee_type: str = Field(..., min_length=1, max_length=50)
    amount: float = Field(..., gt=0)
    payment_date: date
    mode: str = Field(..., min_length=1, max_length=50)
    receipt_number: Optional[str] = None
    transaction_no: Optional[str] = None
    remarks: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    fee_type: Optional[str] = Field(None, min_length=1, max_length=50)
    amount: Optional[float] = Field(None, gt=0)
    payment_date: Optional[date] = None
    mode: Optional[str] = Field(None, min_length=1, max_length=50)
    receipt_number: Optional[str] = Field(None, min_length=1, max_length=50)
    transaction_no: Optional[str] = Field(None, min_length=1, max_length=100)
    remarks: Optional[str] = None


class PaymentRead(PaymentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeeOverviewItem(BaseModel):
    """One row per student in the fees overview."""
    student_id: int
    student_name: str
    class_id: int
    class_name: str
    total_fees: float
    total_paid: float
    balance: float
    base_fee: float = 0.0
    other_fee: float = 0.0
    transport_fee: float = 0.0
    status: str
    payment_count: int

class MockWebhookPayload(BaseModel):
    student_id: int
    amount: float
    mode: str = "UPI"
    status: str = "success" # success or failed
