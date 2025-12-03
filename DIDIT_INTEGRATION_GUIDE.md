# Didit Identity Verification - Frontend Integration Guide

## Overview

Didit is integrated into the customer signup flow for identity verification. This does **not** affect the existing signup process - customers are still automatically approved. Didit is used to verify the customer's identity document during signup.

---

## Signup Flow

```
Email → OTP → BasicInfo → Didit Verification → Complete Registration → Home/Dashboard
                              ↓
                    ┌─────────┴─────────┐
                    │   WebView opens   │
                    │   Didit portal    │
                    └─────────┬─────────┘
                              ↓
                    Poll session status every 3s
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
               Approved             Declined
                    ↓                   ↓
         Complete Registration    Show error, retry
```

---

## API Endpoints

### Base URL
```
https://your-backend-url.com
```

---

## 🔓 NO-AUTH ENDPOINTS (For Signup Flow)

### 1. Create Verification Session for Signup (NO TOKEN REQUIRED)

Use this endpoint during signup BEFORE the user is registered. No JWT token needed.

**Endpoint:** `POST /api/didit/signup/session`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "callback_url": "fixmo://verification-complete"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| email | ✅ Yes | User's email (used as identifier) |
| first_name | ❌ No | User's first name |
| last_name | ❌ No | User's last name |
| callback_url | ❌ No | Deep link to redirect after verification |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification session created successfully",
  "data": {
    "session_id": "abc123-def456-ghi789",
    "verification_url": "https://verify.didit.me/session/abc123-def456-ghi789",
    "status": "Not Started",
    "email": "user@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email is required"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Didit verification is not properly configured"
}
```

---

### 2. Check Verification Status for Signup (NO TOKEN REQUIRED)

Poll this endpoint during signup to check if verification is complete.

**Endpoint:** `GET /api/didit/signup/status/:session_id`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "abc123-def456-ghi789",
    "status": "Approved",
    "is_approved": true,
    "is_declined": false,
    "is_pending": false,
    "decision": null,
    "decline_reasons": []
  }
}
```

**Status Values:**
- `is_approved: true` → Verification passed, proceed with registration
- `is_declined: true` → Verification failed, show error and allow retry
- `is_pending: true` → Still in progress, keep polling

---

## 🔒 AUTH ENDPOINTS (For Already Logged-In Users)

### 3. Create Verification Session (Requires JWT)

Creates a new Didit verification session for an authenticated customer.

**Endpoint:** `POST /api/didit/customer/session`

