# Message Alignment in Direct Chats

## Overview
Messages in direct chats now follow standard messaging app conventions:
- **Sent messages** (your messages) appear on the RIGHT side in green
- **Received messages** (other person's messages) appear on the LEFT side in gray

## Solution: sender_id Field

The key to proper message alignment is the `sender_id` field added to each message. This allows the frontend to determine who sent each message and align it accordingly.

### Backend Changes

#### File: `backend/app/models/chat.py`
```python
class Message(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sender_id: Optional[str] = None  # ID of user who sent the message
```

#### File: `backend/app/api/v1/endpoints/chats.py`
```python
message_dict = message.model_dump()
message_dict['timestamp'] = datetime.utcnow().isoformat()
message_dict['sender_id'] = current_user.id  # Add sender ID
```

When a message is sent, the backend automatically adds the `sender_id` of the current user.

### Frontend Changes

#### File: `src/App.jsx`
```javascript
const userMessage = { 
  role: 'user', 
  content, 
  timestamp: new Date().toISOString(),
  sender_id: user.id  // Add sender ID for proper alignment
}
```

Optimistic UI updates also include the sender_id.

#### File: `src/components/ChatWindow.jsx`
```javascript
if (isDirectChat && currentUser) {
  // Check if the message was sent by the current user
  const isSentByMe = msg.sender_id === currentUser.id
  messageClass = isSentByMe ? 'sent' : 'received'
}
```

The component compares `msg.sender_id` with `currentUser.id` to determine alignment.

## Visual Design

### Sent Messages (Right Side)
```
                    ┌─────────────────────┐
                    │ Hey, how are you?   │
                    │                     │
                    └─────────────────────┘
```
- Color: Green (#10a37f)
- Alignment: Right
- Border radius: Rounded with small corner on bottom-right
- Max width: 70% of chat window

### Received Messages (Left Side)
```
┌─────────────────────┐
│ I'm good, thanks!   │
│ How about you?      │
└─────────────────────┘
```
- Color: Gray (#444654)
- Alignment: Left
- Border radius: Rounded with small corner on bottom-left
- Max width: 70% of chat window

## How It Works

### Message Flow:

1. **User A sends message to User B:**
   - Message created with `sender_id: user_a_id`
   - Saved to both User A's and User B's chat entries
   - Both entries have same message with same `sender_id`

2. **User A's view:**
   - Checks: `msg.sender_id === user_a_id` → TRUE
   - Renders as 'sent' (right side, green)

3. **User B's view:**
   - Checks: `msg.sender_id === user_b_id` → FALSE
   - Renders as 'received' (left side, gray)

### Example Conversation:

**User A's View:**
```
┌─────────────────────┐
│ Hi there!           │  ← Received (User B sent this)
└─────────────────────┘
                    ┌─────────────────────┐
                    │ Hello! How are you? │  ← Sent (User A sent this)
                    └─────────────────────┘
┌─────────────────────┐
│ I'm great, thanks!  │  ← Received (User B sent this)
└─────────────────────┘
```

**User B's View:**
```
                    ┌─────────────────────┐
                    │ Hi there!           │  ← Sent (User B sent this)
                    └─────────────────────┘
┌─────────────────────┐
│ Hello! How are you? │  ← Received (User A sent this)
└─────────────────────┘
                    ┌─────────────────────┐
                    │ I'm great, thanks!  │  ← Sent (User B sent this)
                    └─────────────────────┘
```

## CSS Styling

### File: `src/components/ChatWindow.css`

#### Sent Message Styling:
```css
.message.sent {
  background: #10a37f;        /* Green */
  color: white;
  margin-left: auto;          /* Push to right */
  margin-right: 0;
  max-width: 70%;
  border-radius: 18px 18px 4px 18px;  /* Small corner bottom-right */
  align-self: flex-end;       /* Align to right */
}
```

#### Received Message Styling:
```css
.message.received {
  background: #444654;        /* Gray */
  color: #ececf1;
  margin-left: 0;
  margin-right: auto;         /* Push to left */
  max-width: 70%;
  border-radius: 18px 18px 18px 4px;  /* Small corner bottom-left */
  align-self: flex-start;     /* Align to left */
}
```

## AI Chat vs Direct Chat

### AI Chat Messages:
- **User messages**: Right side, gray (#444654)
- **Assistant messages**: Left side, gray with border (#343541)
- Uses `role` field ('user' or 'assistant')
- Traditional AI chat appearance

### Direct Chat Messages:
- **Sent messages**: Right side, green (#10a37f)
- **Received messages**: Left side, gray (#444654)
- Uses `sender_id` field to determine alignment
- Modern messaging app appearance

## Database Structure

### Message Object:
```javascript
{
  role: "user",
  content: "Hello!",
  timestamp: "2024-01-15T10:30:00Z",
  sender_id: "user-123-abc"  // Key field for alignment
}
```

### Synced Messages:
Both User A and User B have the same message in their chat entries:
- Same `content`
- Same `timestamp`
- Same `sender_id` (identifies who sent it)
- Same `role` (always "user" for direct chats)

## Border Radius Design

The rounded corners with one small corner create a "chat bubble" effect:

**Sent (Right):**
- Top-left: 18px (rounded)
- Top-right: 18px (rounded)
- Bottom-right: 4px (small corner pointing right)
- Bottom-left: 18px (rounded)

**Received (Left):**
- Top-left: 18px (rounded)
- Top-right: 18px (rounded)
- Bottom-right: 18px (rounded)
- Bottom-left: 4px (small corner pointing left)

## Color Scheme

### Green for Sent Messages:
- Matches the app's accent color (#10a37f)
- Used in: "Chat with User" button, direct chat titles
- Provides visual consistency
- Clearly distinguishes your messages

### Gray for Received Messages:
- Matches the app's dark theme
- Neutral color for received content
- Good contrast with green sent messages

## Future Enhancements

Potential improvements:
1. **Timestamps**: Show time below each message
2. **Message Status**: Sent, delivered, read indicators
3. **Sender Name**: Show name above received messages in group chats
4. **Avatar**: Small profile picture next to messages
5. **Message Grouping**: Combine consecutive messages from same sender
6. **Date Separators**: "Today", "Yesterday", etc.
7. **Reactions**: Add emoji reactions to messages
8. **Reply Threading**: Quote and reply to specific messages
