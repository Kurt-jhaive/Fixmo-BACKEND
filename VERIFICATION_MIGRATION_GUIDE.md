# Verification System - Migration Guide

## Overview
This guide helps you apply the database schema changes for the new verification system.

## Step 1: Review Schema Changes

The following fields have been added to your Prisma schema:

### User Model (Customers)
```prisma
verification_status String       @default("pending") // pending, approved, rejected
rejection_reason  String?
verification_submitted_at DateTime?
verification_reviewed_at  DateTime?
```

### ServiceProviderDetails Model (Providers)
```prisma
verification_status     String           @default("pending") // pending, approved, rejected
rejection_reason        String?
verification_submitted_at DateTime?
verification_reviewed_at  DateTime?
```

## Step 2: Run Migration

Execute the following commands in your terminal:

```bash
# Generate and apply migration
npx prisma migrate dev --name add_verification_system

# Regenerate Prisma Client
npx prisma generate

# (Optional) Check migration status
npx prisma migrate status
```

## Step 3: Update Existing Records (Optional)

If you have existing users/providers, you may want to update their status:

```sql
-- Set existing verified users to 'approved' status
UPDATE "User" 
SET verification_status = 'approved', 
    verification_submitted_at = created_at,
    verification_reviewed_at = created_at
WHERE is_verified = true;

-- Set existing unverified users with IDs to 'pending'
UPDATE "User" 
SET verification_status = 'pending', 
    verification_submitted_at = created_at
WHERE is_verified = false AND valid_id IS NOT NULL;

-- Same for providers
UPDATE "ServiceProviderDetails" 
SET verification_status = 'approved',
    verification_submitted_at = created_at,
    verification_reviewed_at = created_at
WHERE "provider_isVerified" = true;

UPDATE "ServiceProviderDetails" 
SET verification_status = 'pending',
    verification_submitted_at = created_at
WHERE "provider_isVerified" = false AND provider_valid_id IS NOT NULL;
```

## Step 4: Test the Migration

Run a quick test to ensure the migration was successful:

```javascript
// test-verification-migration.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMigration() {
    try {
        // Test customer query
        const customer = await prisma.user.findFirst({
            select: {
                user_id: true,
                verification_status: true,
                rejection_reason: true
            }
        });
        console.log('✅ Customer schema updated:', customer);

        // Test provider query
        const provider = await prisma.serviceProviderDetails.findFirst({
            select: {
                provider_id: true,
                verification_status: true,
                rejection_reason: true
            }
        });
        console.log('✅ Provider schema updated:', provider);

        console.log('\n🎉 Migration successful! All fields are accessible.');
    } catch (error) {
        console.error('❌ Migration test failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testMigration();
```

Run the test:
```bash
node test-verification-migration.js
```

## Step 5: Restart Your Server

```bash
npm start
```

## Step 6: Verify API Endpoints

Test the new endpoints:

1. **Get Pending Verifications (Admin)**
   ```bash
   curl -X GET http://localhost:3000/api/verification/admin/pending?type=all \
     -H "Authorization: Bearer <admin_token>"
   ```

2. **Get Customer Status**
   ```bash
   curl -X GET http://localhost:3000/api/verification/customer/status \
     -H "Authorization: Bearer <customer_token>"
   ```

3. **Get Provider Status**
   ```bash
   curl -X GET http://localhost:3000/api/verification/provider/status \
     -H "Authorization: Bearer <provider_token>"
   ```

## Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution:** The migration was partially applied. Check existing columns:
```bash
npx prisma db pull
npx prisma migrate resolve --applied <migration_name>
```

### Issue: Prisma Client errors after migration
**Solution:** Regenerate the client:
```bash
npx prisma generate
rm -rf node_modules/.prisma
npm install
```

### Issue: Default values not working
**Solution:** Ensure Prisma schema has correct defaults:
```prisma
verification_status String @default("pending")
```

## Rollback (If Needed)

To rollback the migration:

```bash
# View migration history
npx prisma migrate resolve --rolled-back <migration_name>

# Or manually drop columns (PostgreSQL example)
ALTER TABLE "User" DROP COLUMN verification_status;
ALTER TABLE "User" DROP COLUMN rejection_reason;
ALTER TABLE "User" DROP COLUMN verification_submitted_at;
ALTER TABLE "User" DROP COLUMN verification_reviewed_at;

ALTER TABLE "ServiceProviderDetails" DROP COLUMN verification_status;
ALTER TABLE "ServiceProviderDetails" DROP COLUMN rejection_reason;
ALTER TABLE "ServiceProviderDetails" DROP COLUMN verification_submitted_at;
ALTER TABLE "ServiceProviderDetails" DROP COLUMN verification_reviewed_at;
```

## Success Checklist

- [ ] Schema updated in prisma/schema.prisma
- [ ] Migration created and applied
- [ ] Prisma Client regenerated
- [ ] Server restarts without errors
- [ ] Test queries return new fields
- [ ] API endpoints respond correctly
- [ ] Existing data preserved
- [ ] Email service configured

## Next Steps

1. Update your frontend to use the new verification endpoints
2. Configure email templates if needed
3. Test the complete workflow:
   - User submits verification
   - Admin reviews and rejects
   - User resubmits
   - Admin approves

---

For complete API documentation, see `VERIFICATION_SYSTEM_DOCUMENTATION.md`
