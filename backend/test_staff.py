import asyncio
from app.database.session import init_db
from app.models.staff import Staff

async def main():
    await init_db()
    staff = await Staff.find_all().to_list()
    print('Staff count:', len(staff))

if __name__ == "__main__":
    asyncio.run(main())
