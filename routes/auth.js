import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        partnerId: user.partnerId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('partnerId', 'name token partnerType')
      .select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .populate('partnerId', 'name token partnerType totalCommissionEarned')
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Get order stats for each user
    const Order = (await import('../models/Order.js')).default;
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const orders = await Order.find({ 'customer.email': user.email });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      return {
        ...user.toObject(),
        totalOrders,
        totalSpent
      };
    }));

    res.json({
      success: true,
      data: usersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single user by ID (admin only)
router.get('/users/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get order stats
    const Order = (await import('../models/Order.js')).default;
    const orders = await Order.find({ 'customer.email': user.email });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        totalOrders,
        totalSpent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new user (admin only)
router.post('/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { name, email, password, phone, role, partnerId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const userData = {
      name,
      email,
      password,
      phone,
      role: role || 'user',
      partnerId: partnerId || undefined
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        partnerId: user.partnerId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user (admin only)
router.put('/users/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { name, email, phone, role, partnerId, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.role = role || user.role;
    
    if (partnerId !== undefined) {
      user.partnerId = partnerId || undefined;
    }

    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        partnerId: user.partnerId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get partner dashboard (for logged-in partners)
router.get('/partner/dashboard', protect, async (req, res) => {
  try {
    if (!req.user.partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - partner account required'
      });
    }

    const Partner = (await import('../models/Partner.js')).default;
    const Order = (await import('../models/Order.js')).default;
    
    const partner = await Partner.findById(req.user.partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }
    
    // Get orders referred by this partner (using token)
    const orders = await Order.find({ 
      'referredBy.token': partner.token
    }).sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Monthly stats
    const monthlyStats = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      let monthCommission = 0;
      monthOrders.forEach(order => {
        if (order.items) {
          monthCommission += partner.calculateCommission(order.items);
        }
      });

      monthlyStats.push({
        month: `${monthStart.getMonth() + 1}月`,
        orders: monthOrders.length,
        revenue: monthRevenue,
        commission: monthCommission
      });
    }

    // Category stats
    const categoryStats = {
      electric: { count: 0, commission: 0 },
      normal: { count: 0, commission: 0 },
      sport: { count: 0, commission: 0 }
    };

    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const category = item.category || 'normal';
          const qty = item.quantity || 1;
          if (categoryStats[category]) {
            categoryStats[category].count += qty;
            if (category === 'electric') {
              categoryStats[category].commission += partner.ctvCommission.electricBike * qty;
            } else if (category === 'sport') {
              categoryStats[category].commission += partner.ctvCommission.sportBike * qty;
            } else {
              categoryStats[category].commission += partner.ctvCommission.normalBike * qty;
            }
          }
        });
      }
    });

    // Recent orders
    const recentOrders = orders.slice(0, 10).map(order => {
      const commission = order.items ? partner.calculateCommission(order.items) : 0;
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer?.name || 'N/A',
        totalAmount: order.totalAmount,
        commission,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        collaborator: {
          id: partner._id,
          name: partner.name,
          email: partner.email || req.user.email,
          commissionRate: {
            electricBike: partner.ctvCommission.electricBike,
            normalBike: partner.ctvCommission.normalBike,
            sportBike: partner.ctvCommission.sportBike
          }
        },
        stats: {
          totalOrders,
          totalRevenue,
          totalCommission: partner.totalCommissionEarned,
          paidCommission: partner.commissionPaid,
          pendingCommission: partner.commissionPending,
          referralCode: partner.token
        },
        monthlyStats,
        categoryStats,
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Keep old route for backward compatibility but redirect to partner route
router.get('/collaborator/dashboard', protect, async (req, res) => {
  try {
    if (!req.user.partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - partner account required'
      });
    }
    // Forward to partner dashboard
    return res.redirect('/api/auth/partner/dashboard');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
