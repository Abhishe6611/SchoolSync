import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('MONGODB_DB_NAME')]
    docs = await db.exams.find().to_list(100)
    for d in docs:
        print(f"Exam: {d.get('name')}, Class: {d.get('class_id')}, Max: {d.get('max_marks')}")

asyncio.run(run())
