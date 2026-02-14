# Token Usage & Context Length Display Implementation

## Overview

Added visual indicators throughout the app to show:
1. **Token usage percentage** in Sidebar and Profile
2. **Context length usage** in each chat window

## Features Added

### 1. Token Usage Display

#### Sidebar Footer
- Shows a compact token usage bar above the user profile
- Displays percentage used (e.g., "45%")
- Color-coded progress bar:
  - Green (#10a37f) when usage < 90%
  - Red (#ef4444) when usage ≥ 90%
- Only visible when user has a token limit set

#### Profile Modal
- Detailed usage statistics section
- Shows exact numbers: "45K / 1M tokens"
- Full-width progress bar with percentage
- Displays remaining tokens
- Color changes to red when approaching limit

### 2. Context Length Indicator

#### Chat Window Header
- Shows current context usage for active chat
- Format: "Context: 2.5K / 4K"
- Mini progress bar (60px wide)
- Color-coded like token usage
- Only visible when:
  - User has a context length limit
  - Chat has messages

## Implementation Details

### Token Counting Utility (`src/utils/tokenCounter.js`)

```javascript
// Approximate token estimation
estimateTokens(text) // ~4 chars per token
countMessageTokens(message) // Message + overhead
countChatTokens(messages) // Total for conversation
formatTokenCount(count) // Format as K/M
calculatePercentage(used, limit) // Calculate %
```

**Note:** Uses a simple heuristic (4 chars ≈ 1 token). For production, consider integrating a proper tokenizer library like `tiktoken` or `gpt-tokenizer`.

### Components Updated

#### 1. Sidebar.jsx
- Fetches user limits on mount
- Displays token usage bar in footer
- Updates when user changes

#### 2. Profile.jsx
- Fetches user limits on mount
- Shows detailed usage statistics
- Progress bar with percentage and remaining tokens

#### 3. ChatWindow.jsx
- Fetches user limits on mount
- Calculates current chat tokens in real-time
- Updates as messages are added
- Shows context indicator in header

### Styling

All components use consistent styling:
- Progress bars with smooth transitions
- Color coding (green → red)
- Monospace fonts for numbers
- Responsive layouts

## Visual Examples

### Sidebar Token Bar
```
┌─────────────────────────┐
│ Tokens            45%   │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  │
└─────────────────────────┘
```

### Profile Usage Stats
```
Token Usage This Month
45K / 1M                    45% used
▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  550K remaining
```

### Chat Context Indicator
```
Context: 2.5K / 4K  ▓▓▓▓▓▓▓░░░
```

## API Integration

### Fetching Limits
```javascript
const limits = await roleService.getCurrentUserLimits()
// Returns:
{
  max_chats: 50,
  max_tokens_per_month: 1000000,
  context_length: 4096,
  tokens_used_this_month: 45000
}
```

### Real-time Updates

Token usage updates when:
- User logs in
- Profile is opened
- Sidebar mounts/updates

Context length updates when:
- Chat changes
- New messages are added
- Messages are loaded

## User Experience

### Benefits
1. **Transparency**: Users see their usage at a glance
2. **Awareness**: Visual warnings when approaching limits
3. **Planning**: Users can manage their usage proactively
4. **Context**: Understand when to start new chats

### Color Coding
- **Green** (< 90%): Normal usage
- **Red** (≥ 90%): Approaching limit, take action

## Future Enhancements

1. **Accurate Token Counting**
   - Integrate proper tokenizer (tiktoken)
   - Model-specific token counting
   - Account for system prompts

2. **Usage Analytics**
   - Daily/weekly usage charts
   - Usage history
   - Predictions for month-end

3. **Notifications**
   - Alert at 80%, 90%, 95% usage
   - Email notifications
   - In-app toasts

4. **Context Management**
   - Auto-trim old messages
   - Summarization when approaching limit
   - Smart context window management

5. **Per-Model Limits**
   - Different limits for different models
   - Model-specific context lengths
   - Cost-based limits

## Testing

To test the features:

1. **Set Role Limits**
   - Go to Admin Panel → Roles
   - Edit a role and set limits
   - Assign role to test user

2. **Check Sidebar**
   - Login as test user
   - Verify token bar appears in sidebar
   - Check percentage calculation

3. **Check Profile**
   - Open profile modal
   - Verify detailed usage stats
   - Check progress bar colors

4. **Check Chat Window**
   - Open a chat with messages
   - Verify context indicator appears
   - Add messages and watch it update

5. **Test Edge Cases**
   - User with no limits (unlimited)
   - User at 0% usage
   - User at 100% usage
   - Empty chat (no messages)

## Notes

- Token counting is approximate (4 chars/token)
- Context length includes all messages in chat
- Usage stats refresh on component mount
- Progress bars animate smoothly
- All displays are responsive
