import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('MONGODB_DB_NAME')]
    doc = await db.school_settings.find_one()
    if doc:
        print(f"School Name: {doc.get('school_name')}")
        print(f"Address: {doc.get('address')}")
        print(f"Phone: {doc.get('phone')}")
        print(f"Email: {doc.get('email')}")
        print(f"Logo URL: {doc.get('logo_url')}")
        print(f"Registration No: {doc.get('registration_no')}")
        print(f"Principal: {doc.get('principal_name')}")
    else:
        print("No school_settings document found in DB.")

asyncio.run(run())
