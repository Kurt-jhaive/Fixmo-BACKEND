import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage configuration for service images with memory storage for Cloudinary
const serviceImageStorage = multer.memoryStorage(); // Use memory storage for Cloudinary processing

// File filter for service images (only images allowed)
const serviceImageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer upload configuration for service images
const uploadServiceImage = multer({
    storage: serviceImageStorage,
    fileFilter: serviceImageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Alternative simpler configuration for service images (without Sharp processing initially)
const serviceImageStorageSimple = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads/service-images/');
        console.log('Simple multer destination path:', uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = 'service_' + uniqueSuffix + (ext || '.jpg');
        console.log('Simple multer filename generated:', filename);
        cb(null, filename);
    }
});

// Simple upload without image processing
const uploadServiceImageSimple = multer({
    storage: serviceImageStorageSimple,
    fileFilter: serviceImageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to process and save service images as JPG
const processServiceImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'service_' + uniqueSuffix + '.jpg';
        const uploadPath = path.join(__dirname, '../../uploads/service-images/');
        const filePath = path.join(uploadPath, filename);

        console.log('Processing service image:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filename: filename,
            filePath: filePath
        });

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        // Process image with Sharp - convert to JPG and resize
        await sharp(req.file.buffer)
            .resize(800, 600, { 
                fit: 'cover', 
                position: 'center',
                withoutEnlargement: true // Don't enlarge smaller images
            })
            .jpeg({ 
                quality: 85,
                progressive: true
            })
            .toFile(filePath);

        // Add file information to req.file for the controller
        req.file.filename = filename;
        req.file.path = filePath;
        req.file.destination = uploadPath;

        console.log('Image processed successfully:', {
            filename: filename,
            path: filePath,
            size: req.file.size
        });

        next();
    } catch (error) {
        console.error('Error processing service image:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing image: ' + error.message
        });
    }
};

// Test function to verify upload directory is accessible
const testUploadDirectory = () => {
    try {
        const uploadPath = path.join(__dirname, '../../uploads/service-images/');
        
        // Check if directory exists
        if (!fs.existsSync(uploadPath)) {
            console.error('Upload directory does not exist:', uploadPath);
            // Try to create it
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log('Created upload directory:', uploadPath);
        }
        
        // Test write permissions
        const testFile = path.join(uploadPath, 'test.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Upload directory is writable:', uploadPath);
        
        return true;
    } catch (error) {
        console.error('Upload directory test failed:', error);
        return false;
    }
};

// Run test on module load
testUploadDirectory();

// Rating photo storage configuration - Use memory storage for Cloudinary
const ratingPhotoStorage = multer.memoryStorage();

// Rating photo file filter
const ratingPhotoFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed for rating photos!'), false);
    }
};

// Multer upload configuration for rating photos
const uploadRatingPhoto = multer({
    storage: ratingPhotoStorage,
    fileFilter: ratingPhotoFilter,
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB limit for rating photos
    }
});

// Multiple service photos storage configuration - Use memory storage for Cloudinary
const multipleServicePhotosStorage = multer.memoryStorage();

// Service photos file filter (max 5 photos)
const multipleServicePhotosFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed for service photos!'), false);
    }
};

// Multer upload configuration for multiple service photos
const uploadMultipleServicePhotos = multer({
    storage: multipleServicePhotosStorage,
    fileFilter: multipleServicePhotosFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per photo
        files: 5 // Maximum 5 photos
    }
});

const upload = multer({ dest: 'uploads/' }); // existing upload configuration

export { 
    upload, 
    uploadServiceImage, 
    uploadServiceImageSimple, 
    processServiceImage, 
    uploadRatingPhoto,
    uploadMultipleServicePhotos 
};
