"""
Test login endpoint
"""
import requests
import json

# Test credentials
test_accounts = [
    {"email": "admin@example.com", "password": "admin123"},
    {"email": "admin@example.com", "password": "admin"},
    {"email": "thoughtbox51@gmail.com", "password": "admin123"},
    {"email": "thoughtbox51@gmail.com", "password": "admin"},
]

API_URL = "http://localhost:5000/api"

print("Testing login endpoint...")
print("=" * 60)

for i, creds in enumerate(test_accounts, 1):
    print(f"\nTest {i}: {creds['email']} / {creds['password']}")
    print("-" * 60)
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json=creds,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS!")
            print(f"   Token: {data['token'][:50]}...")
            print(f"   User: {data['user']['name']} ({data['user']['email']})")
            print(f"   Role: {data['user']['role']}")
            print(f"\n🎉 WORKING CREDENTIALS FOUND!")
            print(f"   Email: {creds['email']}")
            print(f"   Password: {creds['password']}")
            break
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.json().get('detail', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
else:
    print("\n" + "=" * 60)
    print("❌ None of the test passwords worked.")
    print("\nYou need to reset the password using:")
    print("  python reset_password.py")
