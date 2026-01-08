import express from 'express';
import { uploadImage, uploadProductImage, uploadStudentIdCard, uploadMultipleImages } from '../config/cloudinary.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload a single image to Cloudinary
 * @access  Private
 */
router.post('/image', protect, async (req, res) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    const result = await uploadImage(image, folder || 'hbike');

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

/**
 * @route   POST /api/upload/product-images
 * @desc    Upload multiple product images to Cloudinary
 * @access  Private (Admin only)
 */
router.post('/product-images', protect, adminOnly, async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Images array is required'
      });
    }

    // Filter out empty strings and existing URLs
    const imagesToUpload = images.filter(img => img && img.trim() !== '');
    
    const results = await Promise.all(
      imagesToUpload.map(async (img) => {
        // If it's already a URL, don't upload
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return { url: img, publicId: null };
        }
        return await uploadProductImage(img);
      })
    );

    res.json({
      success: true,
      data: {
        images: results.map(r => r.url),
        details: results
      }
    });
  } catch (error) {
    console.error('Product images upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload product images'
    });
  }
});

/**
 * @route   POST /api/upload/receipt
 * @desc    Upload payment receipt image to Cloudinary
 * @access  Public (for customer checkout)
 */
router.post('/receipt', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required'
      });
    }

    const result = await uploadImage(image, 'receipts');

    res.json({
      success: true,
      url: result.url,
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload receipt image'
    });
  }
});

/**
 * @route   POST /api/upload/student-id
 * @desc    Upload student ID card image to Cloudinary
 * @access  Public (for student verification)
 */
router.post('/student-id', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Student ID image is required'
      });
    }

    const result = await uploadStudentIdCard(image);

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    console.error('Student ID upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload student ID image'
    });
  }
});

export default router;
