import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: String,
  email: String,
  phone: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: String,
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 5
  },
  // CTV Commission settings
  ctvCommission: {
    electricBike: { type: Number, default: 5000 }, // 5000 yen per electric bike
    normalBike: { type: Number, default: 1500 },   // 1500 yen per normal bike
    sportBike: { type: Number, default: 2000 }     // 2000 yen per sport bike
  },
  totalCommissionEarned: {
    type: Number,
    default: 0
  },
  commissionPaid: {
    type: Number,
    default: 0
  },
  commissionPending: {
    type: Number,
    default: 0
  },
  // Partner-exclusive discount code
  exclusiveDiscount: {
    code: { type: String, unique: true, sparse: true },
    discountPercent: { type: Number, default: 10 },
    maxUses: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    validUntil: Date
  },
  // Partner type
  partnerType: {
    type: String,
    enum: ['ctv', 'agency', 'affiliate'],
    default: 'ctv'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique discount code for partner
partnerSchema.methods.generateDiscountCode = function() {
  const prefix = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

// Calculate commission for an order
partnerSchema.methods.calculateCommission = function(orderItems) {
  let totalCommission = 0;
  for (const item of orderItems) {
    const category = item.category || 'normal';
    const qty = item.quantity || 1;
    if (category === 'electric') {
      totalCommission += this.ctvCommission.electricBike * qty;
    } else if (category === 'sport') {
      totalCommission += this.ctvCommission.sportBike * qty;
    } else {
      totalCommission += this.ctvCommission.normalBike * qty;
    }
  }
  return totalCommission;
};

partnerSchema.index({ token: 1 });
partnerSchema.index({ 'exclusiveDiscount.code': 1 });

export default mongoose.model('Partner', partnerSchema);
