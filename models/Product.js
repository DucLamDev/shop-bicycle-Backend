import mongoose from 'mongoose';

// Product variant schema for flexible options (like phone storage options)
const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nameJa: String, // Japanese name
  nameEn: String, // English name  
  sku: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    default: 1
  },
  batteryType: {
    type: String,
    enum: ['lithium_basic', 'lithium_standard', 'lithium_premium', 'lead_acid'],
    default: 'lithium_basic'
  },
  batteryCapacity: String, // e.g., "36V 10Ah", "48V 15Ah"
  batteryRange: Number, // km
  condition: {
    type: String,
    enum: ['new', 'used'],
    default: 'used'
  },
  conditionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameJa: { // Japanese product name
    type: String,
    trim: true
  },
  nameEn: { // English product name
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    enum: ['Yamaha', 'Panasonic', 'Bridgestone', 'Other']
  },
  category: {
    type: String,
    required: true,
    enum: ['normal', 'electric', 'sport']
  },
  // Base price in JPY (lowest variant price)
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Cost price for profit calculation
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  // Profit per unit
  profit: {
    type: Number,
    default: 0
  },
  // Currency (default JPY)
  currency: {
    type: String,
    enum: ['JPY', 'VND', 'USD'],
    default: 'JPY'
  },
  condition: {
    type: String,
    enum: ['new', 'used'],
    default: 'used'
  },
  conditionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  // Product variants (different battery/condition combinations with different prices)
  variants: [variantSchema],
  // Legacy battery options (for backward compatibility)
  batteryOptions: [{
    type: {
      type: String,
      enum: ['lithium_basic', 'lithium_standard', 'lithium_premium', 'lead_acid'],
      default: 'lithium_basic'
    },
    name: String,
    capacity: String, // e.g., "36V 10Ah"
    range: Number, // km
    priceAdjustment: { type: Number, default: 0 }, // Additional price for this battery
    inStock: { type: Boolean, default: true }
  }],
  // Condition pricing (new vs used)
  conditionPricing: {
    newConditionPrice: { type: Number, default: 0 }, // Price for new condition
    usedConditionPrice: { type: Number, default: 0 }, // Price for used condition (base price)
    newConditionAvailable: { type: Boolean, default: false },
    usedConditionAvailable: { type: Boolean, default: true }
  },
  specifications: {
    batteryType: String,
    rangeKm: Number,
    motorPower: String,
    frameSize: String,
    weight: Number,
    color: String
  },
  replacedParts: [{
    type: String
  }],
  warranty: {
    battery: { type: Number, default: 3 },
    motor: { type: Number, default: 3 },
    discountPercent: { type: Number, default: 10 }
  },
  images: [{
    type: String
  }],
  description: {
    vi: String,
    en: String,
    ja: String,
    zh: String
  },
  stock: {
    type: Number,
    default: 1
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'reserved'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1 });

export default mongoose.model('Product', productSchema);
