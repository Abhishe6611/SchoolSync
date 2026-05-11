import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import certifi
from app.models.payroll import Payslip, SalaryStructure
from app.models.staff import Staff
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL, tls=True, tlsCAFile=certifi.where())
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Payslip, SalaryStructure, Staff])
    p_count = await Payslip.count()
    s_count = await SalaryStructure.count()
    st_count = await Staff.count()
    print(f"Total Staff: {st_count}")
    print(f"Total Structures: {s_count}")
    print(f"Total Payslips: {p_count}")
    
    if p_count > 0:
        p = await Payslip.find_one()
        print(f"Sample Payslip: Month={p.month}, Year={p.year}, Status={p.status}")

if __name__ == "__main__":
    asyncio.run(check())
