# LLM Chat Application - Backend

FastAPI backend with AWS DynamoDB for the LLM Chat Application.

## Features

- FastAPI with automatic Swagger documentation
- JWT authentication with bcrypt password hashing
- AWS DynamoDB for data storage
- Role-based access control (RBAC)
- Model management (Easy & Custom integration)
- Chat history management
- User approval workflow

## Prerequisites

- Python 3.8+
- AWS Account (or local DynamoDB)
- pip or virtualenv

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

Windows:
```bash
venv\Scripts\activate
```

Linux/Mac:
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
copy .env.example .env
```

Edit `.env` file:

**For Local DynamoDB:**
```env
DYNAMODB_ENDPOINT_URL=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

**For AWS DynamoDB:**
```env
DYNAMODB_ENDPOINT_URL=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 5. Set Up DynamoDB

See [DYNAMODB_SETUP.md](DYNAMODB_SETUP.md) for detailed instructions on:
- Installing local DynamoDB
- Configuring AWS DynamoDB
- Table structure and indexes

### 6. Run the Application

The application will automatically create DynamoDB tables on startup.

```bash
python run.py
```

The API will be available at:
- API: http://localhost:5000
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

### 7. Create Admin User

After the server is running and tables are created, create an admin user:

```bash
python create_admin.py
```

Follow the prompts to enter admin credentials.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (pending approval)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update current user profile

### Users (Admin only)
- `GET /api/users` - Get all active users
- `GET /api/users/pending` - Get pending users
- `PUT /api/users/{user_id}/approve` - Approve pending user
- `PUT /api/users/{user_id}/role` - Update user role
- `DELETE /api/users/{user_id}` - Delete user

### Models
- `GET /api/models` - Get all active models
- `POST /api/models` - Create new model (Admin only)
- `PUT /api/models/{model_id}` - Update model (Admin only)
- `DELETE /api/models/{model_id}` - Delete model (Admin only)
- `POST /api/models/{model_id}/test` - Test model connection

### Roles (Admin only)
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `PUT /api/roles/{role_id}` - Update role
- `DELETE /api/roles/{role_id}` - Delete role

### Chats
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `PUT /api/chats/{chat_id}` - Update chat (rename, pin)
- `DELETE /api/chats/{chat_id}` - Delete chat
- `POST /api/chats/{chat_id}/messages` - Send message in chat

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # Dependencies (auth, etc.)
│   │   └── v1/
│   │       ├── api.py           # API router
│   │       └── endpoints/       # API endpoints
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── models.py
│   │           ├── roles.py
│   │           └── chats.py
│   ├── core/
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # DynamoDB connection
│   │   └── security.py          # JWT & password hashing
│   ├── models/                  # Pydantic models
│   │   ├── user.py
│   │   ├── model.py
│   │   ├── role.py
│   │   └── chat.py
│   └── main.py                  # FastAPI app
├── .env                         # Environment variables
├── .env.example                 # Example environment variables
├── requirements.txt             # Python dependencies
├── run.py                       # Run script
├── create_admin.py              # Admin creation script
├── test_setup.py                # Setup verification script
├── DYNAMODB_SETUP.md            # DynamoDB setup guide
└── README.md                    # This file
```

## Testing Setup

Verify your installation:

```bash
python test_setup.py
```

This will check:
- Python version
- All required packages
- Import functionality

## Development

### Running in Development Mode

The server runs with auto-reload enabled by default:

```bash
python run.py
```

### Viewing API Documentation

Once the server is running:
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

### Testing Endpoints

Use the Swagger UI to test endpoints interactively, or use tools like:
- Postman
- curl
- httpie

## Troubleshooting

### DynamoDB Connection Issues

1. Check if local DynamoDB is running (if using local)
2. Verify AWS credentials (if using AWS)
3. Check `DYNAMODB_ENDPOINT_URL` in `.env`

### Import Errors

Make sure virtual environment is activated and dependencies are installed:

```bash
pip install -r requirements.txt
```

### Table Creation Issues

Tables are created automatically on startup. Check server logs for errors.

## Production Deployment

For production:

1. Change `SECRET_KEY` in `.env` to a secure random string
2. Use AWS DynamoDB (not local)
3. Set up proper AWS IAM roles and permissions
4. Use environment variables instead of `.env` file
5. Set `reload=False` in `run.py`
6. Use a production ASGI server like Gunicorn with Uvicorn workers

## License

MIT
