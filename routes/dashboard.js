import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate date range based on filter
    let days = 7;
    if (range === '24h') days = 1;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      totalRevenue,
      rangeOrders,
      rangeRevenue,
      monthOrders,
      monthRevenue,
      todayOrders,
      totalCustomers,
      totalPartners
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      // Count all orders except cancelled for total revenue
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // Orders in selected range
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      // Revenue in selected range
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ role: 'user' }),
      Partner.countDocuments()
    ]);

    const stats = {
      totalProducts,
      activeProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers,
      totalPartners,
      rangeStats: {
        orders: rangeOrders,
        revenue: rangeRevenue[0]?.total || 0
      },
      thisMonth: {
        orders: monthOrders,
        revenue: monthRevenue[0]?.total || 0
      },
      today: {
        orders: todayOrders
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/revenue', protect, authorize('admin'), async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    let days = 7;
    if (range === '24h') days = 1;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;
    else if (range === '365d') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates with zero values
    const filledData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = revenueData.find(item => item._id === dateStr);
      
      filledData.push({
        date: dateStr,
        revenue: existingData?.revenue || 0,
        orders: existingData?.orders || 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: filledData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/top-products', protect, authorize('admin'), async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
