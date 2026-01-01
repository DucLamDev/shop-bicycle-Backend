import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['electricity', 'water', 'internet', 'rent', 'salary', 'insurance', 'maintenance', 'marketing', 'equipment', 'transport', 'tax', 'other']
  },
  categoryName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card'],
    default: 'cash'
  },
  receipt: {
    number: String,
    imageUrl: String
  },
  period: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    }
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDay: {
    type: Number,
    min: 1,
    max: 31
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidDate: Date,
  dueDate: Date,
  notes: String,
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

expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get category display names
expenseSchema.statics.getCategoryNames = function() {
  return {
    electricity: 'Tiền điện',
    water: 'Tiền nước',
    internet: 'Internet/Điện thoại',
    rent: 'Tiền thuê mặt bằng',
    salary: 'Lương nhân viên',
    insurance: 'Bảo hiểm',
    maintenance: 'Bảo trì/Sửa chữa',
    marketing: 'Quảng cáo/Marketing',
    equipment: 'Thiết bị/Dụng cụ',
    transport: 'Vận chuyển',
    tax: 'Thuế',
    other: 'Chi phí khác'
  };
};

expenseSchema.index({ category: 1, status: 1 });
expenseSchema.index({ 'period.year': 1, 'period.month': 1 });
expenseSchema.index({ createdAt: -1 });

export default mongoose.model('Expense', expenseSchema);