**Headers:**
```json
{
  "Authorization": "Bearer <customer_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body (optional):**
```json
{
  "callback_url": "fixmo://verification-complete"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification session created successfully",
  "data": {
    "session_id": "abc123-def456-ghi789",
    "verification_url": "https://verify.didit.me/session/abc123-def456-ghi789",
    "status": "Not Started"
  }
}
```

**Error Response (400) - Already Verified:**
```json
{
  "success": false,
  "message": "Customer is already verified"
}
```

**Error Response (500) - Not Configured:**
```json
{
  "success": false,
  "message": "Didit verification is not properly configured"
}
```

---

### 4. Check Session Status (Requires JWT)

Poll this endpoint to check if the user completed verification.

**Endpoint:** `GET /api/didit/session/:session_id`

**Headers:**
```json
{
  "Authorization": "Bearer <customer_jwt_token>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session retrieved successfully",
  "data": {
    "session_id": "abc123-def456-ghi789",
    "status": "Approved",
    "id_verification": {
      "status": "Approved",
      "document_type": "Identity Card",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-01-15"
    }
  }
}
```

---

## Verification Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `Not Started` | User hasn't started verification | Keep polling |
| `In Progress` | User is verifying | Keep polling |
| `Approved` | ✅ Verification successful | Navigate to next page |
| `Declined` | ❌ Verification failed | Show error, allow retry |
| `Expired` | Session timed out | Create new session |
| `Abandoned` | User left without completing | Create new session |

---

## Frontend Implementation (React Native)

### Installation Requirements

```bash
npm install react-native-webview
# or
yarn add react-native-webview
```

### 🔓 SIGNUP FLOW Implementation (No Auth Required)

Use this when integrating Didit into your signup flow BEFORE the user has a JWT token.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  StyleSheet,
  TouchableOpacity 
} from 'react-native';
import { WebView } from 'react-native-webview';

const API_BASE_URL = 'https://your-backend-url.com'; // Replace with actual URL

interface SignupVerificationProps {
  email: string;          // From previous signup step
  firstName?: string;     // From previous signup step
  lastName?: string;      // From previous signup step
  navigation: any;
}

export default function SignupVerification({ 
  email, 
  firstName, 
  lastName, 
  navigation 
}: SignupVerificationProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    createSession();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Step 1: Create verification session (NO AUTH REQUIRED)
  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/didit/signup/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          first_name: firstName,
          last_name: lastName,
          callback_url: 'fixmo://verification-complete'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.data.session_id);
        setSessionUrl(data.data.verification_url);
        setLoading(false);
        startPolling(data.data.session_id);
      } else {
        setError(data.message || 'Failed to start verification');
        setLoading(false);
      }
    } catch (err) {
      console.error('Create session error:', err);
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const startPolling = (sid: string) => {
    pollingRef.current = setInterval(() => {
      checkStatus(sid);
    }, 3000);
  };

  // Step 2: Check verification status (NO AUTH REQUIRED)
  const checkStatus = async (sid: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/didit/signup/status/${sid}`);
      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.is_approved) {
          // ✅ Success! Proceed with registration
          stopPolling();
          Alert.alert(
            'Verification Successful! ✅',
            'Your identity has been verified.',
            [
              {
                text: 'Continue',
                onPress: () => navigation.navigate('CompleteRegistration', { 
                  email,
                  firstName,
                  lastName,
                  diditSessionId: sid 
                }),
              },
            ]
          );
        } else if (data.data.is_declined) {
          // ❌ Failed - show retry option
          stopPolling();
          Alert.alert(
            'Verification Failed',
            data.data.decline_reasons?.join(', ') || 'Could not verify your identity.',
            [
              { text: 'Try Again', onPress: () => createSession() },
              { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            ]
          );
        }
        // is_pending: keep polling
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Setting up verification...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={createSession}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render WebView with Didit verification
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: sessionUrl! }}
        style={styles.webview}
        onError={(e) => {
          console.error('WebView error:', e);
          setError('Failed to load verification page');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#ff3b30', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

---

### 🔒 AUTH FLOW Implementation (For Logged-In Users)

Use this when the user is already logged in and has a JWT token.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  StyleSheet,
  TouchableOpacity 
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-backend-url.com'; // Replace with actual URL

interface DiditVerificationProps {
  navigation: any; // Your navigation prop type
}

export default function DiditVerification({ navigation }: DiditVerificationProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize on mount
  useEffect(() => {
    createSession();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  // Stop polling interval
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Step 1: Create verification session
  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/didit/customer/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_url: 'fixmo://verification-complete' // Optional: deep link
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.data.session_id);
        setSessionUrl(data.data.verification_url);
        setLoading(false);
        
        // Start polling for status
        startPolling(data.data.session_id);
      } else {
        // Handle specific errors
        if (data.message === 'Customer is already verified') {
          // Already verified, proceed to next screen
          navigation.replace('Home'); // or your next screen
        } else {
          setError(data.message || 'Failed to start verification');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Create session error:', err);
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  // Step 2: Start polling for verification status
  const startPolling = (sid: string) => {
    // Poll every 3 seconds
    pollingRef.current = setInterval(() => {
      checkStatus(sid);
    }, 3000);
  };

  // Step 3: Check verification status
  const checkStatus = async (sid: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/api/didit/session/${sid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        const status = data.data.status;

        switch (status) {
          case 'Approved':
            // ✅ Success! Stop polling and navigate
            stopPolling();
            Alert.alert(
              'Verification Successful! ✅',
              'Your identity has been verified. Welcome to Fixmo!',
              [
                {
                  text: 'Continue',
                  onPress: () => navigation.replace('Home'), // Navigate to home/dashboard
                },
              ]
            );
            break;

          case 'Declined':
            // ❌ Failed - stop polling and show retry option
            stopPolling();
            Alert.alert(
              'Verification Failed',
              'We could not verify your identity. Please try again with a valid ID document.',
              [
                {
                  text: 'Try Again',
                  onPress: () => createSession(), // Retry
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => navigation.goBack(),
                },
              ]
            );
            break;

          case 'Expired':
          case 'Abandoned':
            // Session expired - create new one
            stopPolling();
            Alert.alert(
              'Session Expired',
              'Your verification session has expired. Please try again.',
              [
                {
                  text: 'Start Over',
                  onPress: () => createSession(),
                },
              ]
            );
            break;

          // 'Not Started', 'In Progress', 'In Review' - keep polling
          default:
            console.log('Verification status:', status);
            break;
        }
      }
    } catch (err) {
      console.error('Status check error:', err);
      // Don't stop polling on network errors - just log and continue
    }
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Setting up verification...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={createSession}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render WebView with Didit verification
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <Text style={styles.headerSubtitle}>
          Please verify your identity to continue
        </Text>
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: sessionUrl! }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoader}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading verification...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError('Failed to load verification page');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  webview: {
    flex: 1,
  },
  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
```

---

## Navigation Setup

Add the Didit verification screen to your signup navigation flow:

```tsx
// In your navigation config (e.g., AppNavigator.tsx)

import DiditVerification from './screens/auth/didit';

// Inside your Stack.Navigator
<Stack.Screen 
  name="DiditVerification" 
  component={DiditVerification}
  options={{ 
    headerShown: false,
    gestureEnabled: false // Prevent swipe back during verification
  }}
/>
```

### Navigate to Didit after BasicInfo:

```tsx
// In BasicInfo.tsx, after successful submission:
const handleSubmit = async () => {
  // ... your existing logic ...
  
  // Navigate to Didit verification
  navigation.navigate('DiditVerification');
};
```

---

## Testing

### Test Flow:
1. Complete email and OTP steps
2. Fill in BasicInfo
3. Should navigate to DiditVerification screen
4. WebView opens with Didit portal
5. Complete verification in the portal
6. App automatically detects completion and navigates to Home

### Test Scenarios:
| Scenario | Expected Behavior |
|----------|-------------------|
| Successful verification | Shows success alert, navigates to Home |
| Failed verification | Shows error alert with retry option |
| User closes WebView without completing | Keep polling, session may expire |
| Network error during polling | Continue polling, don't interrupt |
| Session expires | Show expired alert, offer to start over |

---

## Error Handling

### Common Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "Didit verification is not properly configured" | Backend missing `DIDIT_WORKFLOW_ID` | Contact backend team |
| "Customer is already verified" | User already verified | Skip to next screen |
| "Failed to create verification session" | API error | Retry or contact support |
| Network timeout | Poor connection | Retry with better connection |

---

## Important Notes

1. **User Token**: The customer must be authenticated (have a valid JWT token) before accessing Didit verification.

2. **Polling Interval**: 3 seconds is recommended. Don't poll too frequently to avoid rate limiting.

3. **WebView**: Use `react-native-webview` for displaying the Didit verification portal.

4. **Deep Links (Optional)**: You can set a `callback_url` to deep link back to your app, but polling handles the flow regardless.

5. **No Database Updates**: The verification result is handled entirely in the frontend. The backend does not update user records based on Didit results.

---

## Support

If you encounter issues:
1. Check the browser console/logs for error messages
2. Verify the JWT token is valid
3. Check network connectivity
4. Contact the backend team if API endpoints return errors

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Dec 3, 2025 | 1.0.0 | Initial Didit integration for customer signup |
