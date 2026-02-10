"""
Test script to verify backend setup
"""
import sys

print("Testing FastAPI backend setup...\n")

# Test Python version
print(f"Python version: {sys.version}")
if sys.version_info < (3, 8):
    print("❌ Python 3.8+ required")
    sys.exit(1)
print("✓ Python version OK\n")

# Test imports
packages = {
    'fastapi': 'FastAPI',
    'uvicorn': 'Uvicorn',
    'pydantic': 'Pydantic',
    'jose': 'Python-JOSE',
    'passlib': 'Passlib',
    'boto3': 'Boto3',
    'aioboto3': 'Aioboto3'
}

all_installed = True
for package, name in packages.items():
    try:
        __import__(package)
        print(f"✓ {name} installed")
    except ImportError as e:
        print(f"✗ {name} not installed: {e}")
        all_installed = False

print("\n" + "="*50)
if all_installed:
    print("All dependencies installed successfully!")
    print("="*50)
    print("\nNext steps:")
    print("1. Set up DynamoDB (local or AWS)")
    print("2. Update .env file with DynamoDB configuration")
    print("3. Run: python run.py")
    print("4. Visit: http://localhost:5000/docs")
else:
    print("Some dependencies are missing!")
    print("="*50)
    print("\nRun: pip install -r requirements.txt")
