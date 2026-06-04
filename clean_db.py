import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://000asshetti006_db_user:eKjAU7nbKHDpZlRW@cluster0.dl8wbjb.mongodb.net/")
    db = client["school_management"]
    result = await db.grades.delete_many({"exam_id": {"$exists": False}})
    print(f"Deleted {result.deleted_count} invalid grades.")

asyncio.run(main())
