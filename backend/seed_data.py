"""
Comprehensive seed script for School Management System.
Populates all collections with realistic dummy data.
Every student and staff member has a unique name.
"""
import pymongo
import random
from datetime import datetime, date, timedelta


import os
from dotenv import load_dotenv
load_dotenv()

client = pymongo.MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client['school_management']

# ── Helpers ───────────────────────────────────────────────
now = datetime.utcnow()

def dt(d):
    if isinstance(d, date) and not isinstance(d, datetime):
        return datetime(d.year, d.month, d.day)
    return d

def rand_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    return start + timedelta(days=random.randint(0, (end - start).days))

def rand_phone():
    return f"+91{random.randint(7000000000, 9999999999)}"

# ── Configuration ────────────────────────────────────────
FIRST_NAMES_M = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
                  "Shaurya", "Atharv", "Dhruv", "Kabir", "Ritvik", "Aarush", "Karan", "Arnav", "Rohan", "Dev",
                  "Yash", "Harsh", "Tanmay", "Pranav", "Nikhil", "Manish", "Raj", "Sameer", "Vikram", "Suresh"]
FIRST_NAMES_F = ["Ananya", "Diya", "Myra", "Sara", "Aanya", "Aadhya", "Isha", "Pari", "Navya", "Anika",
                  "Saanvi", "Riya", "Kavya", "Prisha", "Meera", "Tanya", "Pooja", "Sneha", "Nisha", "Priya",
                  "Shreya", "Neha", "Sanya", "Aarohi", "Kiara", "Zara", "Mahi", "Trisha", "Aditi", "Divya"]
LAST_NAMES = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Nair", "Joshi", "Verma", "Iyer",
              "Malhotra", "Chatterjee", "Deshmukh", "Pillai", "Mehta", "Shah", "Rao", "Bhat", "Saxena", "Kapoor",
              "Agarwal", "Pandey", "Mishra", "Banerjee", "Das", "Choudhary", "Thakur", "Rathore", "Kulkarni", "Patil"]
ADDRESSES = ["MG Road, Bangalore", "Park Street, Kolkata", "Connaught Place, Delhi", "Marine Drive, Mumbai",
             "Anna Nagar, Chennai", "Jubilee Hills, Hyderabad", "Lal Darwaja, Ahmedabad", "Hazratganj, Lucknow",
             "Shivaji Nagar, Pune", "Sector 17, Chandigarh", "Civil Lines, Jaipur", "Residency Road, Indore"]
STAFF_ROLES = ["Teacher", "Teacher", "Teacher", "Teacher", "Lab Assistant", "Librarian", "Counselor", "Sports Coach"]
SUBJECT_MAP = {
    1: [("English", "ENG"), ("Mathematics", "MAT"), ("EVS", "EVS"), ("Hindi", "HIN")],
    2: [("English", "ENG"), ("Mathematics", "MAT"), ("EVS", "EVS"), ("Hindi", "HIN")],
    3: [("English", "ENG"), ("Mathematics", "MAT"), ("Science", "SCI"), ("Social Studies", "SST"), ("Hindi", "HIN")],
    4: [("English", "ENG"), ("Mathematics", "MAT"), ("Science", "SCI"), ("Social Studies", "SST"), ("Hindi", "HIN")],
    5: [("English", "ENG"), ("Mathematics", "MAT"), ("Science", "SCI"), ("Social Studies", "SST"), ("Hindi", "HIN"), ("Computer Science", "CS")],
    6: [("English", "ENG"), ("Mathematics", "MAT"), ("Science", "SCI"), ("Social Studies", "SST"), ("Hindi", "HIN"), ("Computer Science", "CS")],
    7: [("English", "ENG"), ("Mathematics", "MAT"), ("Physics", "PHY"), ("Chemistry", "CHM"), ("Biology", "BIO"), ("Social Studies", "SST"), ("Computer Science", "CS")],
    8: [("English", "ENG"), ("Mathematics", "MAT"), ("Physics", "PHY"), ("Chemistry", "CHM"), ("Biology", "BIO"), ("Social Studies", "SST"), ("Computer Science", "CS")],
    9: [("English", "ENG"), ("Mathematics", "MAT"), ("Physics", "PHY"), ("Chemistry", "CHM"), ("Biology", "BIO"), ("History", "HIS"), ("Computer Science", "CS")],
    10: [("English", "ENG"), ("Mathematics", "MAT"), ("Physics", "PHY"), ("Chemistry", "CHM"), ("Biology", "BIO"), ("History", "HIS"), ("Computer Science", "CS")],
}
FEE_TYPES = ["Tuition", "Lab", "Library", "Sports", "Transport"]

