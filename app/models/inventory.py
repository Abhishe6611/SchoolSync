from datetime import datetime, timezone
from typing import Optional
from pydantic import Field
from app.models.base import BaseDocument

class InventoryItem(BaseDocument):
    item_name: str
    category: str  # Electronics, Furniture, Stationery, Lab Equipment
    sku_code: Optional[str] = ""
    is_consumable: bool = False  # If True, no need to return
    total_quantity: int = 0
    available_quantity: int = 0
    unit_price: float = 0.0
    location: Optional[str] = ""

    class Settings:
        name = "inventory_items"

class InventoryLog(BaseDocument):
    item_id: int
    action_type: str  # Restock, Issue, Return
    quantity: int
    issued_to_id: Optional[int] = None # staff_id or student_id
    issued_to_role: Optional[str] = None # Staff, Student
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    remarks: Optional[str] = ""

    class Settings:
        name = "inventory_logs"
