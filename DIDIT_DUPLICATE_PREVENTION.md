# Didit KYC Duplicate Prevention System

## Overview

This update adds duplicate KYC document detection to prevent users from creating multiple accounts using the same identity document. If a user tries to verify with an ID that has already been used, they will be **blocked from proceeding** to the next page.

---

## Changes Made

### 1. Database Schema Update

**New Table: `DiditVerification`**

Added a new table to track all KYC verification attempts and store document information for duplicate detection.

```sql
CREATE TABLE "DiditVerification" (
    "id" SERIAL PRIMARY KEY,
    "session_id" TEXT UNIQUE NOT NULL,      -- Didit session ID
    "email" TEXT NOT NULL,                   -- Email used for verification
    "document_number" TEXT,                  -- Extracted ID number (for duplicate check)
    "document_type" TEXT,                    -- e.g., "Identity Card", "Passport"
    "first_name" TEXT,                       -- Name from document
    "last_name" TEXT,                        -- Name from document
    "date_of_birth" TEXT,                    -- DOB from document
    "document_country" TEXT,                 -- Country of document
    "status" TEXT DEFAULT 'pending',         -- pending, approved, declined
    "user_id" INTEGER,                       -- Linked user after registration
    "provider_id" INTEGER,                   -- Linked provider after registration
    "verified_at" TIMESTAMP,                 -- When verification completed
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX ON "DiditVerification"("email");
CREATE INDEX ON "DiditVerification"("document_number");  -- Key for duplicate detection
CREATE INDEX ON "DiditVerification"("status");
```

**File:** `prisma/schema.prisma`  
**Migration:** `prisma/migrations/20251203_add_didit_verification/migration.sql`

---

### 2. Controller Updates

**File:** `src/controller/diditController.js`

#### A. `createSignupVerificationSession` - Enhanced

Added checks before creating a verification session:

1. **Email duplicate check** - Prevents creating session if email is already registered
2. **Session tracking** - Saves new verification session to database for tracking

```javascript
// Check if email is already registered
const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
});

if (existingUser) {
    return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
    });
}

// Save verification session for tracking
await prisma.diditVerification.create({
    data: {
        session_id: session.session_id,
        email: email.toLowerCase(),
        first_name: first_name || null,
        last_name: last_name || null,
        status: 'pending'
    }
});
```

#### B. `getSignupVerificationStatus` - Major Update

This is the key function that **prevents duplicate KYC documents**:

1. When Didit returns `Approved`, we extract the document number
2. Check if that document number exists in any previous approved verification
3. If duplicate found → **Block the user** with `is_duplicate: true`
4. If no duplicate → Allow to proceed and save document info

```javascript
// If approved, check for duplicate documents
if (isApproved && session.data) {
    const documentNumber = idVerification.document_number || idVerification.id_number;

    if (documentNumber) {
        const existingVerification = await prisma.diditVerification.findFirst({
            where: {
                document_number: documentNumber,
                status: 'approved',
                session_id: { not: session_id } // Exclude current session
            }
        });

        if (existingVerification) {
            // DUPLICATE FOUND - BLOCK USER
            return res.status(200).json({
                success: true,
                data: {
                    session_id: session_id,
                    status: 'Duplicate Document',
                    is_approved: false,
                    is_declined: true,
                    is_pending: false,
                    is_duplicate: true,  // <-- Frontend checks this
                    duplicate_error: {
                        type: 'DUPLICATE_DOCUMENT',
                        message: 'This identity document has already been used...'
                    }
                }
            });
        }
    }
}
```

---

## API Response Changes

### Check Status Endpoint: `GET /api/didit/signup/status/:session_id`

**New Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `is_duplicate` | boolean | `true` if document was already used |
| `duplicate_error` | object | Details about the duplicate (if applicable) |
| `duplicate_error.type` | string | Always `"DUPLICATE_DOCUMENT"` |
| `duplicate_error.message` | string | User-friendly error message |
| `duplicate_error.existing_email` | string | Masked email of existing account (e.g., `jo***@gmail.com`) |

**Example: Duplicate Detected Response**

