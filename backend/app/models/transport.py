from typing import Optional
from app.models.base import BaseDocument

class TransportRoute(BaseDocument):
    route_number: str
    vehicle_number: str
    driver_name: str
    driver_contact: str
    monthly_fee: float
    stops: list[str]
    is_active: bool = True

    class Settings:
        name = "transport_routes"
