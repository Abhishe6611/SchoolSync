import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_data():
    local_url = "mongodb://localhost:27017"
    cloud_url = "mongodb+srv://000asshetti006_db_user:eKjAU7nbKHDpZlRW@cluster0.dl8wbjb.mongodb.net/"
    db_name = "school_management"

    print("Connecting to local database...")
    local_client = AsyncIOMotorClient(local_url)
    local_db = local_client[db_name]

    print("Connecting to cloud database...")
    cloud_client = AsyncIOMotorClient(cloud_url)
    cloud_db = cloud_client[db_name]

    collections = await local_db.list_collection_names()
    
    if not collections:
        print("No collections found in local database!")
        return

    print(f"Found {len(collections)} collections to migrate: {collections}")

    for coll_name in collections:
        print(f"\nMigrating collection: {coll_name}...")
        local_coll = local_db[coll_name]
        cloud_coll = cloud_db[coll_name]

        # Get all documents
        cursor = local_coll.find({})
        docs = await cursor.to_list(length=None)

        if docs:
            # Clear existing cloud data to avoid duplicates/errors if run multiple times
            await cloud_coll.delete_many({})
            # Insert all documents into cloud
            await cloud_coll.insert_many(docs)
            print(f"  -> Successfully migrated {len(docs)} documents.")
        else:
            print("  -> Collection is empty, skipping.")

    print("\n✅ Migration complete! Your cloud database now has all your local data.")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_data())
