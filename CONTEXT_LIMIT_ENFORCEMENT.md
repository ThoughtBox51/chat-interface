# Context Limit Enforcement Implementation

## Overview

Added enforcement to prevent users from continuing a chat session when the context length limit is reached. This includes both frontend and backend validation.

## Features

### 1. Frontend Enforcement (ChatWindow.jsx)

#### Pre-submission Check
- Estimates tokens for the new message before sending
- Calculates projected total (current + new message)
- Shows alert if limit would be exceeded
- Prevents form submission

#### Visual Indicators
- **Warning Banner**: Appears when context limit is reached
  - Red background with warning icon
  - Message: "⚠️ Context limit reached. Start a new chat to continue."
- **Disabled Input**: Input field becomes disabled and grayed out
- **Disabled Send Button**: Send button is disabled with tooltip
- **Placeholder Text**: Changes to "Context limit reached - start new chat"

#### User Experience
```
When limit reached:
┌─────────────────────────────────────────────────┐
│ ⚠️ Context limit reached. Start a new chat to  │
│    continue.                                    │
├─────────────────────────────────────────────────┤
│ [Context limit reached - start new chat] [Send]│
│  (disabled input)                    (disabled) │
└─────────────────────────────────────────────────┘
```

### 2. Backend Enforcement (chats.py)

#### Validation in send_message Endpoint
- Checks user's role for context_length limit
- Calculates current token usage from all messages
- Estimates tokens for new message
- Returns HTTP 403 if limit would be exceeded

#### Error Response
```json
{
  "detail": "Context length limit exceeded. Current: ~3500 tokens, Limit: 4096 tokens. Please start a new chat."
}
```

## Implementation Details

### Frontend Logic

```javascript
// Check before sending
const estimatedNewTokens = Math.ceil(input.length / 4) + 10
const projectedTotal = currentTokens + estimatedNewTokens

if (projectedTotal > limits.context_length) {
  alert('Context limit reached! ...')
  return
}

// Disable controls when limit reached
const isContextLimitReached = limits && 
  limits.context_length && 
  currentTokens >= limits.context_length
```

### Backend Logic

```python
# Get role's context length
context_length = role.get('context_length', 4096)

# Calculate current tokens
current_tokens = sum(len(msg.get('content', '')) // 4 + 10 
                    for msg in messages)
new_message_tokens = len(message.content) // 4 + 10

# Validate
if current_tokens + new_message_tokens > context_length:
    raise HTTPException(status_code=403, detail="...")
```

## Token Estimation

Both frontend and backend use the same estimation:
- **Base**: ~4 characters per token
- **Overhead**: +10 tokens per message (for role, structure, etc.)

**Formula**: `tokens = (message_length / 4) + 10`

**Note**: This is an approximation. For production, consider:
- Using a proper tokenizer (tiktoken, gpt-tokenizer)
- Model-specific token counting
- Accounting for system prompts

## User Flow

### Normal Usage
1. User types message
2. System checks context usage
3. If under limit, message is sent
4. Context indicator updates

### Approaching Limit (90-99%)
1. Context indicator turns red
2. User can still send messages
3. Visual warning of approaching limit

### At Limit (100%)
1. Warning banner appears
2. Input field disabled
3. Send button disabled
4. User must start new chat

### Attempting to Send at Limit
1. Frontend prevents submission
2. Shows alert with current usage
3. Suggests starting new chat
4. If bypassed, backend returns 403

## Error Handling

### Frontend Errors
```javascript
try {
  await onSendMessage(message, selectedModel)
} catch (error) {
  if (error.response?.status === 403) {
    // Show context limit error
    alert(error.response.data.detail)
  }
}
```

### Backend Errors
- **403 Forbidden**: Context limit exceeded
- **404 Not Found**: Chat not found
- **400 Bad Request**: Invalid message data

## Styling

### Warning Banner
```css
.context-warning {
  background: #ef444420;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 6px;
}
```

### Disabled States
```css
.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn:disabled {
  opacity: 0.6;
}
```

## Testing

### Test Scenarios

1. **Normal Message**
   - Context: 50% used
   - Action: Send message
   - Expected: Message sent successfully

2. **Approaching Limit**
   - Context: 95% used
   - Action: Send message
   - Expected: Message sent, indicator red

3. **At Limit**
   - Context: 100% used
   - Action: Try to send
   - Expected: Warning shown, input disabled

4. **Exceeding Limit**
   - Context: 99% used
   - Action: Send long message
   - Expected: Alert shown, message not sent

5. **Backend Validation**
   - Context: At limit
   - Action: API call to send message
   - Expected: 403 error returned

### Manual Testing

1. **Set Low Context Limit**
   ```
   Admin Panel → Roles → Edit Role
   Set context_length = 500
   ```

2. **Create Test Chat**
   - Start new chat
   - Send several messages
   - Watch context indicator

3. **Reach Limit**
   - Continue sending until 100%
   - Verify warning appears
   - Verify input disabled

4. **Try to Bypass**
   - Use browser dev tools
   - Try to enable input
   - Verify backend rejects

## Configuration

### Setting Context Limits

Admins can set context length per role:
- Default: 4096 tokens
- Range: 512 - 128000 tokens
- Unlimited: Not supported (must have a limit)

### Recommended Limits

| Role | Context Length | Use Case |
|------|---------------|----------|
| Free | 2048 | Short conversations |
| Basic | 4096 | Standard conversations |
| Pro | 8192 | Extended conversations |
| Enterprise | 16384+ | Long-form discussions |

## Future Enhancements

1. **Smart Context Management**
   - Auto-trim old messages
   - Summarize conversation history
   - Keep only recent + important messages

2. **Context Window Sliding**
   - Automatically remove oldest messages
   - Maintain conversation continuity
   - Preserve system prompts

3. **User Warnings**
   - Alert at 80% usage
   - Suggest summarization at 90%
   - Offer to start new chat

4. **Analytics**
   - Track average context usage
   - Identify users hitting limits
   - Optimize context length settings

5. **Advanced Features**
   - Per-model context limits
   - Dynamic context allocation
   - Context compression techniques

## Security Considerations

- **Double Validation**: Both frontend and backend check limits
- **No Bypass**: Backend always validates, even if frontend is modified
- **Clear Errors**: Users understand why they can't continue
- **Graceful Degradation**: System remains functional at limit

## Performance

- **Minimal Overhead**: Token estimation is fast (~O(n) where n = message length)
- **No External Calls**: Estimation done locally
- **Cached Limits**: Role limits fetched once per session
- **Real-time Updates**: Context indicator updates instantly

## Accessibility

- **Clear Messaging**: Warning text is descriptive
- **Visual Indicators**: Color coding for status
- **Keyboard Navigation**: Disabled state prevents accidental submission
- **Screen Readers**: Warning banner is readable
