import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client[os.getenv("MONGODB_DB_NAME")]
    print(await db.list_collection_names())
    await db["Grade"].drop()
    print("Dropped 'Grade' collection just in case.")

asyncio.run(main())
