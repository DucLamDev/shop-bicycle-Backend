import mongoose from 'mongoose';
import crypto from 'crypto';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Partner from '../models/Partner.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  await User.deleteMany({});
  
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@hbikejapan.jp',
    password: 'admin123',
    role: 'admin',
    phone: '+81-XXX-XXXX-XXXX'
  });

  console.log('✅ Admin user created');
  return admin;
};

const seedProducts = async () => {
  await Product.deleteMany({});

  const products = [
    {
      name: 'Yamaha PAS Babby un SP 電動アシスト自転車',
      brand: 'Yamaha',
      category: 'electric',
      price: 85000,
      condition: 'used',
      conditionPercentage: 85,
      specifications: {
        batteryType: 'リチウムイオン 15.4Ah',
        rangeKm: 63,
        motorPower: '250W',
        frameSize: '20インチ',
        weight: 32.7,
        color: 'ホワイト'
      },
      replacedParts: ['タイヤ', 'ブレーキパッド', 'チェーン'],
      warranty: {
        battery: 3,
        motor: 3,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800'],
      description: {
        vi: 'Xe đạp điện Yamaha chất lượng cao, pin tốt',
        en: 'High quality Yamaha electric bicycle',
        ja: '高品質ヤマハ電動アシスト自転車',
        zh: '高品质雅马哈电动自行车'
      },
      stock: 1,
      featured: true,
      status: 'active'
    },
    {
      name: 'Panasonic Vivi DX 電動アシスト自転車',
      brand: 'Panasonic',
      category: 'electric',
      price: 75000,
      condition: 'used',
      conditionPercentage: 90,
      specifications: {
        batteryType: 'リチウムイオン 16Ah',
        rangeKm: 70,
        motorPower: '250W',
        frameSize: '26インチ',
        weight: 28.5,
        color: 'シルバー'
      },
      replacedParts: ['バッテリー', 'サドル'],
      warranty: {
        battery: 3,
        motor: 3,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'],
      description: {
        vi: 'Xe đạp điện Panasonic, pin mới thay',
        en: 'Panasonic electric bicycle, new battery',
        ja: 'パナソニック電動アシスト自転車、新品バッテリー',
        zh: '松下电动自行车，新电池'
      },
      stock: 1,
      featured: true,
      status: 'active'
    },
    {
      name: 'Bridgestone Assista 電動アシスト自転車',
      brand: 'Bridgestone',
      category: 'electric',
      price: 68000,
      condition: 'used',
      conditionPercentage: 80,
      specifications: {
        batteryType: 'リチウムイオン 12.3Ah',
        rangeKm: 50,
        motorPower: '240W',
        frameSize: '24インチ',
        weight: 27.8,
        color: 'ブラック'
      },
      replacedParts: ['チェーン', 'ライト'],
      warranty: {
        battery: 3,
        motor: 3,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'],
      description: {
        vi: 'Xe đạp điện Bridgestone giá tốt',
        en: 'Bridgestone electric bicycle, good price',
        ja: 'ブリヂストン電動アシスト自転車、お買い得',
        zh: '普利司通电动自行车，价格优惠'
      },
      stock: 2,
      featured: false,
      status: 'active'
    },
    {
      name: '通勤用シティサイクル 26インチ',
      brand: 'Other',
      category: 'normal',
      price: 18000,
      condition: 'used',
      conditionPercentage: 75,
      specifications: {
        frameSize: '26インチ',
        weight: 18.5,
        color: 'レッド'
      },
      replacedParts: ['タイヤ', 'カゴ'],
      warranty: {
        battery: 0,
        motor: 0,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'],
      description: {
        vi: 'Xe đạp thường giá rẻ, phù hợp đi làm',
        en: 'Affordable regular bicycle for commuting',
        ja: '通勤用シティサイクル、お手頃価格',
        zh: '实惠的通勤自行车'
      },
      stock: 3,
      featured: false,
      status: 'active'
    },
    {
      name: 'ロードバイク SHIMANO 105',
      brand: 'Other',
      category: 'sport',
      price: 95000,
      condition: 'used',
      conditionPercentage: 88,
      specifications: {
        frameSize: '700C',
        weight: 9.8,
        color: 'ブルー'
      },
      replacedParts: ['タイヤ', 'チェーン', 'バーテープ'],
      warranty: {
        battery: 0,
        motor: 0,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'],
      description: {
        vi: 'Xe đạp thể thao cao cấp SHIMANO 105',
        en: 'Premium sport bicycle with SHIMANO 105',
        ja: 'SHIMANO 105搭載ロードバイク',
        zh: '配备SHIMANO 105的高级运动自行车'
      },
      stock: 1,
      featured: true,
      status: 'active'
    },
    {
      name: 'マウンテンバイク 27.5インチ',
      brand: 'Other',
      category: 'sport',
      price: 45000,
      condition: 'used',
      conditionPercentage: 82,
      specifications: {
        frameSize: '27.5インチ',
        weight: 13.5,
        color: 'グリーン'
      },
      replacedParts: ['サスペンション', 'ブレーキ'],
      warranty: {
        battery: 0,
        motor: 0,
        discountPercent: 10
      },
      images: ['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'],
      description: {
        vi: 'Xe đạp leo núi, treo giảm xóc tốt',
        en: 'Mountain bike with good suspension',
        ja: 'サスペンション付きマウンテンバイク',
        zh: '带悬挂系统的山地自行车'
      },
      stock: 2,
      featured: false,
      status: 'active'
    }
  ];

  const createdProducts = await Product.insertMany(products);
  console.log(`✅ ${createdProducts.length} products created`);
  return createdProducts;
};

const seedPartners = async () => {
  await Partner.deleteMany({});

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const partners = [
    {
      name: 'Tokyo Bike Shop',
      contactPerson: 'Tanaka Taro',
      email: 'tanaka@example.com',
      phone: '+81-90-1234-5678',
      commissionRate: 5,
      token: crypto.randomBytes(16).toString('hex')
    },
    {
      name: 'Osaka Cycle Center',
      contactPerson: 'Suzuki Hanako',
      email: 'suzuki@example.com',
      phone: '+81-90-8765-4321',
      commissionRate: 7,
      token: crypto.randomBytes(16).toString('hex')
    }
  ];

  for (const partnerData of partners) {
    const partnerUrl = `${frontendUrl}?partner=${partnerData.token}`;
    const qrCode = await QRCode.toDataURL(partnerUrl);
    partnerData.qrCode = qrCode;
  }

  const createdPartners = await Partner.insertMany(partners);
  console.log(`✅ ${createdPartners.length} partners created with QR codes`);
  return createdPartners;
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seed...\n');
    
    await seedUsers();
    await seedProducts();
    await seedPartners();
    
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Admin Login:');
    console.log('   Email: admin@hbikejapan.jp');
    console.log('   Password: admin123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
};

seedDatabase();
