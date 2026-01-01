import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['customer', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    enum: ['User', 'Customer']
  },
  senderName: String,
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  fileUrl: String,
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  // Customer info (can be guest or registered)
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: String,
  // Session ID for guest users
  sessionId: {
    type: String,
    required: true
  },
  // Messages
  messages: [messageSchema],
  // Status
  status: {
    type: String,
    enum: ['active', 'closed', 'pending'],
    default: 'active'
  },
  // Last activity
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // Assigned admin
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Unread count for admin
  unreadCount: {
    type: Number,
    default: 0
  },
  // Tags for categorization
  tags: [String],
  // Notes from admin
  adminNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
chatSchema.index({ customerEmail: 1 });
chatSchema.index({ sessionId: 1 });
chatSchema.index({ status: 1, lastMessageAt: -1 });
chatSchema.index({ unreadCount: -1 });

export default mongoose.model('Chat', chatSchema);
