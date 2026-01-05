import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    minlength: 6
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  avatar: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'collaborator'],
    default: 'user'
  },
  collaboratorInfo: {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    },
    commissionRate: {
      electricBike: { type: Number, default: 5000 },
      normalBike: { type: Number, default: 2000 },
      sportBike: { type: Number, default: 3000 }
    },
    totalCommission: { type: Number, default: 0 },
    paidCommission: { type: Number, default: 0 },
    pendingCommission: { type: Number, default: 0 }
  },
  lastMiniGamePlayed: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    prefecture: String,
    postalCode: String,
    country: { type: String, default: 'Japan' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
