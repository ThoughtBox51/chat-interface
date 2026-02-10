# Quick Start Guide - LLM Chat Application

This guide will help you get the application running quickly.

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- Git installed

## Step 1: Install Local DynamoDB (Recommended for Development)

### Option A: Using Docker (Easiest)

```bash
docker pull amazon/dynamodb-local
docker run -p 8000:8000 amazon/dynamodb-local
```

### Option B: Download JAR File

1. Download from: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
2. Extract and run:
```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

## Step 2: Set Up Backend

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create and activate virtual environment

Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
The `.env` file is already configured for local DynamoDB. If you need to change settings:
```bash
# Edit backend/.env if needed
```

### 5. Start the backend server
```bash
python run.py
```

The backend will:
- Start on http://localhost:5000
- Automatically create DynamoDB tables
- Provide Swagger docs at http://localhost:5000/docs

### 6. Create admin user (in a new terminal)
```bash
cd backend
venv\Scripts\activate
python create_admin.py
```

Enter admin credentials when prompted.

## Step 3: Set Up Frontend

### 1. Navigate to project root (in a new terminal)
```bash
cd ..
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Create `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the frontend
```bash
npm run dev
```

The frontend will start on http://localhost:5173

## Step 4: Access the Application

1. Open browser to http://localhost:5173
2. Login with the admin credentials you created
3. Start chatting!

## Admin Features

As an admin, you can:

1. **Manage Models** - Add LLM models (OpenAI, Anthropic, custom endpoints)
2. **Manage Users** - Approve pending signups, assign roles
3. **Manage Roles** - Create custom roles with granular permissions
4. **View All Features** - Access all chat and management features

## Testing the Setup

### Backend Health Check
```bash
curl http://localhost:5000/api/health
```

### View API Documentation
Open http://localhost:5000/docs in your browser

### Test Frontend
Open http://localhost:5173 in your browser

## Common Issues

### Backend won't start
- Make sure DynamoDB is running (Docker or JAR)
- Check if port 5000 is available
- Verify Python dependencies are installed

### Frontend won't start
- Make sure Node.js is installed
- Check if port 5173 is available
- Verify npm dependencies are installed

### Can't create admin user
- Make sure backend is running
- Make sure DynamoDB is running
- Check backend logs for errors

### DynamoDB connection errors
- Verify DynamoDB is running on port 8000
- Check `DYNAMODB_ENDPOINT_URL` in `backend/.env`

## Next Steps

1. Add LLM models in the Admin Panel
2. Create roles with specific permissions
3. Invite users to sign up
4. Start chatting with your LLMs!

## Production Deployment

For production deployment:

1. Use AWS DynamoDB instead of local
2. Update `backend/.env` with AWS credentials
3. Change `SECRET_KEY` to a secure random string
4. Build frontend: `npm run build`
5. Deploy backend with a production ASGI server
6. Set up proper CORS origins

## Documentation

- Backend API: http://localhost:5000/docs
- Backend Setup: `backend/README.md`
- DynamoDB Setup: `backend/DYNAMODB_SETUP.md`
- Main README: `README.md`

## Support

If you encounter issues:
1. Check the logs (backend terminal)
2. Verify all services are running
3. Check the documentation files
4. Review error messages in browser console
