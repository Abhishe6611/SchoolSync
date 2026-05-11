import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.class_model import ClassModel

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    await init_beanie(database=client['school_db'], document_models=[ClassModel])
    c = await ClassModel.get(1)
    print("Class ID 1:", c)

asyncio.run(main())
