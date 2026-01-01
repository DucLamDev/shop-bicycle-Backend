import express from 'express';
import miniGameService from '../services/miniGameService.js';
import Coupon from '../models/Coupon.js';

const router = express.Router();

// Get wheel configuration
router.get('/wheel/config', (req, res) => {
  try {
    const config = miniGameService.getWheelConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Play spin wheel
router.post('/wheel/spin', async (req, res) => {
  try {
    const { playerId, email } = req.body;
    
    // Check if player already played today (optional rate limiting)
    // This could be enhanced with Redis or database check
    
    const result = await miniGameService.playSpinWheel(playerId);
    
    // If won a discount, create actual coupon in database
    if (result.coupon && result.prize.type !== 'none') {
      try {
        const coupon = new Coupon({
          code: result.coupon.code,
          description: `🎰 Mini Game: ${result.prize.nameVi}`,
          discountType: result.prize.type === 'freeship' ? 'fixed' : 'percentage',
          discountValue: result.prize.type === 'freeship' ? 10000 : result.prize.discount,
          minOrderAmount: 0,
          maxDiscountAmount: result.prize.type === 'freeship' ? 10000 : null,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          usageLimit: 1,
          isActive: true,
          applicableCategories: ['normal', 'electric', 'sport'],
          createdBy: null // System generated
        });
        await coupon.save();
      } catch (couponError) {
        console.error('Error saving game coupon:', couponError);
      }
    }
    
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

// Play scratch card
router.post('/scratch', async (req, res) => {
  try {
    const result = miniGameService.playScratchCard();
    
    // Create coupon if won
    if (result.code && result.prize.type !== 'none') {
      try {
        const coupon = new Coupon({
          code: result.code,
          description: `🎫 Scratch Card: ${result.prize.name}`,
          discountType: 'percentage',
          discountValue: result.prize.discount || 0,
          minOrderAmount: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          isActive: true,
          applicableCategories: ['normal', 'electric', 'sport'],
          createdBy: null
        });
        await coupon.save();
      } catch (couponError) {
        console.error('Error saving scratch coupon:', couponError);
      }
    }
    
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

// Generate restaurant coupon (called after purchase)
router.post('/restaurant-coupon', (req, res) => {
  try {
    const coupon = miniGameService.generateRestaurantCoupon();
    res.json({
      success: true,
      data: coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
