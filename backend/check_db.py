import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import init_db
from app.models.staff_attendance import StaffAttendance
from app.models.payroll import Payslip

async def main():
    await init_db()
    
    from datetime import date
    start_date = date(2026, 5, 1)
    end_date = date(2026, 5, 31)
    
    attendances = await StaffAttendance.find(
        StaffAttendance.date >= start_date,
        StaffAttendance.date <= end_date
    ).to_list()
    
    print(f"Total May attendances: {len(attendances)}")
    if attendances:
        a = attendances[0]
        print(f"Sample attendance: staff={a.staff_id}, date={a.date}, type={type(a.date)}, status={a.status}")
        
if __name__ == "__main__":
    asyncio.run(main())
