import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('MONGODB_DB_NAME')]
    result = await db.exams.update_many({"max_marks": 250}, {"$set": {"max_marks": 50}})
    print(f"Updated {result.modified_count} exams from 250 to 50 max marks.")

asyncio.run(run())
