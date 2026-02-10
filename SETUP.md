# Complete Setup Guide - LLM Chat Application

## Prerequisites

### 1. Install Python 3.10+
Download from: https://www.python.org/downloads/

**Important for Windows:**
- Check "Add Python to PATH" during installation
- Verify installation: `python --version`

### 2. Install MongoDB
Download from: https://www.mongodb.com/try/download/community

**Or use MongoDB Atlas (Cloud):**
- Free tier: https://www.mongodb.com/cloud/atlas/register
- Get connection string and update `.env`

### 3. Install Node.js (for frontend)
Already installed ✓

## Backend Setup (Python FastAPI)

### Step 1: Create Virtual Environment
```bash
cd backend
python -m venv venv
```

### Step 2: Activate Virtual Environment
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file:
```env
MONGODB_URL=mongodb://localhost:27017
# Or for MongoDB Atlas:
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/

SECRET_KEY=your-super-secret-key-change-this
```

### Step 5: Run Backend
```bash
uvicorn app.main:app --reload --port 5000
```

**Backend will be available at:**
- API: http://localhost:5000
- Swagger Docs: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Frontend Setup (React + Vite)

### Step 1: Install Dependencies
```bash
# In root directory
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

The `.env` should have:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Run Frontend
```bash
npm run dev
```

**Frontend will be available at:**
- http://localhost:5173

## First Time Setup

### 1. Start MongoDB
Make sure MongoDB is running on your system

### 2. Start Backend
```bash
cd backend
venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 5000
```

### 3. Start Frontend
```bash
# In new terminal, from root directory
npm run dev
```

### 4. Create Admin User
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Register with any email (e.g., admin@example.com)
4. The user will be in "pending" status

### 5. Manually Approve First Admin
Connect to MongoDB and run:
```javascript
use chat_app
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { status: "active", role: "admin" } }
)
```

Or use MongoDB Compass GUI to update the user.

### 6. Login as Admin
Now you can login and access the admin panel!

## Testing the API

### Using Swagger UI (Recommended)
1. Go to http://localhost:5000/docs
2. Click "Authorize" button
3. Login to get token
4. Use token to test all endpoints

### Using curl
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Troubleshooting

### Python not found
- Reinstall Python and check "Add to PATH"
- Restart terminal after installation

### MongoDB connection error
- Check MongoDB is running: `mongod --version`
- Verify connection string in `.env`
- For Atlas, check IP whitelist

### Port already in use
- Backend: Change port in uvicorn command
- Frontend: Vite will auto-assign different port

### CORS errors
- Check `BACKEND_CORS_ORIGINS` in backend `.env`
- Should include frontend URL

## Production Deployment

### Backend
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```

### Frontend
```bash
npm run build
# Deploy 'dist' folder to hosting service
```

## Project Structure

```
chat-interface/
├── backend/                 # Python FastAPI
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, DB, Security
│   │   ├── models/         # Pydantic models
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── .env
├── src/                    # React frontend
│   ├── components/
│   ├── services/           # API services
│   └── App.jsx
├── package.json
└── .env
```

## Next Steps

1. Install Python and MongoDB
2. Follow backend setup steps
3. Test API at http://localhost:5000/docs
4. Start frontend
5. Create and approve admin user
6. Start building!

## Support

- FastAPI Docs: https://fastapi.tiangolo.com/
- MongoDB Docs: https://docs.mongodb.com/
- React Docs: https://react.dev/
