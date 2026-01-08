import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      prefecture: String,
      postalCode: String
    }
  },
  // Link to Customer model for loyalty tracking
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 },
    // Selected options for this item
    selectedBattery: {
      type: String,
      enum: ['lithium_basic', 'lithium_standard', 'lithium_premium', 'lead_acid'],
      default: 'lithium_basic'
    },
    selectedCondition: {
      type: String,
      enum: ['new', 'used'],
      default: 'used'
    },
    batteryPriceAdjustment: { type: Number, default: 0 },
    conditionPriceAdjustment: { type: Number, default: 0 }
  }],
  // Subtotal before discounts and fees
  subtotal: {
    type: Number,
    default: 0
  },
  // Loyalty discount for returning customers
  loyaltyDiscount: {
    percent: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  // Coupon discount
  couponDiscount: {
    code: String,
    percent: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  // Shipping method details
  shippingMethod: {
    type: {
      type: String,
      enum: ['pickup', 'free_delivery', 'zone_1', 'zone_2', 'postal'],
      default: 'free_delivery'
    },
    distanceKm: Number,
    description: String,
    estimatedDays: Number
  },
  // Restaurant coupon given with purchase
  restaurantCoupon: {
    code: String,
    discount: Number,
    discountAmount: Number,
    restaurant: String,
    validUntil: Date
  },
  // CTV commission for this order
  ctvCommission: {
    amount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidAt: Date
  },
  // COD fee (extra fee for cash on delivery)
  codFee: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cod', 'visa_card'],
    required: true
  },
  // Bank transfer details
  bankTransferInfo: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    transferContent: String,
    transferredAt: Date,
    verified: { type: Boolean, default: false },
    receiptImage: String // URL of the transfer receipt/bill image uploaded by customer
  },
  // Visa card payment details
  visaCardInfo: {
    last4Digits: String,
    transactionId: String,
    paidAt: Date,
    receiptImage: String // URL of the payment receipt/bill image uploaded by customer
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Delivery time preference
  deliveryPreference: {
    preferredDate: Date,
    preferredTimeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime'],
      default: 'anytime'
    },
    // Specific time range
    timeFrom: String, // e.g., "09:00"
    timeTo: String,   // e.g., "12:00"
    specialInstructions: String
  },
  // Actual delivery info
  deliveryInfo: {
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveryPerson: String,
    deliveryPhone: String,
    trackingNumber: String
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  notes: String,
  // Invoice info for PDF generation
  invoiceNumber: String,
  invoiceGeneratedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Order', orderSchema);
