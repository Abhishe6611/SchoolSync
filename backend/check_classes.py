import asyncio
import motor.motor_asyncio

async def run():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['school_db']
    c = await db.classes.find_one({})
    print(c)

asyncio.run(run())
