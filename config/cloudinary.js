import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadImage(base64Image, folder = 'hbike') {
  try {
    // If it's already a URL (starts with http), return it as-is
    if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
      return { url: base64Image, publicId: null };
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Max size
        { quality: 'auto:good' }, // Auto quality
        { fetch_format: 'auto' } // Auto format (webp, etc.)
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param {string[]} base64Images - Array of base64 encoded image strings
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
export async function uploadMultipleImages(base64Images, folder = 'hbike') {
  const uploadPromises = base64Images.map(image => uploadImage(image, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<boolean>}
 */
export async function deleteImage(publicId) {
  try {
    if (!publicId) return true;
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

/**
 * Upload student ID card image
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadStudentIdCard(base64Image) {
  return uploadImage(base64Image, 'hbike/student-ids');
}

/**
 * Upload product image
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadProductImage(base64Image) {
  return uploadImage(base64Image, 'hbike/products');
}

export default {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  uploadStudentIdCard,
  uploadProductImage,
  cloudinary
};
