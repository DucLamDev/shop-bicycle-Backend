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
  
  // Auto calculate loyalty tier and discount based on total orders and spent
  if (this.totalOrders >= 20 || this.totalSpent >= 100000000) {
    this.loyaltyTier = 'diamond';
    this.discountPercent = 15;
    this.isVIP = true;
  } else if (this.totalOrders >= 15 || this.totalSpent >= 70000000) {
    this.loyaltyTier = 'platinum';
    this.discountPercent = 12;
    this.isVIP = true;
  } else if (this.totalOrders >= 10 || this.totalSpent >= 50000000) {
    this.loyaltyTier = 'gold';
    this.discountPercent = 10;
  } else if (this.totalOrders >= 5 || this.totalSpent >= 25000000) {
    this.loyaltyTier = 'silver';
    this.discountPercent = 7;
  } else if (this.totalOrders >= 2 || this.totalSpent >= 10000000) {
    this.loyaltyTier = 'bronze';
    this.discountPercent = 5;
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
customerSchema.statics.getTierBenefits = function() {
  return {
    bronze: { discount: 5, description: 'Giảm 5% cho đơn hàng tiếp theo' },
    silver: { discount: 7, description: 'Giảm 7% + Freeship đơn từ 5tr' },
    gold: { discount: 10, description: 'Giảm 10% + Freeship + Quà sinh nhật' },
    platinum: { discount: 12, description: 'Giảm 12% + Freeship + Ưu tiên hỗ trợ' },
    diamond: { discount: 15, description: 'Giảm 15% + Freeship + VIP Support + Sự kiện độc quyền' }
  };
};

customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ loyaltyTier: 1 });
customerSchema.index({ totalOrders: -1 });
customerSchema.index({ totalSpent: -1 });

export default mongoose.model('Customer', customerSchema);
