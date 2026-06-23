import jwt
import datetime
import argparse
import os
from dotenv import load_dotenv

load_dotenv()

LICENSE_SECRET_KEY = os.getenv("LICENSE_SECRET_KEY", "super_secret_master_license_key_for_this_deployment")

def generate_license(school_name: str, days_valid: int):
    expiration = datetime.datetime.utcnow() + datetime.timedelta(days=days_valid)
    payload = {
        "school": school_name,
        "exp": expiration,
        "iat": datetime.datetime.utcnow(),
        "type": "enterprise_license"
    }
    
    token = jwt.encode(payload, LICENSE_SECRET_KEY, algorithm="HS256")
    print("\n" + "="*50)
    print("SUCCESS! License Key Generated")
    print("="*50)
    print(f"School Name   : {school_name}")
    print(f"Valid For     : {days_valid} days")
    print(f"Expires On    : {expiration.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print("-" * 50)
    print("LICENSE KEY (Copy below this line):")
    print(token)
    print("="*50 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a JWT License Key for SchoolSync ERP")
    parser.add_argument("--school", type=str, required=True, help="Name of the school")
    parser.add_argument("--days", type=int, default=365, help="Number of days the license is valid for")
    
    args = parser.parse_args()
    generate_license(args.school, args.days)
