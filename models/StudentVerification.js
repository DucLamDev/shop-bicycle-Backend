import mongoose from 'mongoose';

const studentVerificationSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  schoolName: {
    type: String,
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  // Image of student ID card
  studentIdImage: {
    type: String,
    required: true
  },
  // Additional image (optional)
  additionalImage: {
    type: String
  },
  // Partner school reference
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  // Verification status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Discount code generated upon approval
  discountCode: {
    type: String
  },
  discountPercent: {
    type: Number,
    default: 10
  },
  // Admin notes
  adminNotes: {
    type: String
  },
  // Review date
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Expiry date for discount code
  discountExpiresAt: {
    type: Date
  },
  // Usage tracking
  discountUsed: {
    type: Boolean,
    default: false
  },
  discountUsedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique discount code
studentVerificationSchema.methods.generateDiscountCode = function() {
  const prefix = 'STU';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// Index for faster queries
studentVerificationSchema.index({ email: 1 });
studentVerificationSchema.index({ status: 1, createdAt: -1 });
studentVerificationSchema.index({ discountCode: 1 });

export default mongoose.model('StudentVerification', studentVerificationSchema);
