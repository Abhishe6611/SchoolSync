import requests

def test_attendance():
    # Login to get token
    login_data = {"username": "teacher", "password": "teacher123"}
    r = requests.post("http://127.0.0.1:8000/auth/login", data=login_data)
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    r_a = requests.get("http://127.0.0.1:8000/attendance/?class_id=1", headers=headers)
    if r_a.status_code == 200:
        data = r_a.json()
        print(f"Total attendance for class 1: {len(data)}")
        if data:
            print("Sample:", data[0])
    else:
        print("Error:", r_a.text)

if __name__ == "__main__":
    test_attendance()
