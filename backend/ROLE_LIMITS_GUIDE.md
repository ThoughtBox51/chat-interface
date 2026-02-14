# Role-Based Limits Guide

This guide explains the new role-based restriction features added to the application.

## Overview

Admins can now set three types of limits for each role:

1. **Max Chats** - Limit the number of chats a user can create
2. **Max Tokens per Month** - Limit monthly token usage
3. **Context Length** - Set the maximum context length for chat sessions

## Features

### 1. Max Chats Limit

Controls how many chat sessions a user with this role can create.

- **Setting**: Enter a number in the "Max Chats" field when creating/editing a role
- **Unlimited**: Leave empty or set to `null` for unlimited chats
- **Enforcement**: When a user tries to create a new chat, the system checks their current chat count against their role's limit
- **Error**: Users receive a clear error message when they reach their limit

**Example Use Cases:**
- Free tier: 5 chats
- Basic tier: 50 chats
- Premium tier: Unlimited (leave empty)

### 2. Max Tokens per Month

Controls the total number of tokens a user can consume in a calendar month.

- **Setting**: Enter a number in the "Max Tokens per Month" field
- **Unlimited**: Leave empty or set to `null` for unlimited tokens
- **Tracking**: Token usage is tracked per user and resets automatically each month
- **Enforcement**: Before processing a request, the system checks if adding the new tokens would exceed the limit
- **Error**: Users receive an error when they exceed their monthly token limit

**Example Use Cases:**
- Free tier: 100,000 tokens/month
- Basic tier: 1,000,000 tokens/month
- Premium tier: Unlimited

**Token Tracking Endpoint:**
```python
POST /api/users/{user_id}/tokens/
{
  "tokens_used": 1500
}
```

### 3. Context Length

Sets the maximum context window size for chat sessions.

- **Setting**: Enter a number in the "Context Length" field (default: 4096)
- **Range**: Typically 512 to 128,000 depending on the model
- **Usage**: This value should be used by the frontend to limit the conversation history sent to the model
- **Purpose**: Controls memory usage and API costs

**Example Use Cases:**
- Basic tier: 4,096 tokens (standard)
- Advanced tier: 16,384 tokens (extended context)
- Premium tier: 32,768 or higher (long conversations)

## Admin Interface

### Creating/Editing Roles

1. Navigate to Admin Panel → Roles tab
2. Click "Create New Role" or "Edit" on an existing role
3. Fill in the basic information (name, description)
4. Set usage limits in the "Usage Limits" section:
   - **Max Chats**: Number of chats or leave empty for unlimited
   - **Max Tokens per Month**: Monthly token limit or leave empty for unlimited
   - **Context Length**: Context window size (default: 4096)
5. Configure permissions as usual
6. Save the role

### Viewing Role Limits

In the Roles list, each role card displays:
- Number of models, features, and admin permissions
- Three limit badges showing:
  - Chats: Number or ∞ (infinity symbol for unlimited)
  - Tokens/mo: Number with comma formatting or ∞
  - Context: Context length value

## Backend Implementation

### Database Schema

**Roles Table** - New fields:
```python
max_chats: Optional[int] = None  # None = unlimited
max_tokens_per_month: Optional[int] = None  # None = unlimited
context_length: Optional[int] = 4096  # Default context
```

**Users Table** - New fields:
```python
tokens_used_this_month: int = 0
token_usage_reset_date: Optional[datetime] = None
```

### API Endpoints

**Get Current User Limits:**
```
GET /api/roles/current/limits
```

Returns:
```json
{
  "max_chats": 50,
  "max_tokens_per_month": 1000000,
  "context_length": 8192,
  "tokens_used_this_month": 45000
}
```

**Track Token Usage:**
```
POST /api/users/{user_id}/tokens/
{
  "tokens_used": 1500
}
```

### Validation Logic

**Chat Creation:**
1. Check if user has a custom role
2. If role has `max_chats` limit, count user's existing chats
3. Reject if count >= limit with HTTP 403

**Token Usage:**
1. Check if it's a new month (reset counter if needed)
2. Add new tokens to current month's usage
3. Check against role's `max_tokens_per_month`
4. Reject if exceeds limit with HTTP 403

## Migration

Run these scripts once to add new fields to existing data:

```bash
# Migrate roles
python backend/migrate_roles.py

# Migrate users
python backend/migrate_users.py
```

## Frontend Integration

### Displaying Limits

The frontend can fetch current user limits:

```javascript
import { roleService } from './services/role.service'

const limits = await roleService.getCurrentUserLimits()
// Use limits.max_chats, limits.context_length, etc.
```

### Handling Errors

When creating chats or sending messages, handle 403 errors:

```javascript
try {
  await chatService.createChat(chatData)
} catch (error) {
  if (error.response?.status === 403) {
    // Show user-friendly message about limit reached
    alert(error.response.data.detail)
  }
}
```

### Context Length Usage

When sending messages to the LLM, use the role's context length to trim conversation history:

```javascript
const limits = await roleService.getCurrentUserLimits()
const contextLength = limits.context_length || 4096

// Trim messages to fit within context length
const trimmedMessages = trimToContextLength(messages, contextLength)
```

## Best Practices

1. **Set Reasonable Defaults**: Start with conservative limits and adjust based on usage
2. **Monitor Usage**: Track token consumption to set appropriate limits
3. **Clear Communication**: Inform users about their limits and current usage
4. **Graceful Degradation**: Show helpful error messages when limits are reached
5. **Admin Override**: Consider allowing admins to temporarily increase limits for specific users

## Future Enhancements

Potential additions:
- Per-model token limits
- Daily/weekly token limits in addition to monthly
- Usage analytics dashboard
- Automatic limit increases based on payment tier
- Notifications when approaching limits
- Token usage history and charts
