import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hbike_japan';

// Sample products with complete data
const sampleProducts = [
  // Electric bikes (xe trợ lực) - Commission: 5000 yen
  {
    name: 'Yamaha PAS City SP5',
    nameJa: 'ヤマハ PAS シティ SP5',
    nameEn: 'Yamaha PAS City SP5',
    brand: 'Yamaha',
    category: 'electric',
    price: 2500000,
    costPrice: 2000000,
    profit: 500000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 85,
    batteryOptions: [
      { type: 'lithium_basic', name: 'リチウム基本', capacity: '36V 8Ah', range: 35, priceAdjustment: 0, inStock: true },
      { type: 'lithium_standard', name: 'リチウム標準', capacity: '36V 12Ah', range: 50, priceAdjustment: 30000, inStock: true },
      { type: 'lithium_premium', name: 'リチウムプレミアム', capacity: '36V 16Ah', range: 70, priceAdjustment: 60000, inStock: true }
    ],
    conditionPricing: {
      newConditionPrice: 3200000,
      usedConditionPrice: 2500000,
      newConditionAvailable: true,
      usedConditionAvailable: true
    },
    specifications: {
      batteryType: 'Lithium-ion',
      rangeKm: 50,
      motorPower: '250W',
      frameSize: 'M',
      weight: 25,
      color: 'シルバー'
    },
    replacedParts: ['タイヤ', 'ブレーキパッド'],
    warranty: { battery: 6, motor: 12, discountPercent: 10 },
    images: ['/images/products/yamaha-pas-city-sp5.jpg'],
    description: {
      vi: 'Xe đạp trợ lực điện Yamaha PAS City SP5, phù hợp đi làm và đi chợ',
      en: 'Yamaha PAS City SP5 electric assist bicycle, suitable for commuting and shopping',
      ja: 'ヤマハ PAS シティ SP5 電動アシスト自転車、通勤や買い物に最適'
    },
    stock: 3,
    featured: true,
    status: 'active'
  },
  {
    name: 'Panasonic Vivi DX',
    nameJa: 'パナソニック ビビ DX',
    nameEn: 'Panasonic Vivi DX',
    brand: 'Panasonic',
    category: 'electric',
    price: 2800000,
    costPrice: 2200000,
    profit: 600000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 90,
    batteryOptions: [
      { type: 'lithium_basic', name: 'リチウム基本', capacity: '25.2V 12Ah', range: 45, priceAdjustment: 0, inStock: true },
      { type: 'lithium_standard', name: 'リチウム標準', capacity: '25.2V 16Ah', range: 60, priceAdjustment: 35000, inStock: true },
      { type: 'lithium_premium', name: 'リチウムプレミアム', capacity: '25.2V 20Ah', range: 80, priceAdjustment: 70000, inStock: true }
    ],
    conditionPricing: {
      newConditionPrice: 3500000,
      usedConditionPrice: 2800000,
      newConditionAvailable: true,
      usedConditionAvailable: true
    },
    specifications: {
      batteryType: 'Lithium-ion',
      rangeKm: 60,
      motorPower: '250W',
      frameSize: 'L',
      weight: 27,
      color: 'ホワイト'
    },
    replacedParts: ['チェーン', 'ライト'],
    warranty: { battery: 12, motor: 12, discountPercent: 15 },
    images: ['/images/products/panasonic-vivi-dx.jpg'],
    description: {
      vi: 'Xe đạp trợ lực Panasonic Vivi DX cao cấp, pin lớn đi xa',
      en: 'Premium Panasonic Vivi DX electric bicycle with large battery for long range',
      ja: 'パナソニック ビビ DX プレミアム電動アシスト自転車、大容量バッテリーで長距離走行'
    },
    stock: 2,
    featured: true,
    status: 'active'
  },
  {
    name: 'Bridgestone Assista',
    nameJa: 'ブリヂストン アシスタ',
    nameEn: 'Bridgestone Assista',
    brand: 'Bridgestone',
    category: 'electric',
    price: 2200000,
    costPrice: 1800000,
    profit: 400000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 80,
    batteryOptions: [
      { type: 'lithium_basic', name: 'リチウム基本', capacity: '25.2V 6.6Ah', range: 30, priceAdjustment: 0, inStock: true },
      { type: 'lithium_standard', name: 'リチウム標準', capacity: '25.2V 12.3Ah', range: 55, priceAdjustment: 40000, inStock: true }
    ],
    conditionPricing: {
      newConditionPrice: 2900000,
      usedConditionPrice: 2200000,
      newConditionAvailable: false,
      usedConditionAvailable: true
    },
    specifications: {
      batteryType: 'Lithium-ion',
      rangeKm: 40,
      motorPower: '250W',
      frameSize: 'S',
      weight: 24,
      color: 'ブラック'
    },
    replacedParts: [],
    warranty: { battery: 6, motor: 6, discountPercent: 5 },
    images: ['/images/products/bridgestone-assista.jpg'],
    description: {
      vi: 'Xe đạp trợ lực Bridgestone Assista, giá tốt cho sinh viên',
      en: 'Bridgestone Assista electric bicycle, affordable for students',
      ja: 'ブリヂストン アシスタ 電動アシスト自転車、学生にお手頃価格'
    },
    stock: 5,
    featured: false,
    status: 'active'
  },

  // Normal bikes (xe đạp thường) - Commission: 1500 yen
  {
    name: 'Xe đạp thường 26 inch - Đi làm, đi học',
    nameJa: '26インチ シティサイクル - 通勤・通学用',
    nameEn: '26 inch City Bicycle - Commuter',
    brand: 'Other',
    category: 'normal',
    price: 800000,
    costPrice: 600000,
    profit: 200000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 75,
    batteryOptions: [],
    conditionPricing: {
      newConditionPrice: 1200000,
      usedConditionPrice: 800000,
      newConditionAvailable: true,
      usedConditionAvailable: true
    },
    specifications: {
      frameSize: 'M',
      weight: 15,
      color: 'シルバー'
    },
    replacedParts: ['サドル'],
    warranty: { battery: 0, motor: 0, discountPercent: 5 },
    images: ['/images/products/city-bike-26.jpg'],
    description: {
      vi: 'Xe đạp thường 26 inch, phù hợp đi làm đi học hàng ngày',
      en: '26 inch city bicycle, suitable for daily commuting',
      ja: '26インチ シティサイクル、毎日の通勤・通学に最適'
    },
    stock: 10,
    featured: false,
    status: 'active'
  },
  {
    name: 'Xe đạp mini Nhật 20 inch',
    nameJa: '20インチ ミニベロ',
    nameEn: '20 inch Mini Velo',
    brand: 'Other',
    category: 'normal',
    price: 650000,
    costPrice: 500000,
    profit: 150000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 80,
    batteryOptions: [],
    conditionPricing: {
      newConditionPrice: 950000,
      usedConditionPrice: 650000,
      newConditionAvailable: false,
      usedConditionAvailable: true
    },
    specifications: {
      frameSize: 'S',
      weight: 12,
      color: 'レッド'
    },
    replacedParts: [],
    warranty: { battery: 0, motor: 0, discountPercent: 0 },
    images: ['/images/products/mini-velo-20.jpg'],
    description: {
      vi: 'Xe đạp mini 20 inch, nhỏ gọn tiện lợi',
      en: '20 inch mini velo, compact and convenient',
      ja: '20インチ ミニベロ、コンパクトで便利'
    },
    stock: 8,
    featured: false,
    status: 'active'
  },

  // Sport bikes (xe thể thao) - Commission: 2000 yen (using electric rate for now)
  {
    name: 'Xe đạp thể thao Road Bike',
    nameJa: 'ロードバイク スポーツ',
    nameEn: 'Road Bike Sport',
    brand: 'Other',
    category: 'sport',
    price: 1500000,
    costPrice: 1200000,
    profit: 300000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 85,
    batteryOptions: [],
    conditionPricing: {
      newConditionPrice: 2000000,
      usedConditionPrice: 1500000,
      newConditionAvailable: true,
      usedConditionAvailable: true
    },
    specifications: {
      frameSize: 'L',
      weight: 10,
      color: 'ブルー'
    },
    replacedParts: ['ハンドルテープ', 'タイヤ'],
    warranty: { battery: 0, motor: 0, discountPercent: 10 },
    images: ['/images/products/road-bike-sport.jpg'],
    description: {
      vi: 'Xe đạp thể thao Road Bike, nhẹ và nhanh',
      en: 'Road Bike Sport, light and fast',
      ja: 'ロードバイク スポーツ、軽量で高速'
    },
    stock: 3,
    featured: true,
    status: 'active'
  },
  {
    name: 'Mountain Bike 27.5 inch',
    nameJa: 'マウンテンバイク 27.5インチ',
    nameEn: 'Mountain Bike 27.5 inch',
    brand: 'Other',
    category: 'sport',
    price: 1800000,
    costPrice: 1400000,
    profit: 400000,
    currency: 'JPY',
    condition: 'used',
    conditionPercentage: 90,
    batteryOptions: [],
    conditionPricing: {
      newConditionPrice: 2400000,
      usedConditionPrice: 1800000,
      newConditionAvailable: true,
      usedConditionAvailable: true
    },
    specifications: {
      frameSize: 'M',
      weight: 14,
      color: 'グリーン'
    },
    replacedParts: ['フロントサスペンション'],
    warranty: { battery: 0, motor: 0, discountPercent: 5 },
    images: ['/images/products/mountain-bike-27.jpg'],
    description: {
      vi: 'Xe đạp địa hình Mountain Bike 27.5 inch',
      en: 'Mountain Bike 27.5 inch for off-road',
      ja: 'マウンテンバイク 27.5インチ、オフロード用'
    },
    stock: 4,
    featured: false,
    status: 'active'
  }
];

