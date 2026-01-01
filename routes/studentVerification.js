import express from 'express';
import StudentVerification from '../models/StudentVerification.js';
import Partner from '../models/Partner.js';
import Coupon from '../models/Coupon.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Submit student verification request (public)
router.post('/submit', async (req, res) => {
  try {
    const { customerName, email, phone, schoolName, studentId, studentIdImage, additionalImage, partnerId } = req.body;

    // Check if email already has a pending or approved request
    const existingRequest = await StudentVerification.findOne({
      email,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được xác minh. Mã giảm giá: ' + existingRequest.discountCode
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu xác minh đang được xử lý. Vui lòng đợi.'
      });
    }

    // Verify partner exists if provided
    let partner = null;
    if (partnerId) {
      partner = await Partner.findById(partnerId);
    }

    const verification = await StudentVerification.create({
      customerName,
      email,
      phone,
      schoolName,
      studentId,
      studentIdImage,
      additionalImage,
      partnerId: partner?._id
    });

    res.status(201).json({
      success: true,
      message: 'Yêu cầu xác minh đã được gửi. Chúng tôi sẽ liên hệ trong 24 giờ.',
      data: {
        id: verification._id,
        status: verification.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check verification status by email (public)
router.get('/status/:email', async (req, res) => {
  try {
    const verification = await StudentVerification.findOne({
      email: req.params.email.toLowerCase()
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu xác minh'
      });
    }

    res.json({
      success: true,
      data: {
        status: verification.status,
        discountCode: verification.status === 'approved' ? verification.discountCode : null,
        discountPercent: verification.discountPercent,
        discountExpiresAt: verification.discountExpiresAt,
        discountUsed: verification.discountUsed
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all verification requests (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const verifications = await StudentVerification.find(query)
      .populate('partnerId', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await StudentVerification.countDocuments(query);

    res.json({
      success: true,
      data: verifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single verification (admin)
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await StudentVerification.findById(req.params.id)
      .populate('partnerId', 'name')
      .populate('reviewedBy', 'name');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu xác minh'
      });
    }

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve verification (admin)
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { discountPercent = 10, validDays = 30, adminNotes } = req.body;

    const verification = await StudentVerification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu xác minh'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    // Generate unique discount code
    const discountCode = verification.generateDiscountCode();
    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    // Create a coupon for this student
    await Coupon.create({
      code: discountCode,
      description: `Mã giảm giá sinh viên - ${verification.customerName}`,
      discountType: 'percentage',
      discountValue: discountPercent,
      startDate: new Date(),
      endDate: expiresAt,
      usageLimit: 1,
      usedCount: 0,
      isActive: true
    });

    // Update verification
    verification.status = 'approved';
    verification.discountCode = discountCode;
    verification.discountPercent = discountPercent;
    verification.discountExpiresAt = expiresAt;
    verification.adminNotes = adminNotes;
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user._id;
    await verification.save();

    res.json({
      success: true,
      message: 'Đã phê duyệt và tạo mã giảm giá',
      data: {
        discountCode,
        discountPercent,
        expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reject verification (admin)
router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const verification = await StudentVerification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu xác minh'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    verification.status = 'rejected';
    verification.adminNotes = adminNotes;
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user._id;
    await verification.save();

    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu xác minh'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get statistics (admin)
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await StudentVerification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
