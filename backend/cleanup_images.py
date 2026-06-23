import asyncio
import os
import sys

# Setup paths to import from backend
sys.path.append(os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.student import Student
from app.models.staff import Staff

async def cleanup_orphaned_images():
    print("Starting Image Cleanup Utility...")
    
    # 1. Connect to DB
    import certifi
    client = AsyncIOMotorClient("mongodb+srv://000asshetti006_db_user:eKjAU7nbKHDpZlRW@cluster0.dl8wbjb.mongodb.net/", tlsCAFile=certifi.where())
    await init_beanie(database=client.school_management, document_models=[Student, Staff])
    print("Connected to MongoDB successfully.")
    
    # 2. Get all valid image URLs from DB
    students = await Student.find_all().to_list()
    staff_members = await Staff.find_all().to_list()
    
    valid_student_photos = {s.photo_url for s in students if s.photo_url}
    valid_staff_photos = {s.photo_url for s in staff_members if s.photo_url}
    
    print(f"Found {len(valid_student_photos)} valid student photos in DB.")
    print(f"Found {len(valid_staff_photos)} valid staff photos in DB.")
    
    base_dir = os.path.dirname(__file__)
    
    # 3. Clean Students Uploads
    student_uploads_dir = os.path.join(base_dir, "uploads", "students")
    if os.path.exists(student_uploads_dir):
        for filename in os.listdir(student_uploads_dir):
            file_url = f"/uploads/students/{filename}"
            if file_url not in valid_student_photos:
                filepath = os.path.join(student_uploads_dir, filename)
                print(f"Deleting orphaned student photo: {filename}")
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"Failed to delete {filepath}: {e}")
    
    # 4. Clean Staff Uploads
    staff_uploads_dir = os.path.join(base_dir, "uploads", "staff")
    if os.path.exists(staff_uploads_dir):
        for filename in os.listdir(staff_uploads_dir):
            file_url = f"/uploads/staff/{filename}"
            if file_url not in valid_staff_photos:
                filepath = os.path.join(staff_uploads_dir, filename)
                print(f"Deleting orphaned staff photo: {filename}")
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"Failed to delete {filepath}: {e}")

    print("Cleanup completed successfully.")

if __name__ == "__main__":
    asyncio.run(cleanup_orphaned_images())
