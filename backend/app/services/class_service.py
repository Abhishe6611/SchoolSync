import re
from app.models.class_model import ClassModel
from app.schemas.class_model import ClassCreate, ClassUpdate

async def create_class(class_in: ClassCreate) -> ClassModel:
    class_model = ClassModel(**class_in.model_dump())
    await class_model.insert()
    return class_model

def sort_class_key(c: ClassModel):
    match = re.search(r'\d+', c.name)
    num = int(match.group()) if match else 0
    return (num, c.name, c.section)

async def get_classes(skip: int = 0, limit: int = 100) -> list[ClassModel]:
    classes = await ClassModel.find_all().to_list()
    classes.sort(key=sort_class_key)
    return classes[skip:skip+limit]

async def get_class(class_id: int) -> ClassModel | None:
    return await ClassModel.get(class_id)

async def update_class(class_model: ClassModel, class_in: ClassUpdate) -> ClassModel:
    for field, value in class_in.model_dump(exclude_unset=True).items():
        setattr(class_model, field, value)
    await class_model.save()
    return class_model

async def delete_class(class_model: ClassModel) -> None:
    await class_model.delete()
