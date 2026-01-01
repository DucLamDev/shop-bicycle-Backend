import express from 'express';
import Coupon from '../models/Coupon.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all coupons (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Validate coupon (public)
router.post('/validate', async (req, res) => {
  try {
    const { code, orderAmount, categories } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Mã khuyến mãi không tồn tại' });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã hết hạn hoặc đã hết lượt sử dụng' });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Đơn hàng tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}₫ để áp dụng mã này` 
      });
    }

    // Check category restrictions
    if (coupon.applicableCategories.length > 0 && categories) {
      const hasValidCategory = categories.some(cat => 
        coupon.applicableCategories.includes(cat)
      );
      if (!hasValidCategory) {
        return res.status(400).json({ 
          success: false, 
          message: 'Mã khuyến mãi không áp dụng cho sản phẩm trong giỏ hàng' 
        });
      }
    }

    const discount = coupon.calculateDiscount(orderAmount);

    res.json({ 
      success: true, 
      data: {
        code: coupon.code,
        discount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create coupon (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      createdBy: req.user.id
    };

    const coupon = await Coupon.create(couponData);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã tồn tại' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update coupon (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi' });
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete coupon (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi' });
    }

    res.json({ success: true, message: 'Đã xóa mã khuyến mãi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Apply coupon to order (increment usage count)
router.post('/:id/apply', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi' });
    }

    coupon.usedCount += 1;
    await coupon.save();

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
