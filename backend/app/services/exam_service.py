from app.models.exam import Exam
from app.models.class_model import ClassModel
from app.schemas.exam import ExamCreate, ExamUpdate

async def create_exam(exam_in: ExamCreate) -> Exam:
    class_model = await ClassModel.get(exam_in.class_id)
    if not class_model:
        raise ValueError("Class not found")

    exam = Exam(**exam_in.model_dump())
    await exam.insert()
    return exam

async def get_exams(skip: int = 0, limit: int = 100) -> list[Exam]:
    return await Exam.find_all().skip(skip).limit(limit).to_list()

async def get_exam(exam_id: int) -> Exam | None:
    return await Exam.get(exam_id)

async def update_exam(exam: Exam, exam_in: ExamUpdate) -> Exam:
    if exam_in.class_id is not None:
        class_model = await ClassModel.get(exam_in.class_id)
        if not class_model:
            raise ValueError("Class not found")
            
    for field, value in exam_in.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    await exam.save()
    return exam

async def delete_exam(exam: Exam) -> None:
    await exam.delete()
