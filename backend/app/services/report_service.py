from datetime import date

from app.models.attendance import Attendance
from app.models.fee import Fee
from app.models.payment import Payment
from app.models.student import Student
from app.models.staff import Staff
from app.models.staff_attendance import StaffAttendance
from app.models.class_model import ClassModel
from app.schemas.reports import (
    AttendanceSummary, 
    FeeSummary, 
    ComprehensiveDashboard,
    FeeCollectionTrend,
    DailyFeeCollectionTrend,
    AdmissionsTrend,
    StaffDistribution,
    StudentDistribution
)

async def get_attendance_summary(
    class_id: int, start_date: date, end_date: date
) -> AttendanceSummary:
    # Convert dates to datetime objects for MongoDB comparison
    from datetime import datetime
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    # In beanie, since we store as date in pydantic, motor might store as datetime.
    # Beanie aggregation pipeline
    pipeline = [
        {
            "$match": {
                "class_id": class_id,
                "date": {"$gte": start_dt, "$lte": end_dt}
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    # Note: motor deals with ISODate directly
    # Since our models use `date` and motor saves them as ISODate at midnight
    pipeline_date = [
        {
            "$match": {
                "class_id": class_id,
                # Try simple comparison first - Beanie will try to serialize appropriately
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    # Actually, let's use Beanie's query builder first to ensure safety
    # Find all matching docs and process in python (better for small datasets)
    # or use aggregation. Let's use aggregation.
    
    # Simple query since datasets are small for MVP
    docs = await Attendance.find(
        Attendance.class_id == class_id,
        Attendance.date >= start_date,
        Attendance.date <= end_date
    ).to_list()
    
    student_list = await Student.find(Student.class_id == class_id).to_list()
    student_map = {s.id: f"{s.first_name} {s.last_name}" for s in student_list}
    
    totals = {}
    records = []
    for doc in docs:
        totals[doc.status] = totals.get(doc.status, 0) + 1
        records.append({
            "student_name": student_map.get(doc.student_id, f"Student ID: {doc.student_id}"),
            "date": str(doc.date),
            "status": doc.status,
            "remarks": doc.remarks or ""
        })
        
    return AttendanceSummary(
        class_id=class_id, start_date=start_date, end_date=end_date, totals=totals, records=records
    )

async def get_fee_summary() -> list[FeeSummary]:
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$amount"},
                "total_paid": {"$sum": "$paid_amount"},
            }
        }
    ]
    
    results = await Fee.aggregate(pipeline).to_list()
    
    return [
        FeeSummary(
            status=row["_id"],
            count=row["count"],
            total_amount=float(row.get("total_amount", 0)),
            total_paid=float(row.get("total_paid", 0)),
        )
        for row in results
    ]

async def get_staff_attendance_summary(start_date: date, end_date: date) -> dict:
    from datetime import datetime
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    docs = await StaffAttendance.find(
        StaffAttendance.date >= start_date,
        StaffAttendance.date <= end_date
    ).to_list()
    
    staff_list = await Staff.find_all().to_list()
    staff_map = {s.id: f"{s.first_name} {s.last_name}" for s in staff_list}
    
    totals = {}
    records = []
    
    for doc in docs:
        totals[doc.status] = totals.get(doc.status, 0) + 1
        records.append({
            "staff_name": staff_map.get(doc.staff_id, f"Staff ID: {doc.staff_id}"),
            "date": str(doc.date),
            "status": doc.status,
            "remarks": doc.remarks or ""
        })
        
    return {
        "start_date": start_date,
        "end_date": end_date,
        "totals": totals,
        "records": records
    }

async def get_comprehensive_dashboard() -> ComprehensiveDashboard:
    # 1. Fee Collection Trend
    fee_pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$payment_date"}},
                "total_amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    fee_results = await Payment.aggregate(fee_pipeline).to_list()
    fee_trend = [
        FeeCollectionTrend(month=row["_id"], amount=row["total_amount"])
        for row in fee_results if row["_id"]
    ]

    # 1b. Daily Fee Collection Trend
    daily_fee_pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$payment_date"}},
                "total_amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    daily_fee_results = await Payment.aggregate(daily_fee_pipeline).to_list()
    daily_fee_trend = [
        DailyFeeCollectionTrend(date=row["_id"], amount=row["total_amount"])
        for row in daily_fee_results if row["_id"]
    ]

    # 2. Admissions Trend
    admission_pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$admission_date"}},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    admission_results = await Student.aggregate(admission_pipeline).to_list()
    adm_trend = [
        AdmissionsTrend(month=row["_id"], count=row["count"])
        for row in admission_results if row["_id"]
    ]

    # 3. Staff Distribution
    staff_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    staff_results = await Staff.aggregate(staff_pipeline).to_list()
    staff_dist = [
        StaffDistribution(role=row["_id"] or "Unknown", count=row["count"])
        for row in staff_results
    ]

    # 4. Student Distribution (Need class names, but we can aggregate by class_id and join)
    student_pipeline = [
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]
    student_results = await Student.aggregate(student_pipeline).to_list()
    
    classes = await ClassModel.find_all().to_list()
    class_map = {c.id: f"{c.name} {c.section}" for c in classes}
    
    student_dist = [
        StudentDistribution(class_name=class_map.get(row["_id"], f"Class {row['_id']}"), count=row["count"])
        for row in student_results
    ]

    return ComprehensiveDashboard(
        fee_collection_trend=fee_trend,
        daily_fee_collection_trend=daily_fee_trend,
        admissions_trend=adm_trend,
        staff_distribution=staff_dist,
        student_distribution=student_dist
    )
