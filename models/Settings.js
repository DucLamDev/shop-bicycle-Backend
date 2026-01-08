import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // General Settings
  siteName: {
    type: String,
    default: 'HBIKE Japan'
  },
  siteEmail: {
    type: String,
    default: 'contact@hbike.jp'
  },
  sitePhone: {
    type: String,
    default: '078-123-4567'
  },
  siteAddress: {
    type: String,
    default: '〒651-0077 神戸市中央区日暮通2-4-18-1F'
  },
  currency: {
    type: String,
    enum: ['JPY', 'VND', 'USD'],
    default: 'JPY'
  },
  language: {
    type: String,
    enum: ['ja', 'vi', 'en'],
    default: 'ja'
  },
  
  // Notification Settings
  notificationEmail: {
    type: Boolean,
    default: true
  },
  notificationSMS: {
    type: Boolean,
    default: false
  },
  orderNotificationEmail: {
    type: String,
    default: ''
  },
  
  // Backup Settings
  autoBackup: {
    type: Boolean,
    default: true
  },
  backupFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  lastBackupAt: {
    type: Date
  },
  
  // Appearance Settings
  primaryColor: {
    type: String,
    default: '#ef4444'
  },
  theme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark'
  },
  
  // SEO Settings
  metaTitle: {
    type: String,
    default: 'HBIKE Japan - 電動アシスト自転車専門店'
  },
  metaDescription: {
    type: String,
    default: '神戸・大阪で電動アシスト自転車をお探しなら、HBIKE Japanへ。中古・新品の電動自転車を豊富に取り揃えています。'
  },
  metaKeywords: {
    type: String,
    default: '電動自転車, 電動アシスト自転車, 中古自転車, 神戸, 大阪, xe đạp điện, xe đạp trợ lực'
  },
  
  // Business Settings
  taxRate: {
    type: Number,
    default: 10
  },
  shippingFreeThreshold: {
    type: Number,
    default: 50000
  },
  codFee: {
    type: Number,
    default: 500
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
