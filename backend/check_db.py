import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.payment import Payment
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Payment])
    
    daily_fee_pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$payment_date"}},
                "total_amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    results = await Payment.aggregate(daily_fee_pipeline).to_list()
    print("Daily aggregation:", results)
    
    monthly_pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$payment_date"}},
                "total_amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    results2 = await Payment.aggregate(monthly_pipeline).to_list()
    print("Monthly aggregation:", results2)
    
    # check one document
    doc = await Payment.find_one()
    if doc:
        print("Sample doc:", doc.dict())
        print("Type of payment_date in DB:", type(doc.payment_date))

if __name__ == "__main__":
    asyncio.run(main())
