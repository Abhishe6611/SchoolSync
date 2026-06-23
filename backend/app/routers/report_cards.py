from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie.operators import In

from app.core.dependencies import require_roles
from app.models.student import Student
from app.models.class_model import ClassModel
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.school_settings import SchoolSettings
from app.schemas.report_card import ReportCardResponse, SubjectGrade, SchoolDetails, StudentDetails

router = APIRouter()

def get_grade_letter(percentage: float) -> str:
    if percentage >= 90: return "A+"
    if percentage >= 80: return "A"
    if percentage >= 70: return "B+"
    if percentage >= 60: return "B"
    if percentage >= 50: return "C"
    if percentage >= 40: return "D"
    return "F"

@router.get("/{student_id}/{exam_type}", response_model=ReportCardResponse)
async def generate_report_card(
    student_id: int, 
    exam_type: str,
    _=Depends(require_roles(["admin", "superadmin", "teacher"]))
):
    student = await Student.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_class = await ClassModel.get(student.class_id)
    if not student_class:
        raise HTTPException(status_code=404, detail="Class not found")

    # Fetch school settings (singleton)
    settings = await SchoolSettings.find_one()
    if not settings:
        settings = SchoolSettings() # fallback to defaults

    # Fetch all exams for this class and exam type
    exams = await Exam.find(
        Exam.class_id == student.class_id,
        Exam.exam_type == exam_type
    ).to_list()

    if not exams:
        raise HTTPException(status_code=404, detail=f"No exams found for {exam_type}")

    exam_ids = [e.id for e in exams]

    # Fetch all grades for this student and these exams
    grades = await Grade.find(
        Grade.student_id == student_id,
        In(Grade.exam_id, exam_ids)
    ).to_list()

    grade_map = {g.exam_id: g for g in grades}

    subject_grades = []
    total_obtained = 0.0
    total_max = 0.0

    for exam in exams:
        grade = grade_map.get(exam.id)
        if grade:
            obtained = grade.marks_obtained
            internal = getattr(grade, 'internal_marks', 0)
            external = getattr(grade, 'external_marks', 0)
        else:
            obtained = 0.0
            internal = 0.0
            external = 0.0

        max_m = exam.max_marks or 100.0
        perc = (obtained / max_m * 100) if max_m > 0 else 0
        
        subject_grades.append(SubjectGrade(
            subject_name=exam.name,
            internal_marks=internal,
            external_marks=external,
            marks_obtained=obtained,
            max_marks=max_m,
            grade=get_grade_letter(perc)
        ))
        
        total_obtained += obtained
        total_max += max_m

    overall_percentage = (total_obtained / total_max * 100) if total_max > 0 else 0

    return ReportCardResponse(
        school=SchoolDetails(
            school_name=settings.school_name,
            address=settings.address,
            phone=settings.phone,
            email=settings.email,
            logo_url=settings.logo_url
        ),
        student=StudentDetails(
            student_name=f"{student.first_name} {student.last_name}",
            admission_no=f"#{student.id}",
            dob=student.dob.strftime("%d-%b-%Y") if student.dob else "N/A",
            class_name=student_class.name,
            attendance_percentage="90%" # Placeholder for now, could be calculated from attendance collection
        ),
        exam_title=f"Term {exam_type} Examination",
        grades=subject_grades,
        total_obtained=total_obtained,
        total_max=total_max,
        overall_percentage=round(overall_percentage, 1),
        overall_grade=get_grade_letter(overall_percentage)
    )
