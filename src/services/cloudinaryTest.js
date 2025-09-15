// Test file to verify Cloudinary integration
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../services/cloudinaryService.js';

/**
 * Test Cloudinary upload functionality
 * This is a utility function for testing purposes
 */
export const testCloudinaryUpload = async () => {
    try {
        console.log('Testing Cloudinary configuration...');
        
        // Test with a small buffer (1x1 pixel transparent PNG)
        const testBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0B, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const testUrl = await uploadToCloudinary(testBuffer, 'fixmo/test', 'test_upload');
        console.log('✅ Cloudinary upload test successful!');
        console.log('Test image URL:', testUrl);

        // Test extracting public ID
        const publicId = extractPublicId(testUrl);
        console.log('Extracted public ID:', publicId);

        // Clean up test image
        if (publicId) {
            await deleteFromCloudinary(publicId);
            console.log('✅ Test image cleaned up successfully');
        }

        return { success: true, url: testUrl };
    } catch (error) {
        console.error('❌ Cloudinary test failed:', error);
        return { success: false, error: error.message };
    }
};

// Export the test function
export default testCloudinaryUpload;