# ── Pre-generate unique name pool ────────────────────────
all_names_m = [(fn, ln) for fn in FIRST_NAMES_M for ln in LAST_NAMES]
all_names_f = [(fn, ln) for fn in FIRST_NAMES_F for ln in LAST_NAMES]
random.shuffle(all_names_m)
random.shuffle(all_names_f)
all_unique_names = []
for i in range(max(len(all_names_m), len(all_names_f))):
    if i < len(all_names_m):
        all_unique_names.append(("Male", all_names_m[i][0], all_names_m[i][1]))
    if i < len(all_names_f):
        all_unique_names.append(("Female", all_names_f[i][0], all_names_f[i][1]))
name_cursor = 0

def next_unique_name():
    global name_cursor
    result = all_unique_names[name_cursor]
    name_cursor += 1
    return result

# ═════════════════════════════════════════════════════════
print("=" * 60)
print("  School Management System - Database Seeder")
print("=" * 60)

# ── Step 1: Clear ────────────────────────────────────────
collections_to_clear = ["classes", "staff", "students", "subjects", "attendance", "fees", "audit_logs", "counters"]
for col in collections_to_clear:
    db[col].delete_many({})
print(f"\n[OK] Cleared {len(collections_to_clear)} collections")

# ── Step 2: Classes ──────────────────────────────────────
classes = []
for i in range(1, 11):
    classes.append({
        "_id": i, "name": f"Grade {i}",
        "section": random.choice(["A", "B"]) if i <= 5 else "A",
        "year": "2025-2026", "advisor_id": None,
        "created_at": now, "updated_at": now,
    })
db["classes"].insert_many(classes)
print(f"[OK] Seeded {len(classes)} classes")

# ── Step 3: Staff (unique names) ─────────────────────────
staff = []
for i in range(1, 26):
    gender, fn, ln = next_unique_name()
    staff.append({
        "_id": i, "first_name": fn, "last_name": ln,
        "role": STAFF_ROLES[i % len(STAFF_ROLES)],
        "email": f"{fn.lower()}.{ln.lower()}@schoolsync.edu",
        "phone": rand_phone(), "hire_date": dt(rand_date(2018, 2025)),
        "is_active": True, "created_at": now, "updated_at": now,
    })
db["staff"].insert_many(staff)
print(f"[OK] Seeded {len(staff)} staff (unique names)")

teachers = [s for s in staff if s["role"] == "Teacher"]
for i, cls in enumerate(classes):
    db["classes"].update_one({"_id": cls["_id"]}, {"$set": {"advisor_id": teachers[i % len(teachers)]["_id"]}})

# ── Step 4: Students (unique names) ──────────────────────
students = []
student_id = 1
for class_id in range(1, 11):
    for _ in range(random.randint(12, 18)):
        gender, fn, ln = next_unique_name()
        adm_year = random.choices([2022, 2023, 2024, 2025], weights=[15, 25, 30, 30])[0]
        students.append({
            "_id": student_id, "first_name": fn, "last_name": ln,
            "dob": dt(rand_date(2008, 2016)), "gender": gender,
            "email": f"{fn.lower()}.{ln.lower()}@student.schoolsync.edu",
            "phone": rand_phone(),
            "address": f"{random.randint(1,500)}, {random.choice(ADDRESSES)}",
            "admission_date": dt(rand_date(adm_year, adm_year)),
            "is_active": True, "class_id": class_id,
            "created_at": now, "updated_at": now,
        })
        student_id += 1
db["students"].insert_many(students)
print(f"[OK] Seeded {len(students)} students (unique names)")

