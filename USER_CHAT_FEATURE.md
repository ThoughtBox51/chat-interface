# User-to-User Chat Feature

## Overview
Added functionality to search for users by username/email and start direct message conversations with them. The system prevents duplicate chats between the same users.

## Backend Changes

### 1. User Search Endpoint
- **File**: `backend/app/api/v1/endpoints/users.py`
- **Endpoint**: `GET /api/users/search/?query={query}`
- Searches active users by name or email (case-insensitive)
- Returns up to 10 matching users
- Excludes the current user from results

### 2. Direct Chat Creation
- **File**: `backend/app/api/v1/endpoints/chats.py`
- **Endpoint**: `POST /api/chats/direct/?participant_id={user_id}`
- Creates or retrieves existing direct message chat
- **Prevents duplicate direct chats** between same users
- Automatically sets chat title to "Chat with {username}"
- Returns existing chat if one already exists

### 3. Chat Model Updates
- **File**: `backend/app/models/chat.py`
- Added `chat_type` field: "ai" (default) or "direct"
- Added `participant_id` field for direct messages

## Frontend Changes

### 1. User Search Component
- **Files**: `src/components/UserSearch.jsx`, `src/components/UserSearch.css`
- Modal interface for searching users
- Real-time search with 2+ character minimum
- Shows "Chat" button for new conversations
- Shows "Open Chat" button (green) for existing conversations
- Automatically detects if a direct chat already exists

### 2. Sidebar Updates
- **File**: `src/components/Sidebar.jsx`
- Added "👤 Chat with User" button (green)
- Opens user search modal
- Shows 👤 icon next to direct message chats in the list

### 3. Chat Window Updates
- **File**: `src/components/ChatWindow.jsx`
- Shows "Direct Message" indicator for user-to-user chats
- Hides model selector for direct chats
- Direct messages don't trigger AI responses

### 4. App Integration
- **File**: `src/App.jsx`
- Integrated UserSearch component
- Modified `sendMessage` to skip AI for direct chats
- Added `handleChatCreated` to manage new direct chats
- Passes existing chats to UserSearch for duplicate detection

### 5. Service Updates
- **File**: `src/services/user.service.js`
  - Added `searchUsers(query)` method
- **File**: `src/services/chat.service.js`
  - Added `createDirectChat(participantId)` method

## How to Use

1. Click the "👤 Chat with User" button in the sidebar
2. Type at least 2 characters to search for users
3. Click "Chat" next to any user to start a new direct conversation
4. If a chat already exists, the button shows "Open Chat" (green) and opens the existing conversation
5. The chat will appear in your chat list with a 👤 icon
6. Messages sent in direct chats are stored but don't trigger AI responses

## Features

- Search users by name or email
- **No duplicate chats**: System automatically detects and reuses existing direct chats
- Visual distinction between AI and direct chats (👤 icon in sidebar)
- "Open Chat" vs "Chat" button indicates existing conversations
- Messages persist in the database
- Real-time UI updates
- Direct message indicator in chat window header

## Duplicate Prevention

The system prevents duplicate chats at multiple levels:

1. **Backend**: The `create_direct_chat` endpoint checks for existing chats before creating new ones
2. **Frontend**: The UserSearch component checks existing chats and shows "Open Chat" for users you already have conversations with
3. **User Experience**: Clicking either button opens the same chat, providing a seamless experience
