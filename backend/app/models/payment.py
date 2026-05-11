from datetime import date
from typing import Optional

from app.models.base import BaseDocument


class Payment(BaseDocument):
    student_id: int
    fee_type: str         # Tuition, Lab, Library, Sports, Transport
    amount: float
    payment_date: date
    mode: str             # Cash, UPI, Net Banking, Cheque, Card
    receipt_number: str
    transaction_no: Optional[str] = None
    remarks: Optional[str] = None

    class Settings:
        name = "payments"
