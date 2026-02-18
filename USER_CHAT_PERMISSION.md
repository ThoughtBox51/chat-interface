# User Chat Permission Feature

## Overview
Added role-based permission control for the "Chat with User" functionality. Admins can now control which users can initiate direct chats with other users through role permissions.

## Changes Made

### Backend Changes

#### 1. Role Model (`backend/app/models/role.py`)
Added `user_chat` permission to `FeaturePermissions`:
```python
class FeaturePermissions(BaseModel):
    chat: bool = False
    history: bool = False
    export: bool = False
    share: bool = False
    settings: bool = False
    profile: bool = False
    user_chat: bool = False  # NEW: Permission to chat with other users
```

#### 2. Roles Endpoint (`backend/app/api/v1/endpoints/roles.py`)
Added new endpoint to get current user's permissions:
```python
@router.get("/current/permissions")
async def get_current_user_permissions(current_user: User = Depends(get_current_user))
```

**Returns:**
```json
{
  "user_chat": true/false,
  "chat": true/false,
  "history": true/false,
  "export": true/false,
  "share": true/false,
  "settings": true/false,
  "profile": true/false
}
```

**Permission Logic:**
- Admins: Always have `user_chat: true`
- Users without custom_role: `user_chat: false` (default)
- Users with custom_role: Based on role's `permissions.features.user_chat`

#### 3. Chats Endpoint (`backend/app/api/v1/endpoints/chats.py`)
Added permission check in `create_direct_chat()`:
- Checks if user has `user_chat` permission before allowing direct chat creation
- Returns 403 Forbidden if permission is denied
- Admins always have permission

### Frontend Changes

#### 1. Role Service (`src/services/role.service.js`)
Added method to fetch permissions:
```javascript
async getCurrentUserPermissions() {
  const response = await api.get('/roles/current/permissions')
  return response.data
}
```

#### 2. App Component (`src/App.jsx`)
- Added `permissions` state
- Fetches permissions on initial load along with chats and models
- Passes permissions to Sidebar component

#### 3. Sidebar Component (`src/components/Sidebar.jsx`)
- Accepts `permissions` prop
- Conditionally renders "Chat with User" button:
```jsx
{permissions?.user_chat && (
  <button className="new-chat-btn search-user-btn" onClick={onOpenUserSearch}>
    👤 Chat with User
  </button>
)}
```

#### 4. Role Modal (`src/components/RoleModal.jsx`)
- Added `user_chat` to default permissions
- Added checkbox in Feature Permissions section:
  - Label: "User Chat"
  - Description: "Chat with other users"

## Usage

### For Admins

1. **Create/Edit Role:**
   - Go to Admin Panel → Roles tab
   - Create new role or edit existing role
   - In "Feature Permissions" section, check "User Chat" to allow users with this role to chat with other users

2. **Assign Role to User:**
   - Go to Admin Panel → Users tab
   - Select role for user
   - If role has "User Chat" enabled, user will see the "👤 Chat with User" button

### For Users

- If your role has "User Chat" permission:
  - You'll see "👤 Chat with User" button in sidebar
  - You can search for and chat with other users
  
- If your role doesn't have "User Chat" permission:
  - "👤 Chat with User" button is hidden
  - Attempting to create direct chat via API returns 403 Forbidden

## Permission Hierarchy

1. **Admin users**: Always have all permissions including `user_chat`
2. **Users with custom_role**: Permissions based on role configuration
3. **Users without custom_role**: Default permissions (no `user_chat`)

## API Endpoints

### Get Current User Permissions
```
GET /api/roles/current/permissions
Authorization: Bearer <token>

Response:
{
  "user_chat": false,
  "chat": true,
  "history": true,
  "export": false,
  "share": false,
  "settings": true,
  "profile": true
}
```

### Create Direct Chat (with permission check)
```
POST /api/chats/direct/?participant_id=<user_id>
Authorization: Bearer <token>

Success: 200 OK with chat data
Error: 403 Forbidden if user doesn't have user_chat permission
```

## Testing

1. **Test as Admin:**
   - Should always see "Chat with User" button
   - Should be able to create direct chats

2. **Test with Role (user_chat enabled):**
   - Create role with "User Chat" checked
   - Assign to user
   - User should see "Chat with User" button
   - User should be able to create direct chats

3. **Test with Role (user_chat disabled):**
   - Create role without "User Chat" checked
   - Assign to user
   - User should NOT see "Chat with User" button
   - API should return 403 if user tries to create direct chat

4. **Test without Custom Role:**
   - User without custom_role should NOT see "Chat with User" button
   - API should return 403 if user tries to create direct chat

## Files Modified

### Backend:
- `backend/app/models/role.py`
- `backend/app/api/v1/endpoints/roles.py`
- `backend/app/api/v1/endpoints/chats.py`

### Frontend:
- `src/services/role.service.js`
- `src/App.jsx`
- `src/components/Sidebar.jsx`
- `src/components/RoleModal.jsx`

## Security Notes

- Permission check is enforced at the API level (backend)
- Frontend hiding of button is for UX only, not security
- Even if button is shown via manipulation, API will reject unauthorized requests
- Admins always bypass permission checks for user chat
