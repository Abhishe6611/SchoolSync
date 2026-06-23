from app.schemas.admin_user import AdminUserCreate, AdminUserRead, AdminUserUpdate, Token
from app.schemas.attendance import AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.schemas.class_model import ClassCreate, ClassRead, ClassUpdate
from app.schemas.fee import FeeCreate, FeeRead, FeeUpdate
from app.schemas.reports import AttendanceSummary, FeeSummary, ReportResponse
from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate
from app.schemas.student import StudentCreate, StudentRead, StudentUpdate
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate

__all__ = [
    "AdminUserCreate",
    "AdminUserRead",
    "AdminUserUpdate",
    "Token",
    "AttendanceCreate",
    "AttendanceRead",
    "AttendanceUpdate",
    "ClassCreate",
    "ClassRead",
    "ClassUpdate",
    "FeeCreate",
    "FeeRead",
    "FeeUpdate",
    "AttendanceSummary",
    "FeeSummary",
    "ReportResponse",
    "StaffCreate",
    "StaffRead",
    "StaffUpdate",
    "StudentCreate",
    "StudentRead",
    "StudentUpdate",
    "SubjectCreate",
    "SubjectRead",
    "SubjectUpdate",
]
