# LLM Chat Application

A full-stack chat application with LLM integration, role-based access control, and admin management.

## Features

### Frontend (React + Vite)
- 💬 ChatGPT-style interface
- 📝 Chat history with pin/rename/delete
- 👤 User authentication & profiles
- 🎨 Dark theme UI
- 📱 Responsive design

### Backend (Python FastAPI)
- 🚀 FastAPI with async/await
- 🔐 JWT authentication
- 👥 Role-Based Access Control (RBAC)
- 🤖 Model management (Easy & Custom integration)
- 📊 Admin panel with user approval workflow
- 📚 Automatic Swagger documentation
- 🗄️ AWS DynamoDB with aioboto3 (async)

### Admin Features
- ✅ User approval system
- 🎭 Custom roles with granular permissions
- 🤖 Model onboarding (OpenAI, Anthropic, Custom APIs)
- 🧪 Model connection testing
- 📊 User management
- 🔧 System configuration

## Tech Stack

**Frontend:**
- React 18
- Vite
- Axios
- CSS3

**Backend:**
- Python 3.10+
- FastAPI
- AWS DynamoDB (aioboto3)
- JWT (python-jose)
- Pydantic
- Bcrypt

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for 5-minute setup guide.

## Documentation

- **Quick Start**: [QUICKSTART.md](QUICKSTART.md) - Get running in 5 minutes
- **Setup Guide**: [SETUP.md](SETUP.md) - Detailed setup instructions
- **Backend API**: [backend/README.md](backend/README.md) - Backend documentation
- **DynamoDB Setup**: [backend/DYNAMODB_SETUP.md](backend/DYNAMODB_SETUP.md) - Database setup
- **API Docs**: http://localhost:5000/docs (when running)

## Project Structure

```
chat-interface/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes & endpoints
│   │   ├── core/              # Config, database, security
│   │   ├── models/            # Pydantic models
│   │   └── main.py            # FastAPI application
│   ├── requirements.txt
│   ├── run.py                 # Run script
│   └── create_admin.py        # Admin creation script
├── src/                       # React frontend
│   ├── components/            # UI components
│   ├── services/              # API services
│   └── App.jsx                # Main app
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Models (Admin)
- `GET /api/models` - List models
- `POST /api/models` - Create model
- `PUT /api/models/{id}` - Update model
- `DELETE /api/models/{id}` - Delete model
- `POST /api/models/{id}/test` - Test connection

### Roles (Admin)
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{id}` - Update role
- `DELETE /api/roles/{id}` - Delete role

### Users (Admin)
- `GET /api/users` - List users
- `GET /api/users/pending` - Pending users
- `PUT /api/users/{id}/approve` - Approve user
- `PUT /api/users/{id}/role` - Update role
- `DELETE /api/users/{id}` - Delete user

### Chats
- `GET /api/chats` - List chats
- `POST /api/chats` - Create chat
- `PUT /api/chats/{id}` - Update chat
- `DELETE /api/chats/{id}` - Delete chat
- `POST /api/chats/{id}/messages` - Send message

## Screenshots

### Chat Interface
ChatGPT-style interface with sidebar for chat history

### Admin Panel
- Model management with easy/custom integration
- Role creation with granular permissions
- User approval workflow

### Swagger Documentation
Interactive API documentation at `/docs`

## Development

### Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 5000
```

### Frontend
```bash
npm run dev
```

## Production

### Backend
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
```bash
npm run build
# Deploy dist/ folder
```

## License

MIT

## Contributing

Pull requests welcome!

## Support

For issues and questions, please open a GitHub issue.
