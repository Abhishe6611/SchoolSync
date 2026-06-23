from typing import List, Optional
from pydantic import BaseModel

class SubjectGrade(BaseModel):
    subject_name: str
    internal_marks: Optional[float]
    external_marks: Optional[float]
    marks_obtained: float
    max_marks: float
    grade: str

class SchoolDetails(BaseModel):
    school_name: str
    address: str
    phone: str
    email: str
    logo_url: Optional[str]

class StudentDetails(BaseModel):
    student_name: str
    admission_no: str
    dob: str
    class_name: str
    attendance_percentage: str

class ReportCardResponse(BaseModel):
    school: SchoolDetails
    student: StudentDetails
    exam_title: str
    grades: List[SubjectGrade]
    total_obtained: float
    total_max: float
    overall_percentage: float
    overall_grade: str
