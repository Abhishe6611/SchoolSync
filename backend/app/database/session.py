import ssl
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings

async def init_db() -> None:
    # We will import models here later when they are ready
    from app.models.admin_user import AdminUser
    from app.models.student import Student
    from app.models.staff import Staff
    from app.models.class_model import ClassModel
    from app.models.subject import Subject
    from app.models.attendance import Attendance
    from app.models.fee import Fee
    from app.models.audit_log import AuditLog
    from app.models.payment import Payment
    from app.models.base import Counter
    from app.models.timetable import Timetable
    from app.models.transport import TransportRoute
    from app.models.staff_attendance import StaffAttendance
    from app.models.payroll import SalaryStructure, Payslip
    from app.models.inventory import InventoryItem, InventoryLog
    from app.models.school_settings import SchoolSettings
    from app.models.exam import Exam

    # Build explicit SSL context for Python 3.13 + Windows compatibility
    tls_ctx = ssl.create_default_context(cafile=certifi.where())
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    # Verify connection works before proceeding
    await client.admin.command("ping")
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            Counter,
            AdminUser,
            Student,
            Staff,
            ClassModel,
            Subject,
            Attendance,
            Fee,
            AuditLog,
            Payment,
            Timetable,
            TransportRoute,
            StaffAttendance,
            SalaryStructure,
            Payslip,
            InventoryItem,
            InventoryLog,
            SchoolSettings,
            Exam,
        ],
    )
