import express from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all customers
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { tier, isVIP, search, sortBy = 'totalSpent', page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (tier) query.loyaltyTier = tier;
    if (isVIP === 'true') query.isVIP = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    switch (sortBy) {
      case 'totalOrders':
        sortOption = { totalOrders: -1 };
        break;
      case 'totalSpent':
        sortOption = { totalSpent: -1 };
        break;
      case 'lastOrder':
        sortOption = { lastOrderDate: -1 };
        break;
      case 'name':
        sortOption = { name: 1 };
        break;
      default:
        sortOption = { totalSpent: -1 };
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get top customers (for customer appreciation)
router.get('/top', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 10, by = 'totalSpent' } = req.query;
    
    let sortOption = {};
    switch (by) {
      case 'orders':
        sortOption = { totalOrders: -1 };
        break;
      case 'spent':
      default:
        sortOption = { totalSpent: -1 };
    }

    const topCustomers = await Customer.find()
      .sort(sortOption)
      .limit(Number(limit));

    res.json({
      success: true,
      data: topCustomers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get customer statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalCustomers,
      byTier,
      vipCount,
      newThisMonth,
      topSpenders
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.aggregate([
        { $group: { _id: '$loyaltyTier', count: { $sum: 1 }, totalSpent: { $sum: '$totalSpent' } } },
        { $sort: { totalSpent: -1 } }
      ]),
      Customer.countDocuments({ isVIP: true }),
      Customer.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }),
      Customer.find().sort({ totalSpent: -1 }).limit(5)
    ]);

    const tierBenefits = Customer.getTierBenefits();

    res.json({
      success: true,
      data: {
        totalCustomers,
        vipCount,
        newThisMonth,
        byTier: byTier.map(tier => ({
          ...tier,
          benefits: tierBenefits[tier._id]
        })),
        topSpenders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get customer by ID with order history
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    // Get order history
    const orders = await Order.find({ 'customer.email': customer.email })
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .limit(10);

    const tierBenefits = Customer.getTierBenefits();

    res.json({
      success: true,
      data: {
        customer,
        orders,
        tierBenefits: tierBenefits[customer.loyaltyTier]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get customer discount by email (for checkout)
router.post('/check-discount', async (req, res) => {
  try {
    const { email, phone } = req.body;
    
    let customer = await Customer.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone }
      ]
    });

    if (!customer) {
      return res.json({
        success: true,
        data: {
          isNewCustomer: true,
          discount: 0,
          tier: null,
          message: 'Khách hàng mới'
        }
      });
    }

    const tierBenefits = Customer.getTierBenefits();

    // Returning customers get flat 500 yen discount
    const flatDiscount = 500;
    const tierBenefit = tierBenefits[customer.loyaltyTier];

    res.json({
      success: true,
      data: {
        isNewCustomer: false,
        discount: flatDiscount, // Flat 500 yen discount
        discountType: 'flat', // 'flat' instead of 'percent'
        tier: customer.loyaltyTier,
        tierName: customer.loyaltyTier.charAt(0).toUpperCase() + customer.loyaltyTier.slice(1),
        totalOrders: customer.totalOrders,
        loyaltyPoints: customer.loyaltyPoints,
        benefits: tierBenefit,
        message: `Khách hàng ${customer.loyaltyTier.toUpperCase()} - Giảm ¥500`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create or update customer from order
router.post('/from-order', async (req, res) => {
  try {
    const { name, email, phone, address, orderAmount } = req.body;
    
    let customer = await Customer.findOne({ email: email.toLowerCase() });
    
    if (customer) {
      // Update existing customer
      customer.totalOrders += 1;
      customer.totalSpent += orderAmount;
      customer.lastOrderDate = new Date();
      if (!customer.firstOrderDate) {
        customer.firstOrderDate = new Date();
      }
      // Update address if provided
      if (address) {
        customer.address = address;
      }
      await customer.save();
    } else {
      // Create new customer
      customer = await Customer.create({
        name,
        email: email.toLowerCase(),
        phone,
        address,
        totalOrders: 1,
        totalSpent: orderAmount,
        firstOrderDate: new Date(),
        lastOrderDate: new Date()
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update customer
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add note/tag to customer
router.post('/:id/tags', protect, authorize('admin'), async (req, res) => {
  try {
    const { tags } = req.body;
    
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { tags: { $each: tags } } },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get customers for appreciation (birthdays this month, VIPs, etc.)
router.get('/appreciation/list', protect, authorize('admin'), async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    
    const [
      birthdayCustomers,
      vipCustomers,
      inactiveVIPs,
      topBuyers
    ] = await Promise.all([
      // Customers with birthday this month
      Customer.find({
        $expr: { $eq: [{ $month: '$birthday' }, currentMonth] }
      }).limit(20),
      // VIP customers
      Customer.find({ isVIP: true }).sort({ totalSpent: -1 }).limit(20),
      // VIPs who haven't ordered in 3 months
      Customer.find({
        isVIP: true,
        lastOrderDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).limit(10),
      // Top 10 buyers all time
      Customer.find().sort({ totalOrders: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        birthdayCustomers,
        vipCustomers,
        inactiveVIPs,
        topBuyers
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