# ── Step 5: Subjects ─────────────────────────────────────
subjects = []
subject_id = 1
for class_id, subj_list in SUBJECT_MAP.items():
    for name, code in subj_list:
        subjects.append({
            "_id": subject_id, "name": name, "code": f"{code}-{class_id}",
            "class_id": class_id, "created_at": now, "updated_at": now,
        })
        subject_id += 1
db["subjects"].insert_many(subjects)
print(f"[OK] Seeded {len(subjects)} subjects")

# ── Step 6: Attendance (30 school days) ──────────────────
attendance = []
att_id = 1
school_days = []
d = date.today() - timedelta(days=45)
while len(school_days) < 30:
    if d.weekday() < 5:
        school_days.append(d)
    d += timedelta(days=1)

for day in school_days:
    for s in students:
        status = random.choices(["Present", "Absent", "Late", "Excused"], weights=[90, 5, 3, 2])[0]
        remarks = None
        if status == "Absent":
            remarks = random.choice(["Sick leave", "Family emergency", "No reason given", "Medical appointment"])
        elif status == "Late":
            remarks = random.choice(["Bus delay", "Traffic", "Overslept"])
        attendance.append({
            "_id": att_id, "student_id": s["_id"], "class_id": s["class_id"],
            "date": dt(day), "status": status, "remarks": remarks,
            "created_at": now, "updated_at": now,
        })
        att_id += 1

for i in range(0, len(attendance), 5000):
    db["attendance"].insert_many(attendance[i:i+5000])
print(f"[OK] Seeded {len(attendance)} attendance records")

# ── Step 7: Fees (1 per student — no duplicate names) ────
fees = []
fee_id = 1
for s in students:
    amount = random.choice([5000, 8000, 10000, 12000, 15000, 20000])
    due = rand_date(2025, 2025)
    roll = random.random()
    if roll < 0.55:
        status, paid_amount, paid_on = "paid", amount, dt(due - timedelta(days=random.randint(1, 15)))
    elif roll < 0.75:
        status, paid_amount, paid_on = "pending", 0, None
    elif roll < 0.90:
        status, paid_amount, paid_on = "partial", round(amount * random.uniform(0.3, 0.7), -2), dt(due - timedelta(days=random.randint(0, 5)))
    else:
        status, paid_amount, paid_on = "overdue", 0, None
    fees.append({
        "_id": fee_id, "student_id": s["_id"], "amount": amount,
        "paid_amount": paid_amount, "due_date": dt(due), "paid_on": paid_on,
        "status": status, "created_at": now, "updated_at": now,
    })
    fee_id += 1
db["fees"].insert_many(fees)
fc = {}
for f in fees:
    fc[f["status"]] = fc.get(f["status"], 0) + 1
print(f"[OK] Seeded {len(fees)} fee records -- {fc}")

# ── Step 8: Audit Logs ───────────────────────────────────
audit_logs = []
for i in range(1, 51):
    action = random.choice(["CREATE", "UPDATE", "DELETE"])
    entity = random.choice(["Student", "Staff", "Fee", "Class", "Subject", "Attendance"])
    t = now - timedelta(hours=random.randint(1, 720))
    audit_logs.append({
        "_id": i, "user_id": 1, "user_email": "superadmin@example.com",
        "action": action, "entity": entity, "entity_id": random.randint(1, 50),
        "details": {"note": f"{action} {entity.lower()} record"},
        "created_at": t, "updated_at": t,
    })
db["audit_logs"].insert_many(audit_logs)
print(f"[OK] Seeded {len(audit_logs)} audit logs")

# ── Step 9: Counters ─────────────────────────────────────
for col, seq in {"classes": len(classes), "staff": len(staff), "students": len(students),
                  "subjects": len(subjects), "attendance": len(attendance), "fees": len(fees),
                  "audit_logs": len(audit_logs)}.items():
    db["counters"].replace_one({"_id": col}, {"_id": col, "seq": seq}, upsert=True)
print("[OK] Updated counters")

# ── Summary ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("  Seeding Complete!")
print("=" * 60)
for col in sorted(db.list_collection_names()):
    print(f"  {col:20s} -> {db[col].count_documents({}):,} documents")
print("=" * 60)
