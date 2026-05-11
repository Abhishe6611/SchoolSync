import requests

def test_api():
    # Login to get token
    login_data = {"username": "teacher", "password": "teacher123"}
    r = requests.post("http://127.0.0.1:8000/auth/login", data=login_data)
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /classes
    r_c = requests.get("http://127.0.0.1:8000/classes/", headers=headers)
    print("Classes Status:", r_c.status_code)
    if r_c.status_code != 200:
        print("Classes Error:", r_c.text)
        
    # Test /students
    r_s = requests.get("http://127.0.0.1:8000/students/", headers=headers)
    print("Students Status:", r_s.status_code)
    if r_s.status_code != 200:
        print("Students Error:", r_s.text)

if __name__ == "__main__":
    test_api()
