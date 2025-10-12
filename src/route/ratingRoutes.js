import express from 'express';
import { 
    createRating, 
    createProviderRatingForCustomer,
    getProviderRatings, 
    getCustomerRatings, 
    getProviderRateableAppointments,
    getProviderGivenRatings,
    getCustomerReceivedRatings,
    updateRating, 
    deleteRating, 
    getRateableAppointments 
} from '../controller/ratingController.js';
import { uploadRatingPhoto } from '../middleware/multer.js';
import { requireAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Customer Rating Routes (For customers to rate providers)

// GET /api/ratings/rateable-appointments - Get appointments that customer can rate
router.get('/rateable-appointments', requireAuth('customer'), getRateableAppointments);

// POST /api/ratings/create - Create a new rating (Customer rates provider)
// Supports optional photo upload for review proof
router.post('/create', 
    requireAuth('customer'), 
    uploadRatingPhoto.single('rating_photo'), 
    createRating
);

// PUT /api/ratings/update/:ratingId - Update an existing rating
router.put('/update/:ratingId', 
    requireAuth('customer'), 
    uploadRatingPhoto.single('rating_photo'), 
    updateRating
);

// DELETE /api/ratings/delete/:ratingId - Delete a rating
router.delete('/delete/:ratingId', requireAuth('customer'), deleteRating);

// GET /api/ratings/customer/:customerId - Get all ratings made by a customer
router.get('/customer/:customerId', requireAuth('customer'), getCustomerRatings);

// Provider Rating Routes (For providers to view their ratings)

// GET /api/ratings/provider/:providerId - Get all ratings for a provider
router.get('/provider/:providerId', getProviderRatings);

// Provider Rating Customer Routes (For providers to rate customers)

// GET /api/ratings/provider/rateable-appointments - Get appointments that provider can rate (customers)
router.get('/provider/rateable-appointments', requireAuth('provider'), getProviderRateableAppointments);

// POST /api/ratings/provider/rate-customer - Create a new rating (Provider rates customer)
// Note: Providers can only provide rating value and optional comment (no photo upload)
router.post('/provider/rate-customer', 
    requireAuth('provider'), 
    createProviderRatingForCustomer
);

// GET /api/ratings/provider/given-ratings - Get all ratings given by provider (to customers)
router.get('/provider/given-ratings', requireAuth('provider'), getProviderGivenRatings);

// GET /api/ratings/customer/:customerId/received-ratings - Get all ratings received by customer (from providers)
router.get('/customer/:customerId/received-ratings', getCustomerReceivedRatings);

// Test Routes (For development and React Native testing)

// GET /api/ratings/test/customer-ratings - Get current customer's ratings
router.get('/test/customer-ratings', requireAuth('customer'), async (req, res) => {
    try {
        const customerId = req.userId;
        console.log('Fetching ratings for customer:', customerId);
        
        // Redirect to existing controller
        req.params.customerId = customerId;
        return getCustomerRatings(req, res);
    } catch (error) {
        console.error('Test customer ratings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer ratings',
            error: error.message
        });
    }
});

// POST /api/ratings/test/quick-rating - Quick rating creation for testing
router.post('/test/quick-rating', requireAuth('customer'), async (req, res) => {
    try {
        const { appointment_id, provider_id, rating_value, rating_comment } = req.body;
        
        console.log('Quick rating test:', {
            appointment_id,
            provider_id,
            rating_value,
            rating_comment,
            customer_id: req.userId
        });

        // Validate required fields
        if (!appointment_id || !provider_id || !rating_value) {
            return res.status(400).json({
                success: false,
                message: 'appointment_id, provider_id, and rating_value are required'
            });
        }

        // Redirect to existing controller
        return createRating(req, res);
    } catch (error) {
        console.error('Quick rating test error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating test rating',
            error: error.message
        });
    }
});

export default router;
