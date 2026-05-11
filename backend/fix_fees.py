"""Re-seed fees: exactly 1 fee per student — no duplicate names in the table."""
import pymongo, random
from datetime import datetime, date

client = pymongo.MongoClient('mongodb://localhost:27017')
db = client['school_management']
now = datetime.utcnow()

db['fees'].delete_many({})

students = list(db['students'].find({}, {'_id': 1}))
amounts = [5000, 8000, 10000, 12000, 15000, 20000]
fees = []

for i, s in enumerate(students, start=1):
    amount = random.choice(amounts)
    due = date(2025, random.randint(1, 12), random.randint(1, 28))
    due_dt = datetime(due.year, due.month, due.day)
    roll = random.random()
    if roll < 0.55:
        status, paid, pon = 'paid', amount, datetime(due.year, due.month, max(1, due.day - random.randint(1, 10)))
    elif roll < 0.75:
        status, paid, pon = 'pending', 0, None
    elif roll < 0.90:
        status, paid, pon = 'partial', round(amount * random.uniform(0.3, 0.7), -2), due_dt
    else:
        status, paid, pon = 'overdue', 0, None

    fees.append({
        '_id': i, 'student_id': s['_id'], 'amount': amount,
        'paid_amount': paid, 'due_date': due_dt, 'paid_on': pon,
        'status': status, 'created_at': now, 'updated_at': now,
    })

db['fees'].insert_many(fees)
db['counters'].replace_one({'_id': 'fees'}, {'_id': 'fees', 'seq': len(fees)}, upsert=True)

fc = {}
for f in fees:
    fc[f['status']] = fc.get(f['status'], 0) + 1
print(f"Done: {len(fees)} fees (1 per student) -- {fc}")
