# Profile Update Fix

## Issues Fixed

### Issue 1: Profile Updates Not Saving
**Problem:** Backend expected query parameters but frontend was sending JSON body

**Fixed:**
- Backend now accepts JSON body with `profile_data: dict`
- Properly extracts `name` and `bio` from the request body
- Returns updated user data correctly

### Issue 2: Email Field Editable
**Problem:** Users could edit their email address (which shouldn't be allowed)

**Fixed:**
- Email input field is now disabled
- Added visual styling for disabled state
- Added hint text: "Email cannot be changed"
- Frontend only sends `name` and `bio` to backend

### Issue 3: Response Structure Mismatch
**Problem:** Frontend expected `response.data.user` but backend returned `response.data`

**Fixed:**
- Auth service now correctly reads `response.data` directly
- Backend returns User model directly (not wrapped)

## Changes Made

### Backend (auth.py)

**Before:**
```python
async def update_profile(
    name: str = None,
    bio: str = None,
    current_user: User = Depends(get_current_user)
):
```

**After:**
```python
async def update_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user profile (name and bio only, email cannot be changed)"""
    name = profile_data.get('name')
    bio = profile_data.get('bio')
```

### Frontend (Profile.jsx)

**Email Field - Before:**
```jsx
<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>
```

**Email Field - After:**
```jsx
<input
  type="email"
  value={email}
  disabled
  className="disabled-input"
  title="Email cannot be changed"
/>
<span className="field-hint">Email cannot be changed</span>
```

**Submit Handler - Before:**
```javascript
onUpdateProfile({ ...user, name, email, bio })
```

**Submit Handler - After:**
```javascript
onUpdateProfile({ name, bio })  // Only name and bio
```

### Auth Service (auth.service.js)

**Before:**
```javascript
async updateProfile(data) {
  const response = await api.put('/auth/profile', data)
  return response.data.user  // ❌ Wrong path
}
```

**After:**
```javascript
async updateProfile(data) {
  const response = await api.put('/auth/profile', data)
  return response.data  // ✅ Correct path
}
```

## Visual Changes

### Disabled Email Field

The email field now appears:
- Grayed out (darker background)
- With reduced opacity
- With "not-allowed" cursor on hover
- With italic hint text below

```css
.disabled-input {
  background: #2a2b32 !important;
  color: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.7;
}
```

## Testing

### Test Profile Update

1. **Open Profile:**
   - Click on user avatar in sidebar
   - Select "Profile"

2. **Verify Email is Disabled:**
   - Email field should be grayed out
   - Cannot click or edit
   - Shows hint: "Email cannot be changed"

3. **Update Name:**
   - Change name field
   - Click "Save Changes"
   - ✅ Name should update
   - ✅ Sidebar should show new name
   - ✅ Profile should close

4. **Update Bio:**
   - Open profile again
   - Change bio field
   - Click "Save Changes"
   - ✅ Bio should update
   - ✅ Changes should persist

5. **Verify Persistence:**
   - Refresh page
   - Open profile
   - ✅ Name and bio should still be updated
   - ✅ Email should remain unchanged

## Security

### Why Email Cannot Be Changed

1. **Authentication:** Email is used for login
2. **Verification:** Email changes require verification
3. **Security:** Prevents account hijacking
4. **Audit Trail:** Email should be immutable for tracking

### If Email Change is Needed

To implement email change in the future:
1. Require current password verification
2. Send verification email to new address
3. Require confirmation from both old and new email
4. Add audit log entry
5. Notify user of the change

## API Endpoint

### Update Profile

**Endpoint:** `PUT /api/auth/profile`

**Request Body:**
```json
{
  "name": "New Name",
  "bio": "New bio text"
}
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "New Name",
  "bio": "New bio text",
  "role": "user",
  "status": "active",
  "created_at": "2026-02-11T...",
  "updated_at": "2026-02-14T..."
}
```

**Errors:**
- `400 Bad Request` - No fields to update
- `401 Unauthorized` - Not logged in
- `404 Not Found` - User not found

## Error Handling

The frontend now shows alerts for errors:

```javascript
try {
  const updated = await authService.updateProfile(profileData)
  setUser(updated)
  localStorage.setItem('user', JSON.stringify(updated))
} catch (error) {
  alert(`Failed to update profile: ${error.response?.data?.detail || error.message}`)
}
```

## Summary

✅ Profile updates now work correctly
✅ Email field is disabled and cannot be changed
✅ Only name and bio can be updated
✅ Changes persist after page refresh
✅ Error messages shown if update fails
✅ Visual feedback for disabled field

The profile update feature is now fully functional and secure!
