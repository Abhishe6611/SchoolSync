import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client[os.getenv("MONGODB_DB_NAME")]
    await db.grades.drop()
    print("Dropped grades collection.")

asyncio.run(main())