```json
{
  "success": true,
  "data": {
    "session_id": "abc123-def456",
    "status": "Duplicate Document",
    "is_approved": false,
    "is_declined": true,
    "is_pending": false,
    "is_duplicate": true,
    "duplicate_error": {
      "type": "DUPLICATE_DOCUMENT",
      "message": "This identity document has already been used to register another account",
      "existing_email": "jo***@gmail.com"
    },
    "decline_reasons": ["This identity document has already been used"]
  }
}
```

**Example: Normal Approved Response**

```json
{
  "success": true,
  "data": {
    "session_id": "abc123-def456",
    "status": "Approved",
    "is_approved": true,
    "is_declined": false,
    "is_pending": false,
    "is_duplicate": false,
    "decision": null,
    "decline_reasons": []
  }
}
```

---

## Frontend Implementation

### React Native - Handle Duplicate Detection

Update your status polling to check for duplicates:

```tsx
const checkStatus = async (sid: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/didit/signup/status/${sid}`);
    const data = await response.json();

    if (data.success && data.data) {
      // ⚠️ CHECK FOR DUPLICATE FIRST
      if (data.data.is_duplicate) {
        stopPolling();
        Alert.alert(
          'Verification Failed',
          data.data.duplicate_error?.message || 
          'This ID document has already been used to create another account.',
          [
            {
              text: 'Contact Support',
              onPress: () => {
                // Open support or help
                Linking.openURL('mailto:support@fixmo.site');
              }
            },
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return; // STOP - Don't proceed
      }

      if (data.data.is_approved) {
        // ✅ Success! Proceed with registration
        stopPolling();
        navigation.navigate('CompleteRegistration', { 
          email,
          firstName,
          lastName,
          diditSessionId: sid 
        });
      } else if (data.data.is_declined) {
        // ❌ Normal decline (bad photo, expired ID, etc.)
        stopPolling();
        Alert.alert(
          'Verification Failed',
          data.data.decline_reasons?.join(', ') || 'Could not verify your identity.',
          [
            { text: 'Try Again', onPress: () => createSession() },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
      // is_pending: keep polling
    }
  } catch (err) {
    console.error('Status check error:', err);
  }
};
```

---

## Flow Diagram

```
User completes Didit verification
              ↓
    Frontend polls status API
              ↓
    ┌─────────┴──────────┐
    │ Backend checks:    │
    │ 1. Get Didit result│
    │ 2. Extract doc #   │
    │ 3. Check DB for    │
    │    duplicates      │
    └─────────┬──────────┘
              ↓
    ┌─────────┴──────────┐
    ↓                    ↓
Duplicate Found      No Duplicate
    ↓                    ↓
is_duplicate=true    is_approved=true
is_approved=false    is_duplicate=false
    ↓                    ↓
❌ BLOCKED           ✅ Proceed to
Show error           registration
```

---

## What Gets Stored

When a verification is approved (and not a duplicate), we store:

| Field | Source | Purpose |
|-------|--------|---------|
| `session_id` | Didit | Unique session identifier |
| `email` | User input | Link to registration |
| `document_number` | Didit extraction | **Duplicate detection key** |
| `document_type` | Didit | ID type (passport, ID card, etc.) |
| `first_name` | Didit | Name from document |
| `last_name` | Didit | Name from document |
| `date_of_birth` | Didit | DOB from document |
| `document_country` | Didit | Issuing country |
| `status` | System | pending/approved/declined |
| `verified_at` | System | Timestamp of approval |

---

## Security Notes

1. **Document numbers are stored securely** - Used only for duplicate detection
2. **Masked emails in errors** - Existing account emails are partially hidden (e.g., `jo***@gmail.com`)
3. **No sensitive data exposed** - Only the fact that a duplicate exists is revealed, not full details
4. **Indexes for performance** - Fast lookups even with many records

---

## Testing Duplicate Detection

1. Complete KYC verification with ID document A → Should succeed
2. Try to sign up again with the same ID document A → Should fail with duplicate error
3. Sign up with a different ID document B → Should succeed

---

## Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added `DiditVerification` model |
| `prisma/migrations/20251203_add_didit_verification/migration.sql` | SQL to create table |
| `src/controller/diditController.js` | Added duplicate detection logic |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Dec 3, 2025 | 1.1.0 | Added duplicate KYC document prevention |
| Dec 3, 2025 | 1.0.0 | Initial Didit integration |
