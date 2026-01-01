import mongoose from 'mongoose';

const importSchema = new mongoose.Schema({
  importNumber: {
    type: String,
    required: true,
    unique: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  supplier: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  otherCosts: {
    type: Number,
    default: 0
  },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'received', 'cancelled'],
    default: 'pending'
  },
  receivedDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

importSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Calculate profit per unit
  this.profit = this.sellingPrice - this.costPrice;
  // Calculate profit margin percentage
  this.profitMargin = this.costPrice > 0 ? ((this.profit / this.costPrice) * 100).toFixed(2) : 0;
  // Calculate total cost
  this.totalCost = (this.costPrice * this.quantity) + this.shippingCost + this.otherCosts;
  next();
});

const generateImportNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `IMP${timestamp}${random}`;
};

importSchema.statics.generateImportNumber = generateImportNumber;

importSchema.index({ product: 1, status: 1 });
importSchema.index({ createdAt: -1 });

export default mongoose.model('Import', importSchema);
