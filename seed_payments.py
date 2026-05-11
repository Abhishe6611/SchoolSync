"""Seed payment records for existing students/fees."""
import pymongo, random
from datetime import datetime, date, timedelta

import os
from dotenv import load_dotenv
load_dotenv()

client = pymongo.MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client['school_management']
now = datetime.utcnow()

db['payments'].delete_many({})

students = list(db['students'].find({}, {'_id': 1}))
fees = {f['student_id']: f for f in db['fees'].find()}

FEE_TYPES = ["Tuition", "Lab", "Library", "Sports", "Transport"]
PAY_MODES = ["Cash", "UPI", "Net Banking", "Cheque", "Card"]

payments = []
pay_id = 1
receipt_counter = 1

for s in students:
    sid = s['_id']
    fee = fees.get(sid)
    if not fee:
        continue

    total_due = fee['amount']
    # Generate 1-3 payment records, ensuring total paid matches fee status
    num_payments = random.randint(1, 3)
    remaining = total_due

    # Decide how much of the total gets paid
    roll = random.random()
    if roll < 0.55:
        target_paid = total_due  # fully paid
    elif roll < 0.80:
        target_paid = round(total_due * random.uniform(0.3, 0.7), -2)  # partial
    else:
        target_paid = 0  # nothing paid

    if target_paid == 0:
        # No payments for this student
        db['fees'].update_one({'_id': fee['_id']}, {'$set': {'paid_amount': 0, 'status': 'pending'}})
        continue

    # Split target_paid across num_payments
    pay_amounts = []
    left = target_paid
    for i in range(num_payments):
        if i == num_payments - 1:
            pay_amounts.append(left)
        else:
            chunk = round(left * random.uniform(0.3, 0.6), -2)
            chunk = max(500, min(chunk, left - 500 * (num_payments - i - 1)))
            pay_amounts.append(chunk)
            left -= chunk

    base_date = date(2025, random.randint(1, 6), random.randint(1, 28))
    for i, amt in enumerate(pay_amounts):
        if amt <= 0:
            continue
        pay_date = base_date + timedelta(days=i * random.randint(15, 45))
        receipt = f"RCP-2025-{receipt_counter:04d}"
        txn = f"TXN{random.randint(100000000, 999999999)}"
        receipt_counter += 1

        payments.append({
            '_id': pay_id,
            'student_id': sid,
            'fee_type': random.choice(FEE_TYPES),
            'amount': amt,
            'payment_date': datetime(pay_date.year, pay_date.month, min(pay_date.day, 28)),
            'mode': random.choice(PAY_MODES),
            'receipt_number': receipt,
            'transaction_no': txn,
            'remarks': None,
            'created_at': now,
            'updated_at': now,
        })
        pay_id += 1

    # Update fee record
    actual_paid = sum(a for a in pay_amounts if a > 0)
    if actual_paid >= total_due:
        status = 'paid'
    elif actual_paid > 0:
        status = 'partial'
    else:
        status = 'pending'
    db['fees'].update_one({'_id': fee['_id']}, {'$set': {'paid_amount': actual_paid, 'status': status}})

if payments:
    db['payments'].insert_many(payments)
db['counters'].replace_one({'_id': 'payments'}, {'_id': 'payments', 'seq': len(payments)}, upsert=True)

# Count statuses
fc = {}
for f in db['fees'].find():
    fc[f['status']] = fc.get(f['status'], 0) + 1

print(f"Seeded {len(payments)} payment records for {len(students)} students")
print(f"Fee statuses: {fc}")
