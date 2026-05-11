import urllib.request, json, time

# Login (with retry for passlib bug)
login_data = b'username=superadmin&password=ChangeMe123!'
req = urllib.request.Request('http://localhost:8000/auth/login', data=login_data,
                             headers={'Content-Type': 'application/x-www-form-urlencoded'}, method='POST')
try:
    resp = urllib.request.urlopen(req)
except Exception:
    time.sleep(0.5)
    resp = urllib.request.urlopen(req)

token = json.loads(resp.read())['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# 1. Fetch next receipt number
req_next = urllib.request.Request('http://localhost:8000/fees/payments/next-receipt', headers=headers)
try:
    resp_next = urllib.request.urlopen(req_next)
    print("Next Receipt:", json.loads(resp_next.read()))
except Exception as e:
    print(f"Error fetching next receipt: {e.read().decode()}")

# 2. Create a Cash payment (should nullify transaction_no)
payment_data = json.dumps({
    "student_id": 1,
    "fee_type": "Tuition",
    "amount": 1000,
    "payment_date": "2025-01-01",
    "mode": "Cash",
    "remarks": "Test"
}).encode()

req_pay = urllib.request.Request('http://localhost:8000/fees/payments/by-student/1', data=payment_data, headers=headers, method='POST')
try:
    resp_pay = urllib.request.urlopen(req_pay)
    print("Created Payment:", json.loads(resp_pay.read()))
except Exception as e:
    print(f"Error creating payment: {e.read().decode()}")
