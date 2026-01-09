import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    prefecture: String,
    postalCode: String
  },
  // Loyalty program
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  // Auto discount for returning customers
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 30
  },
  // Order history summary
  firstOrderDate: Date,
  lastOrderDate: Date,
  averageOrderValue: {
    type: Number,
    default: 0
  },
  // Customer appreciation
  isVIP: {
    type: Boolean,
    default: false
  },
  birthdayDiscount: {
    type: Number,
    default: 5
  },
  birthday: Date,
  notes: String,
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto calculate loyalty tier based on total orders and spent
  // Note: For returning customers, discount is now a flat 500 yen instead of percentage
  if (this.totalOrders >= 20 || this.totalSpent >= 100000000) {
    this.loyaltyTier = 'diamond';
    this.discountPercent = 0; // Flat discount applied separately
    this.isVIP = true;
  } else if (this.totalOrders >= 15 || this.totalSpent >= 70000000) {
    this.loyaltyTier = 'platinum';
    this.discountPercent = 0;
    this.isVIP = true;
  } else if (this.totalOrders >= 10 || this.totalSpent >= 50000000) {
    this.loyaltyTier = 'gold';
    this.discountPercent = 0;
  } else if (this.totalOrders >= 5 || this.totalSpent >= 25000000) {
    this.loyaltyTier = 'silver';
    this.discountPercent = 0;
  } else if (this.totalOrders >= 1) {
    // Returning customer (has at least 1 previous order)
    this.loyaltyTier = 'bronze';
    this.discountPercent = 0; // Flat 500 yen discount instead of percentage
  }
  
  // Calculate average order value
  if (this.totalOrders > 0) {
    this.averageOrderValue = Math.round(this.totalSpent / this.totalOrders);
  }
  
  // Calculate loyalty points (1 point per 10,000 VND spent)
  this.loyaltyPoints = Math.floor(this.totalSpent / 10000);
  
  next();
});

// Static method to get tier benefits
// Returning customers now get flat 500 yen discount per order instead of percentage
customerSchema.statics.getTierBenefits = function() {
  return {
    bronze: { discount: 500, discountType: 'flat', description: 'Giảm ¥500 cho đơn hàng tiếp theo' },
    silver: { discount: 500, discountType: 'flat', description: 'Giảm ¥500 + Freeship đơn từ ¥50,000' },
    gold: { discount: 500, discountType: 'flat', description: 'Giảm ¥500 + Freeship + Quà sinh nhật' },
    platinum: { discount: 500, discountType: 'flat', description: 'Giảm ¥500 + Freeship + Ưu tiên hỗ trợ' },
    diamond: { discount: 500, discountType: 'flat', description: 'Giảm ¥500 + Freeship + VIP Support + Sự kiện độc quyền' }
  };
};

customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ loyaltyTier: 1 });
customerSchema.index({ totalOrders: -1 });
customerSchema.index({ totalSpent: -1 });

export default mongoose.model('Customer', customerSchema);
