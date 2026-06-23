from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field

class Counter(Document):
    """Collection to store auto-increment sequences."""
    id: str = Field(alias="_id")  # Name of the collection
    seq: int = 0

    class Settings:
        name = "counters"

class BaseDocument(Document):
    """Base document class that handles auto-increment IDs and timestamps."""
    id: Optional[int] = Field(default=None, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    async def insert(self, *args, **kwargs):
        """Override insert to handle auto-increment ID and timestamps."""
        if self.id is None:
            # Get the next sequence number for this collection
            collection_name = self.get_settings().name
            
            # Use atomic operation to prevent race conditions during concurrent inserts
            from pymongo import ReturnDocument
            counter_doc = await Counter.get_motor_collection().find_one_and_update(
                {"_id": collection_name},
                {"$inc": {"seq": 1}},
                return_document=ReturnDocument.AFTER,
                upsert=True
            )
            self.id = counter_doc["seq"]
            
        self.updated_at = datetime.now(timezone.utc)
        return await super().insert(*args, **kwargs)

    async def save(self, *args, **kwargs):
        """Override save to update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)
        return await super().save(*args, **kwargs)

    class Settings:
        pass
