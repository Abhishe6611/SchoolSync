import requests

def test_put():
    login_data = {"username": "teacher", "password": "teacher123"}
    r = requests.post("http://127.0.0.1:8000/auth/login", data=login_data)
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to put an attendance record with extra fields
    payload = {
        "student_id": 1,
        "class_id": 1,
        "date": "2026-05-03",
        "status": "present",
        "remarks": "",
        "id": 4604,
        "created_at": "2026-05-03T10:19:29.078000",
        "updated_at": "2026-05-03T10:20:16.376000"
    }
    r_put = requests.put("http://127.0.0.1:8000/attendance/4604", json=payload, headers=headers)
    print("PUT Status:", r_put.status_code)
    print("PUT Body:", r_put.text)

if __name__ == "__main__":
    test_put()
