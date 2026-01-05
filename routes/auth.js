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
    const { name, email, password, phone } = req.body;

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
      phone
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

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
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

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    
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

    const { name, email, password, phone, role, collaboratorInfo } = req.body;

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
      role: role || 'user'
    };

    if (role === 'collaborator' && collaboratorInfo) {
      userData.collaboratorInfo = collaboratorInfo;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        collaboratorInfo: user.collaboratorInfo,
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

    const { name, email, phone, role, collaboratorInfo, password } = req.body;

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

    if (password) {
      user.password = password;
    }

    if (role === 'collaborator' && collaboratorInfo) {
      user.collaboratorInfo = {
        ...user.collaboratorInfo,
        ...collaboratorInfo
      };
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
        collaboratorInfo: user.collaboratorInfo,
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

// Get collaborator dashboard (for logged-in collaborators)
router.get('/collaborator/dashboard', protect, async (req, res) => {
  try {
    if (req.user.role !== 'collaborator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - collaborator role required'
      });
    }

    const Order = (await import('../models/Order.js')).default;
    
    // Get orders referred by this collaborator
    const orders = await Order.find({ 
      'referredBy.collaboratorId': req.user._id 
    }).sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const collaboratorInfo = req.user.collaboratorInfo || {};
    const totalCommission = collaboratorInfo.totalCommission || 0;
    const paidCommission = collaboratorInfo.paidCommission || 0;
    const pendingCommission = collaboratorInfo.pendingCommission || 0;

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
      const monthCommission = monthOrders.reduce((sum, order) => sum + (order.collaboratorCommission || 0), 0);

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
            const rate = collaboratorInfo.commissionRate?.[`${category}Bike`] || 0;
            categoryStats[category].commission += rate * qty;
          }
        });
      }
    });

    // Recent orders
    const recentOrders = orders.slice(0, 10).map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer?.name || 'N/A',
      totalAmount: order.totalAmount,
      commission: order.collaboratorCommission || 0,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: {
        collaborator: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          commissionRate: collaboratorInfo.commissionRate || {
            electricBike: 5000,
            normalBike: 2000,
            sportBike: 3000
          }
        },
        stats: {
          totalOrders,
          totalRevenue,
          totalCommission,
          paidCommission,
          pendingCommission,
          referralCode: `CTV${req.user._id.toString().slice(-6).toUpperCase()}`
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

export default router;
