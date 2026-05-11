import requests

def test_mark_all():
    login_data = {"username": "teacher", "password": "teacher123"}
    r = requests.post("http://127.0.0.1:8000/auth/login", data=login_data)
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to post an attendance record
    payload = {
        "student_id": 1,
        "class_id": 1,
        "date": "2026-05-03",
        "status": "present",
        "remarks": ""
    }
    r_post = requests.post("http://127.0.0.1:8000/attendance/", json=payload, headers=headers)
    print("POST Status:", r_post.status_code)
    print("POST Body:", r_post.text)

if __name__ == "__main__":
    test_mark_all()
