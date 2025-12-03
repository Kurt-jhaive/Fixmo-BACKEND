import axios from 'axios';
import crypto from 'crypto';

/**
 * Didit API Service
 * Handles identity verification through Didit's KYC platform
 * 
 * Documentation: https://docs.didit.me/reference
 */

const DIDIT_API_BASE_URL = 'https://verification.didit.me/v2';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET;

// Axios instance for Didit API
const diditApi = axios.create({
    baseURL: DIDIT_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': DIDIT_API_KEY
    }
});

/**
 * Didit Verification Statuses
 */
export const DIDIT_STATUS = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    APPROVED: 'Approved',
    DECLINED: 'Declined',
    KYC_EXPIRED: 'Kyc Expired',
    IN_REVIEW: 'In Review',
    EXPIRED: 'Expired',
    ABANDONED: 'Abandoned'
};

/**
 * Create a verification session for a user
 * @param {Object} params - Session parameters
 * @param {string} params.userId - User ID (vendor_data)
 * @param {string} params.userType - 'customer' or 'provider'
 * @param {string} params.callbackUrl - URL to redirect after verification
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Session data with verification URL
 */
export const createVerificationSession = async ({
    userId,
    userType,
    callbackUrl,
    metadata = {}
}) => {
    try {
        if (!DIDIT_API_KEY) {
            throw new Error('DIDIT_API_KEY is not configured');
        }

        if (!DIDIT_WORKFLOW_ID) {
            throw new Error('DIDIT_WORKFLOW_ID is not configured');
        }

        const response = await diditApi.post('/session/', {
            workflow_id: DIDIT_WORKFLOW_ID,
            vendor_data: `${userType}_${userId}`, // e.g., "customer_123" or "provider_456"
            callback: callbackUrl,
            metadata: {
                user_type: userType,
                user_id: userId.toString(),
                ...metadata
            }
        });

        console.log(`✅ Didit verification session created for ${userType} ${userId}`);

        return {
            success: true,
            session_id: response.data.session_id,
            session_url: response.data.url,
            status: response.data.status || DIDIT_STATUS.NOT_STARTED
        };
    } catch (error) {
        console.error('❌ Error creating Didit verification session:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create verification session');
    }
};

/**
 * Retrieve verification session details
 * @param {string} sessionId - Didit session ID
 * @returns {Promise<Object>} Session details with decision
 */
export const getVerificationSession = async (sessionId) => {
    try {
        if (!DIDIT_API_KEY) {
            throw new Error('DIDIT_API_KEY is not configured');
        }

        const response = await diditApi.get(`/session/${sessionId}/decision/`);

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('❌ Error retrieving Didit session:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to retrieve verification session');
    }
};

/**
 * List all verification sessions
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of results per page
 * @param {number} params.offset - Offset for pagination
 * @param {string} params.status - Filter by status
 * @returns {Promise<Object>} List of sessions
 */
export const listVerificationSessions = async ({ limit = 20, offset = 0, status = null } = {}) => {
    try {
        if (!DIDIT_API_KEY) {
            throw new Error('DIDIT_API_KEY is not configured');
        }

        const params = { limit, offset };
        if (status) {
            params.status = status;
        }

        const response = await diditApi.get('/session/', { params });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('❌ Error listing Didit sessions:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to list verification sessions');
    }
};

/**
 * Delete a verification session
 * @param {string} sessionId - Didit session ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteVerificationSession = async (sessionId) => {
    try {
        if (!DIDIT_API_KEY) {
            throw new Error('DIDIT_API_KEY is not configured');
        }

        await diditApi.delete(`/session/${sessionId}/`);

        console.log(`✅ Didit session ${sessionId} deleted`);

        return {
            success: true,
            message: 'Session deleted successfully'
        };
    } catch (error) {
        console.error('❌ Error deleting Didit session:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to delete verification session');
    }
};

/**
 * Verify webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - X-Signature header
 * @param {string} timestamp - X-Timestamp header
 * @returns {boolean} Whether signature is valid
 */
export const verifyWebhookSignature = (rawBody, signature, timestamp) => {
    try {
        if (!DIDIT_WEBHOOK_SECRET) {
            console.warn('⚠️ DIDIT_WEBHOOK_SECRET not configured - skipping signature verification');
            return true; // Skip verification if secret not configured
        }

        if (!signature || !timestamp || !rawBody) {
            console.error('❌ Missing required webhook verification data');
            return false;
        }

        // Validate timestamp (within 5 minutes)
        const currentTime = Math.floor(Date.now() / 1000);
        const incomingTime = parseInt(timestamp, 10);
        if (Math.abs(currentTime - incomingTime) > 300) {
            console.error('❌ Webhook timestamp is stale');
            return false;
        }

        // Generate expected signature
        const hmac = crypto.createHmac('sha256', DIDIT_WEBHOOK_SECRET);
        const expectedSignature = hmac.update(rawBody).digest('hex');

        // Time-safe comparison
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        const providedBuffer = Buffer.from(signature, 'utf8');

        if (expectedBuffer.length !== providedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
        console.error('❌ Error verifying webhook signature:', error);
        return false;
    }
};

/**
 * Parse vendor_data to extract user type and ID
 * @param {string} vendorData - Format: "userType_userId"
 * @returns {Object} { userType, userId }
 */
export const parseVendorData = (vendorData) => {
    if (!vendorData) {
        return { userType: null, userId: null };
    }

    const parts = vendorData.split('_');
    if (parts.length < 2) {
        return { userType: null, userId: null };
    }

    return {
        userType: parts[0], // 'customer' or 'provider'
        userId: parseInt(parts.slice(1).join('_'), 10) // Handle IDs that might contain underscores
    };
};

/**
 * Map Didit status to Fixmo verification status
 * @param {string} diditStatus - Didit verification status
 * @returns {string} Fixmo verification status
 */
export const mapDiditStatusToFixmo = (diditStatus) => {
    switch (diditStatus) {
        case DIDIT_STATUS.APPROVED:
            return 'approved';
        case DIDIT_STATUS.DECLINED:
            return 'rejected';
        case DIDIT_STATUS.IN_PROGRESS:
        case DIDIT_STATUS.IN_REVIEW:
            return 'pending';
        case DIDIT_STATUS.EXPIRED:
        case DIDIT_STATUS.ABANDONED:
        case DIDIT_STATUS.KYC_EXPIRED:
            return 'expired';
        default:
            return 'pending';
    }
};

/**
 * Check if Didit is properly configured
 * @returns {Object} Configuration status
 */
export const checkDiditConfiguration = () => {
    const config = {
        apiKeyConfigured: !!DIDIT_API_KEY,
        workflowIdConfigured: !!DIDIT_WORKFLOW_ID,
        webhookSecretConfigured: !!DIDIT_WEBHOOK_SECRET,
        isFullyConfigured: !!DIDIT_API_KEY && !!DIDIT_WORKFLOW_ID
    };

    return config;
};

export default {
    createVerificationSession,
    getVerificationSession,
    listVerificationSessions,
    deleteVerificationSession,
    verifyWebhookSignature,
    parseVendorData,
    mapDiditStatusToFixmo,
    checkDiditConfiguration,
    DIDIT_STATUS
};