// Sample CTV/Partners
const samplePartners = [
  {
    name: 'Nguyễn Văn Hoàng',
    contactPerson: 'Hoàng',
    email: 'hoang@example.com',
    phone: '0901234567',
    token: 'ctv_hoang',
    partnerType: 'ctv',
    ctvCommission: {
      electricBike: 5000,
      normalBike: 1500,
      sportBike: 2000
    },
    isActive: true
  },
  {
    name: 'Trần Thị Mai',
    contactPerson: 'Mai',
    email: 'mai@example.com',
    phone: '0907654321',
    token: 'ctv_mai',
    partnerType: 'ctv',
    ctvCommission: {
      electricBike: 5000,
      normalBike: 1500,
      sportBike: 2000
    },
    isActive: true
  },
  {
    name: 'Lê Minh Tuấn',
    contactPerson: 'Tuấn',
    email: 'tuan@example.com',
    phone: '0909876543',
    token: 'ctv_tuan',
    partnerType: 'affiliate',
    ctvCommission: {
      electricBike: 5000,
      normalBike: 1500,
      sportBike: 2000
    },
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing products (optional - comment out to keep existing)
    // await Product.deleteMany({});
    // console.log('🗑️ Cleared existing products');

    // Insert products
    console.log('📦 Seeding products...');
    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ name: productData.name });
      if (!existingProduct) {
        await Product.create(productData);
        console.log(`  ✅ Created: ${productData.name}`);
      } else {
        console.log(`  ⏭️ Skipped (exists): ${productData.name}`);
      }
    }

    // Import Partner model
    const Partner = (await import('../models/Partner.js')).default;

    // Insert partners/CTVs
    console.log('👥 Seeding CTVs/Partners...');
    for (const partnerData of samplePartners) {
      const existingPartner = await Partner.findOne({ token: partnerData.token });
      if (!existingPartner) {
        const partner = await Partner.create(partnerData);
        // Generate discount code
        partner.exclusiveDiscount = {
          code: partner.generateDiscountCode(),
          discountPercent: 5,
          maxUses: 100,
          usedCount: 0,
          isActive: true,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        };
        await partner.save();
        console.log(`  ✅ Created CTV: ${partnerData.name} (token: ${partnerData.token})`);
      } else {
        console.log(`  ⏭️ Skipped (exists): ${partnerData.name}`);
      }
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📋 CTV Affiliate Links:');
    const partners = await Partner.find({});
    partners.forEach(p => {
      console.log(`  - ${p.name}: http://localhost:3000?ref=${p.token}`);
    });

    console.log('\n💰 Commission Rates:');
    console.log('  - Xe trợ lực (Electric): ¥5,000 / chiếc');
    console.log('  - Xe đạp thường (Normal): ¥1,500 / chiếc');
    console.log('  - Xe thể thao (Sport): ¥2,000 / chiếc');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedDatabase();
