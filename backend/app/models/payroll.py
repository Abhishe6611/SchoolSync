from datetime import date, datetime, timezone
from typing import Optional
from pydantic import Field
from app.models.base import BaseDocument

class SalaryStructure(BaseDocument):
    staff_id: int
    base_salary: float = 0.0
    transport_allowance: float = 0.0
    medical_allowance: float = 0.0
    other_allowances: float = 0.0
    standard_deductions: float = 0.0

    class Settings:
        name = "salary_structures"

class Payslip(BaseDocument):
    staff_id: int
    month: int
    year: int
    total_working_days: int = 0
    days_present: float = 0.0
    unpaid_leave_days: float = 0.0
    base_salary: float = 0.0
    total_allowances: float = 0.0
    leave_deduction: float = 0.0
    other_deductions: float = 0.0
    net_payable: float = 0.0
    status: str = "Pending" # Pending, Paid
    payment_date: Optional[date] = None

    class Settings:
        name = "payslips"
