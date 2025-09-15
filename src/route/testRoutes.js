import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

const router = express.Router();

// Memory storage for Cloudinary uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

/**
 * @swagger
 * /api/test/cloudinary-upload:
 *   post:
 *     summary: Test Cloudinary image upload
 *     tags: [Test]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: test_image
 *         type: file
 *         description: Test image to upload to Cloudinary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             message:
 *               type: string
 *             imageUrl:
 *               type: string
 *             uploadInfo:
 *               type: object
 *       400:
 *         description: No image provided
 *       500:
 *         description: Upload failed
 */
router.post('/cloudinary-upload', upload.single('test_image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        console.log('Test upload request:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(
            req.file.buffer,
            'fixmo/test-uploads',
            `test_${Date.now()}`
        );

        res.json({
            success: true,
            message: 'Image uploaded successfully to Cloudinary',
            imageUrl: imageUrl,
            uploadInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Cloudinary upload test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image to Cloudinary',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/test/message-attachment-upload:
 *   post:
 *     summary: Test message attachment upload to Cloudinary
 *     tags: [Test]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: attachment
 *         type: file
 *         description: Test attachment to upload to Cloudinary
 *     responses:
 *       200:
 *         description: Attachment uploaded successfully
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             message:
 *               type: string
 *             attachmentUrl:
 *               type: string
 *             uploadInfo:
 *               type: object
 *       400:
 *         description: No attachment provided
 *       500:
 *         description: Upload failed
 */
router.post('/message-attachment-upload', upload.single('attachment'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No attachment file provided'
            });
        }

        console.log('Test message attachment upload request:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Upload to Cloudinary
        const attachmentUrl = await uploadToCloudinary(
            req.file.buffer,
            'fixmo/message-attachments',
            `test_msg_attachment_${Date.now()}`
        );

        res.json({
            success: true,
            message: 'Message attachment uploaded successfully to Cloudinary',
            attachmentUrl: attachmentUrl,
            uploadInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                cloudinaryFolder: 'fixmo/message-attachments'
            }
        });

    } catch (error) {
        console.error('Cloudinary message attachment upload test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload message attachment to Cloudinary',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/test/cloudinary-status:
 *   get:
 *     summary: Check Cloudinary configuration status
 *     tags: [Test]
 *     responses:
 *       200:
 *         description: Cloudinary status
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             message:
 *               type: string
 *             cloudinaryConfig:
 *               type: object
 */
router.get('/cloudinary-status', async (req, res) => {
    try {
        const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
        const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
        const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;

        res.json({
            success: true,
            message: 'Cloudinary configuration status',
            cloudinaryConfig: {
                cloudName: hasCloudName ? 'configured' : 'missing',
                apiKey: hasApiKey ? 'configured' : 'missing',
                apiSecret: hasApiSecret ? 'configured' : 'missing',
                allConfigured: hasCloudName && hasApiKey && hasApiSecret
            }
        });

    } catch (error) {
        console.error('Cloudinary status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check Cloudinary status',
            error: error.message
        });
    }
});

export default router;
