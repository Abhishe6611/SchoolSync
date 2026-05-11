from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

class TransportRouteBase(BaseModel):
    route_number: str = Field(..., min_length=1, max_length=50)
    vehicle_number: str = Field(..., min_length=1, max_length=50)
    driver_name: str = Field(..., min_length=1, max_length=100)
    driver_contact: str = Field(..., min_length=1, max_length=30)
    monthly_fee: float = Field(..., ge=0)
    stops: list[str] = Field(...)

class TransportRouteCreate(TransportRouteBase):
    pass

class TransportRouteUpdate(BaseModel):
    route_number: Optional[str] = Field(None, min_length=1, max_length=50)
    vehicle_number: Optional[str] = Field(None, min_length=1, max_length=50)
    driver_name: Optional[str] = Field(None, min_length=1, max_length=100)
    driver_contact: Optional[str] = Field(None, min_length=1, max_length=30)
    monthly_fee: Optional[float] = Field(None, ge=0)
    stops: Optional[list[str]] = None
    is_active: Optional[bool] = None

class TransportRouteRead(TransportRouteBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
