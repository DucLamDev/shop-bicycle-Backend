import express from 'express';
import Partner from '../models/Partner.js';
import Order from '../models/Order.js';

const router = express.Router();

// Verify affiliate token and get dashboard data
router.get('/dashboard/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const partner = await Partner.findOne({ token, isActive: true });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'CTV không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Get orders for this partner
    const orders = await Order.find({ partner: partner._id })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate statistics
    const stats = {
      totalOrders: partner.totalOrders,
      totalRevenue: partner.totalRevenue,
      totalCommissionEarned: partner.totalCommissionEarned,
      commissionPaid: partner.commissionPaid,
      commissionPending: partner.commissionPending,
      affiliateLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?ref=${partner.token}`,
      discountCode: partner.exclusiveDiscount?.code || null
    };

    // Monthly breakdown
    const now = new Date();
    const monthlyStats = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = await Order.find({
        partner: partner._id,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });

      const monthCommission = monthOrders.reduce((sum, o) => sum + (o.ctvCommission?.amount || 0), 0);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      monthlyStats.push({
        month: monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
        orders: monthOrders.length,
        revenue: monthRevenue,
        commission: monthCommission
      });
    }

    // Product category breakdown
    const categoryStats = {
      electric: { count: 0, commission: 0 },
      normal: { count: 0, commission: 0 },
      sport: { count: 0, commission: 0 }
    };

    for (const order of orders) {
      for (const item of order.items) {
        const category = item.product?.category || 'normal';
        const qty = item.quantity || 1;
        categoryStats[category] = categoryStats[category] || { count: 0, commission: 0 };
        categoryStats[category].count += qty;
        
        // Calculate commission per category
        if (category === 'electric') {
          categoryStats[category].commission += partner.ctvCommission.electricBike * qty;
        } else if (category === 'sport') {
          categoryStats[category].commission += partner.ctvCommission.sportBike * qty;
        } else {
          categoryStats[category].commission += partner.ctvCommission.normalBike * qty;
        }
      }
    }

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          token: partner.token,
          partnerType: partner.partnerType,
          ctvCommission: partner.ctvCommission,
          exclusiveDiscount: partner.exclusiveDiscount
        },
        stats,
        monthlyStats: monthlyStats.reverse(),
        categoryStats,
        recentOrders: orders.slice(0, 10).map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer?.name || 'Khách hàng',
          totalAmount: order.totalAmount,
          commission: order.ctvCommission?.amount || 0,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt
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

// Validate affiliate token (for tracking)
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const partner = await Partner.findOne({ token, isActive: true });
    if (!partner) {
      return res.json({
        success: false,
        valid: false
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        name: partner.name,
        discountCode: partner.exclusiveDiscount?.isActive ? partner.exclusiveDiscount.code : null,
        discountPercent: partner.exclusiveDiscount?.discountPercent || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get affiliate commission rates
router.get('/commission-rates', (req, res) => {
  res.json({
    success: true,
    data: {
      electric: { 
        name: '電動アシスト自転車 / Xe trợ lực điện',
        commission: 5000,
        currency: 'JPY'
      },
      normal: { 
        name: '普通自転車 / Xe đạp thường',
        commission: 1500,
        currency: 'JPY'
      },
      sport: { 
        name: 'スポーツ自転車 / Xe thể thao',
        commission: 2000,
        currency: 'JPY'
      }
    }
  });
});

// Request commission payout
router.post('/payout-request/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { amount, bankInfo } = req.body;
    
    const partner = await Partner.findOne({ token, isActive: true });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'CTV không tồn tại'
      });
    }

    if (amount > partner.commissionPending) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền yêu cầu vượt quá số dư khả dụng'
      });
    }

    // In production, this would create a payout request
    // For now, just return success
    res.json({
      success: true,
      message: 'Yêu cầu thanh toán đã được gửi',
      data: {
        requestedAmount: amount,
        pendingBalance: partner.commissionPending,
        bankInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
