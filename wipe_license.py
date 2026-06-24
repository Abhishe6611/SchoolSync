import asyncio, sys; sys.path.append('backend'); from app.models.school_settings import SchoolSettings; from motor.motor_asyncio import AsyncIOMotorClient; from beanie import init_beanie;
async def main():
    import certifi
    client = AsyncIOMotorClient('mongodb+srv://000asshetti006_db_user:eKjAU7nbKHDpZlRW@cluster0.dl8wbjb.mongodb.net/', tlsCAFile=certifi.where())
    await init_beanie(database=client.school_management, document_models=[SchoolSettings])
    s = await SchoolSettings.find_one()
    s.license_key = None
    await s.save()
    print('License wiped!')
asyncio.run(main())
