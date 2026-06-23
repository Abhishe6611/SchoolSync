from datetime import date
from typing import Dict, List

from pydantic import BaseModel


class AttendanceSummary(BaseModel):
    class_id: int
    start_date: date
    end_date: date
    totals: Dict[str, int]
    records: List[Dict] = []


class FeeSummary(BaseModel):
    status: str
    count: int
    total_amount: float
    total_paid: float


class ReportResponse(BaseModel):
    attendance: AttendanceSummary | None = None
    fees: List[FeeSummary] = []

class FeeCollectionTrend(BaseModel):
    month: str
    amount: float

class DailyFeeCollectionTrend(BaseModel):
    date: str
    amount: float

class AdmissionsTrend(BaseModel):
    month: str
    count: int

class StaffDistribution(BaseModel):
    role: str
    count: int

class StudentDistribution(BaseModel):
    class_name: str
    count: int

class ComprehensiveDashboard(BaseModel):
    fee_collection_trend: List[FeeCollectionTrend]
    daily_fee_collection_trend: List[DailyFeeCollectionTrend]
    admissions_trend: List[AdmissionsTrend]
    staff_distribution: List[StaffDistribution]
    student_distribution: List[StudentDistribution]
