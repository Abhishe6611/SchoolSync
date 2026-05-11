import asyncio
from app.database.session import init_db
from app.models.class_model import ClassModel

async def check():
    await init_db()
    classes = await ClassModel.find_all().to_list()
    print(f"Total classes: {len(classes)}")
    if classes:
        print(f"First class ID type: {type(classes[0].id)}")
        print(f"First class ID: {classes[0].id}")

if __name__ == "__main__":
    asyncio.run(check())
