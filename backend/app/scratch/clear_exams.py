import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.exam import Exam
from app.models.base import Counter
from app.core.config import settings

async def clear_exams():
    import ssl
    import certifi
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Exam, Counter])
    
    print("Clearing 'exams' collection...")
    await Exam.get_motor_collection().drop()
    
    print("Resetting exam counter...")
    await Counter.find_one({"_id": "exams"}).delete()
    
    print("Done! You can now add exams from the UI.")

if __name__ == "__main__":
    asyncio.run(clear_exams())
