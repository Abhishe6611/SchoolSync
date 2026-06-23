from datetime import date
from app.models.class_model import ClassModel
from app.models.fee import Fee
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate

async def create_student(student_in: StudentCreate) -> Student:
    class_model = await ClassModel.get(student_in.class_id)
    if not class_model:
        raise ValueError("Class not found")

    student = Student(**student_in.model_dump())
    await student.insert()
    
    # Auto-create Fee record
    today = date.today()
    academic_year_end = date(today.year + 1, 3, 31) if today.month >= 4 else date(today.year, 3, 31)
        
    fee = Fee(
        student_id=student.id,
        amount=student.total_fee,
        paid_amount=0,
        due_date=academic_year_end,
        status="pending" if student.total_fee > 0 else "paid"
    )
    await fee.insert()

    return student

async def get_students(skip: int = 0, limit: int = 100, class_id: int = None) -> list[Student]:
    query = Student.find(Student.is_active == True)
    if class_id is not None:
        query = Student.find(Student.is_active == True, Student.class_id == class_id)
    return await query.skip(skip).limit(limit).to_list()

async def get_passed_out_students(skip: int = 0, limit: int = 10000) -> list[Student]:
    return await Student.find(Student.is_active == False).skip(skip).limit(limit).to_list()

async def get_student(student_id: int) -> Student | None:
    return await Student.get(student_id)

async def update_student(student: Student, student_in: StudentUpdate) -> Student:
    for field, value in student_in.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await student.save()
    return student

async def delete_student(student: Student) -> None:
    import os
    if student.photo_url:
        # photo_url is typically like /uploads/students/filename.ext
        # We need to compute the absolute path
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        # remove leading slash if present to avoid path joining issues
        rel_path = student.photo_url.lstrip('/')
        filepath = os.path.join(base_dir, rel_path)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
    await student.delete()
