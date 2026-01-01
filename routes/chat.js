import express from 'express';
import Chat from '../models/Chat.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get or create chat session for customer
router.post('/session', async (req, res) => {
  try {
    const { sessionId, customerEmail, customerName, customerPhone } = req.body;

    let chat = await Chat.findOne({ sessionId, status: { $ne: 'closed' } });

    if (!chat) {
      chat = await Chat.create({
        sessionId,
        customerEmail,
        customerName,
        customerPhone,
        messages: []
      });
    }

    res.json({
      success: true,
      data: {
        chatId: chat._id,
        messages: chat.messages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send message from customer
router.post('/:chatId/message', async (req, res) => {
  try {
    const { content, senderName, type = 'text', fileUrl } = req.body;

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    const message = {
      sender: 'customer',
      senderName,
      content,
      type,
      fileUrl,
      createdAt: new Date()
    };

    chat.messages.push(message);
    chat.lastMessageAt = new Date();
    chat.unreadCount += 1;
    await chat.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('newMessage', {
        chatId: chat._id,
        message: chat.messages[chat.messages.length - 1]
      });
    }

    res.json({
      success: true,
      data: chat.messages[chat.messages.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all chats (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const chats = await Chat.find(query)
      .populate('assignedTo', 'name')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Chat.countDocuments(query);
    const unreadTotal = await Chat.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$unreadCount' } } }
    ]);

    res.json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadTotal: unreadTotal[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single chat (admin)
router.get('/:chatId', protect, authorize('admin'), async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('assignedTo', 'name');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Mark messages as read
    chat.messages.forEach(msg => {
      if (msg.sender === 'customer' && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
      }
    });
    chat.unreadCount = 0;
    await chat.save();

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send message from admin
router.post('/:chatId/admin-message', protect, authorize('admin'), async (req, res) => {
  try {
    const { content, type = 'text', fileUrl } = req.body;

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const message = {
      sender: 'admin',
      senderId: req.user._id,
      senderModel: 'User',
      senderName: req.user.name || 'Admin',
      content,
      type,
      fileUrl,
      read: true,
      createdAt: new Date()
    };

    chat.messages.push(message);
    chat.lastMessageAt = new Date();
    chat.assignedTo = req.user._id;
    await chat.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${chat._id}`).emit('newMessage', {
        chatId: chat._id,
        message: chat.messages[chat.messages.length - 1]
      });
    }

    res.json({
      success: true,
      data: chat.messages[chat.messages.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Close chat (admin)
router.put('/:chatId/close', protect, authorize('admin'), async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { status: 'closed' },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat closed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get unread count (admin)
router.get('/stats/unread', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await Chat.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$unreadCount' }, chats: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        unreadMessages: result[0]?.total || 0,
        activeChats: result[0]?.chats || 0
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
