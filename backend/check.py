import asyncio
from app.database.session import init_db
from app.models.payment import Payment

async def main():
    await init_db()
    payments = await Payment.find_all().to_list()
    print("Payments:", [p.model_dump() for p in payments])

if __name__ == "__main__":
    asyncio.run(main())
