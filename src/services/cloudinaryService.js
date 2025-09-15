import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';

config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcx1glkit',
    api_key: process.env.CLOUDINARY_API_KEY || '123879281443593',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'SSy_2EIulhzvVCKUmFkEtk_CPtY'
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} folder - Cloudinary folder name
 * @param {string} publicId - Optional public ID for the image
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadToCloudinary = async (fileBuffer, folder, publicId = null) => {
    try {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder: folder,
                resource_type: 'auto',
                quality: 'auto',
                fetch_format: 'auto'
            };

            if (publicId) {
                uploadOptions.public_id = publicId;
                uploadOptions.overwrite = true;
            }

            cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result.secure_url);
                    }
                }
            ).end(fileBuffer);
        });
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and version (if present)
    let pathAfterUpload = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version if present (starts with 'v' followed by numbers)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    return pathAfterUpload.replace(/\.[^/.]+$/, '');
};

export default cloudinary;
