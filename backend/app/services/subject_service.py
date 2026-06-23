from app.models.class_model import ClassModel
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate

async def create_subject(subject_in: SubjectCreate) -> Subject:
    class_model = await ClassModel.get(subject_in.class_id)
    if not class_model:
        raise ValueError("Class not found")

    subject = Subject(**subject_in.model_dump())
    await subject.insert()
    return subject

async def get_subjects(skip: int = 0, limit: int = 100) -> list[Subject]:
    return await Subject.find_all().skip(skip).limit(limit).to_list()

async def get_subject(subject_id: int) -> Subject | None:
    return await Subject.get(subject_id)

async def update_subject(subject: Subject, subject_in: SubjectUpdate) -> Subject:
    for field, value in subject_in.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    await subject.save()
    return subject

async def delete_subject(subject: Subject) -> None:
    await subject.delete()
