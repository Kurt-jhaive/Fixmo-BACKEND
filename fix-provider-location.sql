-- Fix Provider Location (Provider ID: 4 - Lebron James)
-- Current wrong location: 45.544587928546573,111.01319797415245 (Mongolia/China)
-- 
-- To fix this, the provider needs to:
-- 1. Open their provider app
-- 2. Go to Profile/Settings
-- 3. Update their location/address
-- 4. Make sure to allow location permissions
--
-- OR you can manually update in the database:

-- Example: Update to Manila coordinates (14.5995, 120.9842)
-- UPDATE "ServiceProviderDetails" 
-- SET provider_exact_location = '14.5995,120.9842'
-- WHERE provider_id = 4;

-- Example: Update to Makati coordinates (14.5547, 121.0244)
-- UPDATE "ServiceProviderDetails" 
-- SET provider_exact_location = '14.5547,121.0244'
-- WHERE provider_id = 4;

-- To check current provider locations:
SELECT 
    provider_id,
    provider_first_name,
    provider_last_name,
    provider_location,
    provider_exact_location,
    CASE 
        WHEN provider_exact_location IS NULL THEN '❌ No location set'
        WHEN provider_exact_location LIKE '14.%,120.%' OR 
             provider_exact_location LIKE '14.%,121.%' THEN '✅ Philippines coordinates'
        ELSE '⚠️ Coordinates outside Philippines!'
    END as location_status
FROM "ServiceProviderDetails"
ORDER BY provider_id;

-- To find providers with invalid Philippines coordinates:
SELECT 
    provider_id,
    provider_first_name || ' ' || provider_last_name as name,
    provider_exact_location
FROM "ServiceProviderDetails"
WHERE provider_exact_location IS NOT NULL
  AND NOT (
    provider_exact_location ~ '^(1[4-9]|[4-9]|2[0-2])\.' 
    AND provider_exact_location ~ ',(11[5-9]|12[0-8])\.'
  );
