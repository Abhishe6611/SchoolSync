from typing import Optional
from app.models.base import BaseDocument

class SchoolSettings(BaseDocument):
    """Singleton document — only one record should ever exist."""
    school_name: str = "SchoolSync Academy"
    address: str = "123 Education Boulevard, New Delhi – 110001"
    phone: str = "+91-11-2345-6789"
    email: str = "info@schoolsync.edu.in"
    registration_no: str = "CBSE/AFF/2410123"
    principal_name: str = "Dr. Priya Mehta"
    admission_head: str = "Mr. Anil Kumar"
    hr_head: str = "Mrs. Sunita Rao"
    logo_url: Optional[str] = None
    admin_pin: str = "123456"  # Default PIN, changeable from UI

    class Settings:
        name = "school_settings"
