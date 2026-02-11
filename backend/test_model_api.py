"""
Test script to show the exact payload format for creating a model
"""
import json

# Example payload for Easy Integration (e.g., OpenAI)
easy_integration_payload = {
    "name": "GPT-4",
    "provider": "openai",
    "integration_type": "easy",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "api_key": "sk-your-api-key-here",
    "auth_profile": "bearer",
    "configuration_type": "default",
    "body": None,
    "is_active": True,
    "headers": []
}

# Example payload for Custom Integration
custom_integration_payload = {
    "name": "My Custom Model",
    "provider": None,
    "integration_type": "custom",
    "endpoint": "https://my-api.com/v1/generate",
    "api_key": "my-custom-api-key",
    "auth_profile": "bearer",
    "configuration_type": "custom",
    "body": json.dumps({
        "model": "custom-model",
        "temperature": 0.7
    }),
    "is_active": True,
    "headers": [
        {
            "key": "Content-Type",
            "value": "application/json",
            "secure": False
        },
        {
            "key": "X-Custom-Header",
            "value": "custom-value",
            "secure": False
        }
    ]
}

print("=" * 60)
print("EASY INTEGRATION PAYLOAD (e.g., OpenAI, Anthropic)")
print("=" * 60)
print(json.dumps(easy_integration_payload, indent=2))

print("\n" + "=" * 60)
print("CUSTOM INTEGRATION PAYLOAD")
print("=" * 60)
print(json.dumps(custom_integration_payload, indent=2))

print("\n" + "=" * 60)
print("REQUIRED FIELDS")
print("=" * 60)
print("- name: string (required)")
print("- integration_type: 'easy' or 'custom' (required)")
print("- auth_profile: 'none', 'bearer', 'api_key', etc. (default: 'none')")
print("- configuration_type: 'default' or 'custom' (default: 'default')")
print("- is_active: boolean (default: True)")
print("\nOPTIONAL FIELDS")
print("- provider: string (for easy integration)")
print("- endpoint: string (API endpoint URL)")
print("- api_key: string (API key for authentication)")
print("- body: string (JSON string for request body)")
print("- headers: array of {key, value, secure}")

print("\n" + "=" * 60)
print("TEST MODEL RESPONSE")
print("=" * 60)
test_response = {
    "success": True,
    "message": "Model connection successful",
    "response": {
        "status": "ok",
        "model": "GPT-4",
        "provider": "openai"
    }
}
print(json.dumps(test_response, indent=2))

print("\n" + "=" * 60)
print("CREATE MODEL RESPONSE")
print("=" * 60)
create_response = {
    "id": "uuid-here",
    "name": "GPT-4",
    "provider": "openai",
    "integration_type": "easy",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "auth_profile": "bearer",
    "configuration_type": "default",
    "is_active": True,
    "created_by": "admin-user-id",
    "created_at": "2024-02-11T12:00:00",
    "updated_at": "2024-02-11T12:00:00"
}
print(json.dumps(create_response, indent=2))
print("\nNote: api_key and headers are NOT returned for security")
