from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from app.models.inventory import InventoryItem, InventoryLog

router = APIRouter()

@router.get("", response_model=List[InventoryItem])
async def get_inventory_items():
    return await InventoryItem.find_all().to_list()

@router.post("", response_model=InventoryItem)
async def create_inventory_item(item: InventoryItem):
    item.available_quantity = item.total_quantity
    await item.insert()
    
    # Create initial restock log
    if item.total_quantity > 0:
        log = InventoryLog(
            item_id=item.id,
            action_type="Restock",
            quantity=item.total_quantity,
            remarks="Initial stock"
        )
        await log.insert()
        
    return item

@router.put("/{id}", response_model=InventoryItem)
async def update_inventory_item(id: int, item_update: InventoryItem):
    existing = await InventoryItem.find_one(InventoryItem.id == id)
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
        
    existing.item_name = item_update.item_name
    existing.category = item_update.category
    existing.sku_code = item_update.sku_code
    existing.is_consumable = item_update.is_consumable
    existing.unit_price = item_update.unit_price
    existing.location = item_update.location
    await existing.save()
    return existing

@router.post("/{id}/transaction")
async def inventory_transaction(id: int, log_entry: InventoryLog):
    item = await InventoryItem.find_one(InventoryItem.id == id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if log_entry.action_type == "Issue":
        if item.available_quantity < log_entry.quantity:
            raise HTTPException(status_code=400, detail="Insufficient quantity available")
        item.available_quantity -= log_entry.quantity
        if item.is_consumable:
            item.total_quantity -= log_entry.quantity
            
    elif log_entry.action_type == "Return":
        if item.is_consumable:
            raise HTTPException(status_code=400, detail="Consumable items cannot be returned")
        item.available_quantity += log_entry.quantity
        if item.available_quantity > item.total_quantity:
            item.available_quantity = item.total_quantity
            
    elif log_entry.action_type == "Restock":
        item.total_quantity += log_entry.quantity
        item.available_quantity += log_entry.quantity
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action type")
        
    await item.save()
    
    log_entry.item_id = id
    log_entry.date = datetime.now(timezone.utc)
    await log_entry.insert()
    
    return {"message": "Transaction successful", "item": item}

@router.get("/{id}/logs", response_model=List[InventoryLog])
async def get_item_logs(id: int):
    return await InventoryLog.find(InventoryLog.item_id == id).sort("-date").to_list()

@router.get("/logs/all", response_model=List[InventoryLog])
async def get_all_logs():
    return await InventoryLog.find_all().sort("-date").to_list()
