import express from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import Partner from '../models/Partner.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const partners = await Partner.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
    
    // Import Order model to get stats for each partner
    const Order = (await import('../models/Order.js')).default;
    
    // Get stats for each partner
    const partnersWithStats = await Promise.all(partners.map(async (partner) => {
      const partnerOrders = await Order.find({ partner: partner._id });
      
      const totalOrders = partnerOrders.length;
      const totalSales = partnerOrders
        .filter(o => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalCommissionEarned = partnerOrders
        .filter(o => o.orderStatus === 'delivered')
        .reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);
      const commissionPaid = partnerOrders
        .filter(o => o.ctvCommission?.paid)
        .reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);
      const commissionPending = totalCommissionEarned - commissionPaid;
      
      return {
        ...partner.toObject(),
        totalOrders,
        totalSales,
        totalCommissionEarned,
        commissionPaid,
        commissionPending
      };
    }));
    
    res.json({
      success: true,
      data: partnersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, contactPerson, email, phone, commissionRate, partnerType, ctvCommission } = req.body;

    // Generate unique token for affiliate link
    const token = req.body.token || `ctv_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 10)}_${crypto.randomBytes(4).toString('hex')}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const partnerUrl = `${frontendUrl}?ref=${token}`;
    
    const qrCode = await QRCode.toDataURL(partnerUrl);

    const partner = await Partner.create({
      name,
      contactPerson,
      email,
      phone,
      commissionRate,
      partnerType: partnerType || 'ctv',
      ctvCommission: ctvCommission || {
        electricBike: 5000,
        normalBike: 1500,
        sportBike: 2000
      },
      token,
      qrCode
    });

    // Generate discount code for partner
    partner.exclusiveDiscount = {
      code: partner.generateDiscountCode(),
      discountPercent: 5,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
    await partner.save();

    res.status(201).json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
      .populate('userId', 'name email role');
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create user account for partner
router.post('/:id/create-account', protect, authorize('admin'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    if (partner.userId) {
      return res.status(400).json({
        success: false,
        message: 'Partner already has a user account'
      });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Import User model
    const User = (await import('../models/User.js')).default;

    // Check if email already exists
    if (partner.email) {
      const existingUser = await User.findOne({ email: partner.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Create user account
    const user = await User.create({
      name: partner.name,
      email: partner.email || `partner_${partner._id}@temp.com`,
      password: password,
      phone: partner.phone,
      role: 'user',
      partnerId: partner._id
    });

    // Link partner to user
    partner.userId = user._id;
    await partner.save();

    const populatedPartner = await Partner.findById(partner._id)
      .populate('userId', 'name email role');

    res.json({
      success: true,
      data: populatedPartner,
      message: 'User account created and linked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get partner stats (for partner dashboard)
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Get orders from this partner
    const partnerOrders = await Order.find({ partner: partner._id });
    
    // Calculate stats
    const totalOrders = partnerOrders.length;
    const completedOrders = partnerOrders.filter(o => o.orderStatus === 'delivered').length;
    const totalRevenue = partnerOrders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // Calculate commission earned
    const totalCommission = partnerOrders
      .filter(o => o.orderStatus === 'delivered')
      .reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);
    
    const paidCommission = partnerOrders
      .filter(o => o.ctvCommission?.paid)
      .reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);

    // Get this month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthOrders = partnerOrders.filter(o => new Date(o.createdAt) >= startOfMonth);
    const thisMonthRevenue = thisMonthOrders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const thisMonthCommission = thisMonthOrders
      .filter(o => o.orderStatus === 'delivered')
      .reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);

    // Recent orders
    const recentOrders = await Order.find({ partner: partner._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('items.product', 'name');

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        totalRevenue,
        totalCommission,
        paidCommission,
        unpaidCommission: totalCommission - paidCommission,
        thisMonth: {
          orders: thisMonthOrders.length,
          revenue: thisMonthRevenue,
          commission: thisMonthCommission
        },
        recentOrders: recentOrders.map(o => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          customer: o.customer?.name,
          totalAmount: o.totalAmount,
          commission: o.ctvCommission?.amount || 0,
          status: o.orderStatus,
          createdAt: o.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:id/regenerate-qr', protect, authorize('admin'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const newToken = crypto.randomBytes(16).toString('hex');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const partnerUrl = `${frontendUrl}?partner=${newToken}`;
    const qrCode = await QRCode.toDataURL(partnerUrl);

    partner.token = newToken;
    partner.qrCode = qrCode;
    await partner.save();

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
