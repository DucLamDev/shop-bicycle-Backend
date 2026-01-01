import express from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import Partner from '../models/Partner.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: partners
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
    const partner = await Partner.findById(req.params.id);
    
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
