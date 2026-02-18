# Loading Issue Debugging Guide

## Problem
Chats are not loading after hard refresh - taking more than 5 minutes.

## Changes Made

### 1. Optimized Polling (src/App.jsx)
- Changed polling to use `getChats(false)` instead of `getChats()` to avoid loading all messages every 5 seconds
- Polling now only loads chat metadata (titles, timestamps) without messages
- When changes detected, only reload messages for the active chat
- Preserves existing messages in state when updating metadata

### 2. Added Timeout to Initial Load (src/App.jsx)
- Added 30-second timeout to prevent infinite loading
- Shows alert if loading fails with error message
- Added console logging to track loading progress

### 3. Added Performance Logging (src/services/chat.service.js)
- Logs when chat fetch starts and how long it takes
- Shows number of chats loaded

## How to Debug

### Step 1: Open Browser Console
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Hard refresh the page (Ctrl+Shift+R or Ctrl+F5)

### Step 2: Check Console Logs
Look for these messages in order:
```
App mounted, checking for user...
Initial user: [email]
Starting to load user data...
Fetching chats (includeMessages: false)...
Chats fetched in [X]ms: [N] chats
Loaded chats: [N]
Loaded models: [N]
User data loaded successfully
```

### Step 3: Check Network Tab
1. Go to Network tab in Developer Tools
2. Hard refresh the page
3. Look for these requests:
   - `/api/chats/?include_messages=false` - Should return 200 OK quickly
   - `/api/models/` - Should return 200 OK
   - `/api/chats/[chat-id]/` - Should load messages for first chat

### Step 4: Check for Errors
Look for:
- Red error messages in Console
- Failed network requests (red in Network tab)
- JavaScript errors or exceptions
- CORS errors

## Common Issues

### Issue 1: Timeout After 30 Seconds
**Symptom**: Alert shows "Failed to load chats: Loading timeout"
**Cause**: Backend is taking too long to respond
**Solution**: 
- Check backend logs for errors
- Check DynamoDB connection
- Verify AWS credentials are valid

### Issue 2: Network Error
**Symptom**: Console shows "Error loading data: Network Error"
**Cause**: Cannot connect to backend
**Solution**:
- Verify backend is running on port 5000
- Check if `http://localhost:5000/api/chats/` is accessible
- Check CORS configuration

### Issue 3: Infinite Loading (No Timeout)
**Symptom**: Page shows skeleton loading forever, no timeout alert
**Cause**: `setLoading(false)` not being called
**Solution**:
- Check console for JavaScript errors
- Verify the finally block is executing

### Issue 4: Empty Chats Array
**Symptom**: Page loads but shows no chats
**Cause**: Backend returns empty array
**Solution**:
- Check if user has any chats in DynamoDB
- Verify user_id is correct
- Check backend logs for query errors

## Backend Performance

The backend endpoint `/api/chats/?include_messages=false` uses:
- GSI query on `user-id-index` (fast)
- ProjectionExpression to exclude messages (reduces data transfer)
- Limit of 50 chats (prevents loading too much data)
- Should respond in < 1 second for most cases

## Next Steps

1. Open browser console and check logs
2. Share any error messages you see
3. Check Network tab timing for slow requests
4. Verify backend is responding correctly
