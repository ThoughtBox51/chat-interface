# Admin Context Length Enforcement Fix

## Problem

Admin users were being blocked from chatting after reaching 4096 tokens, even though admins should have unlimited access.

## Root Cause

The API was returning `context_length: 4096` for users without a custom_role (including admins), and the frontend was enforcing this limit for everyone.

**Backend Logic:**
- Users without `custom_role` → No enforcement in backend ✅
- Users with `custom_role` → Enforcement in backend ✅

**Frontend Logic (BROKEN):**
- Any user with `context_length` value → Enforcement ❌
- This included admins who got the default 4096

## Solution

### 1. Backend API Change

Changed the API to return `null` for context_length when there's no custom_role:

**Before:**
```python
if not current_user.custom_role:
    return {
        "context_length": 4096,  # ❌ This was being enforced
        ...
    }
```

**After:**
```python
if not current_user.custom_role:
    return {
        "context_length": None,  # ✅ None means unlimited
        ...
    }
```

### 2. Frontend Enforcement Logic

Updated ChatWindow to only enforce when context_length is explicitly set (not null):

**Before:**
```javascript
if (limits && limits.context_length) {
  // ❌ This checked for any truthy value (including 4096)
  if (projectedTotal > limits.context_length) {
    alert('Context limit reached!')
    return
  }
}
```

**After:**
```javascript
if (limits && limits.context_length !== null && limits.context_length !== undefined) {
  // ✅ Only enforce if explicitly set
  if (projectedTotal > limits.context_length) {
    alert('Context limit reached!')
    return
  }
}
```

### 3. Context Indicator Display

Updated to only show the context indicator when there's an actual limit:

**Before:**
```javascript
{limits && limits.context_length && chat?.messages?.length > 0 && (
  // ❌ Showed for admins with default 4096
  <div className="context-indicator">...</div>
)}
```

**After:**
```javascript
{limits && limits.context_length !== null && limits.context_length !== undefined && chat?.messages?.length > 0 && (
  // ✅ Only shows when limit is explicitly set
  <div className="context-indicator">...</div>
)}
```

## Behavior After Fix

### Admin Users (no custom_role)
- ✅ No context length limit
- ✅ No context indicator shown
- ✅ Can chat indefinitely
- ✅ No warning messages

### Users with Custom Role (with context_length set)
- ✅ Context length enforced
- ✅ Context indicator shown
- ✅ Warning at limit
- ✅ Input disabled at limit

### Users with Custom Role (context_length = null)
- ✅ No context length limit
- ✅ No context indicator shown
- ✅ Can chat indefinitely
- ✅ No warning messages

## Testing

### Test as Admin
1. Login as admin user
2. Start a chat
3. Send many long messages
4. ✅ Should NOT see context indicator
5. ✅ Should NOT be blocked at any point

### Test as User with Limit
1. Create a role with context_length = 2000
2. Assign to a test user
3. Login as that user
4. Send messages until limit reached
5. ✅ Should see context indicator
6. ✅ Should be blocked at 2000 tokens

### Test as User without Limit
1. Create a role with context_length = null (empty)
2. Assign to a test user
3. Login as that user
4. Send many messages
5. ✅ Should NOT see context indicator
6. ✅ Should NOT be blocked

## API Response Examples

### Admin User (no custom_role)
```json
{
  "max_chats": null,
  "max_tokens_per_month": null,
  "context_length": null,
  "tokens_used_this_month": 0
}
```

### User with Custom Role (limits set)
```json
{
  "max_chats": 50,
  "max_tokens_per_month": 1000000,
  "context_length": 8192,
  "tokens_used_this_month": 45000
}
```

### User with Custom Role (no limits)
```json
{
  "max_chats": null,
  "max_tokens_per_month": null,
  "context_length": null,
  "tokens_used_this_month": 0
}
```

## Key Takeaway

**`null` means unlimited, not 0 or a default value.**

- `context_length: null` → No limit, no enforcement
- `context_length: 4096` → Limit of 4096 tokens, enforced
- `context_length: undefined` → Treated same as null (no limit)

## Files Changed

1. `backend/app/api/v1/endpoints/roles.py`
   - Changed default context_length from 4096 to None
   - Added comments explaining the behavior

2. `src/components/ChatWindow.jsx`
   - Updated handleSubmit to check for null/undefined
   - Updated isContextLimitReached logic
   - Updated context indicator display condition

## Rollback (if needed)

If you need to revert:

```bash
git checkout HEAD -- backend/app/api/v1/endpoints/roles.py
git checkout HEAD -- src/components/ChatWindow.jsx
```

## Verification

After the fix, verify:

✅ Admin users can chat without limits
✅ Context indicator doesn't show for admins
✅ Users with custom roles still have limits enforced
✅ Users with null context_length have no limits
✅ Backend enforcement still works for custom roles
