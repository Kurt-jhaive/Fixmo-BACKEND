import express from 'express';

const router = express.Router();

// Simple test route without parameters
router.get('/test', (req, res) => {
    res.json({ message: 'Test route working' });
});

export default router;
