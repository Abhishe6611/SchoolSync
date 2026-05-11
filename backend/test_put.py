import requests

def test_put():
    login_data = {"username": "teacher", "password": "teacher123"}
    r = requests.post("http://127.0.0.1:8000/auth/login", data=login_data)
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to put an attendance record
    payload = {
        "status": "present",
        "remarks": ""
    }
    # ID 4604 is the one we just created
    r_put = requests.put("http://127.0.0.1:8000/attendance/4604", json=payload, headers=headers)
    print("PUT Status:", r_put.status_code)
    print("PUT Body:", r_put.text)

if __name__ == "__main__":
    test_put()
