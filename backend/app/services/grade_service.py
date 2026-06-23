from app.models.grade import Grade
from app.models.exam import Exam
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.grade import GradeCreate, GradeUpdate

async def create_grade(grade_in: GradeCreate) -> Grade:
    exam = await Exam.get(grade_in.exam_id)
    if not exam:
        raise ValueError("Exam not found")
        
    student = await Student.get(grade_in.student_id)
    if not student:
        raise ValueError("Student not found")
        
    subject = await Subject.get(grade_in.subject_id)
    if not subject:
        raise ValueError("Subject not found")

    # Check if a grade already exists for this student + exam + subject
    existing = await Grade.find_one(
        Grade.exam_id == grade_in.exam_id, 
        Grade.student_id == grade_in.student_id,
        Grade.subject_id == grade_in.subject_id
    )
    if existing:
        raise ValueError("Grade already exists for this student and subject in this exam")

    grade = Grade(**grade_in.model_dump())
    await grade.insert()
    return grade

async def get_grades(skip: int = 0, limit: int = 100) -> list[Grade]:
    return await Grade.find_all().skip(skip).limit(limit).to_list()

async def get_grade(grade_id: int) -> Grade | None:
    return await Grade.get(grade_id)

async def update_grade(grade: Grade, grade_in: GradeUpdate) -> Grade:
    for field, value in grade_in.model_dump(exclude_unset=True).items():
        setattr(grade, field, value)
    await grade.save()
    return grade

async def delete_grade(grade: Grade) -> None:
    await grade.delete()
