import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

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

const sampleProducts = [
  {
    name: 'Xe đạp điện Yamaha PAS City-X 2023',
    brand: 'Yamaha',
    category: 'electric',
    price: 9500000,
    condition: 'used',
    conditionPercentage: 90,
    specifications: {
      batteryType: 'Lithium-ion 15.4Ah',
      rangeKm: 65,
      motorPower: '250W',
      frameSize: '26 inch',
      weight: 28.5,
      color: 'Đen bạc'
    },
    replacedParts: ['Lốp mới', 'Phanh đĩa'],
    warranty: {
      battery: 3,
      motor: 3,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'
    ],
    description: {
      vi: 'Xe đạp điện Yamaha chất lượng cao, pin còn tốt 90%, phù hợp cho học sinh, sinh viên và người đi làm. Bảo hành pin và động cơ 3 tháng.',
      en: 'High-quality Yamaha electric bicycle, 90% battery capacity, suitable for students and workers. 3-month warranty on battery and motor.',
      ja: '高品質ヤマハ電動自転車、バッテリー容量90％、学生や労働者に最適。バッテリーとモーターに3ヶ月保証。',
      zh: '高品质雅马哈电动自行车，电池容量90％，适合学生和上班族。电池和电机保修3个月。'
    },
    stock: 1,
    featured: true,
    status: 'active'
  },
  {
    name: 'Xe đạp điện Panasonic Vivi DX 2022',
    brand: 'Panasonic',
    category: 'electric',
    price: 8200000,
    condition: 'used',
    conditionPercentage: 85,
    specifications: {
      batteryType: 'Lithium-ion 16Ah',
      rangeKm: 70,
      motorPower: '250W',
      frameSize: '26 inch',
      weight: 27.8,
      color: 'Trắng'
    },
    replacedParts: ['Pin mới thay', 'Yên xe mới'],
    warranty: {
      battery: 3,
      motor: 3,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=800'
    ],
    description: {
      vi: 'Xe đạp điện Panasonic với pin dung lượng lớn 16Ah, quãng đường di chuyển 70km. Pin đã được thay mới, tình trạng tốt.',
      en: 'Panasonic electric bicycle with large 16Ah battery, 70km range. Battery has been replaced, good condition.',
      ja: 'パナソニック電動自転車、大容量16Ahバッテリー、航続距離70km。新品バッテリー交換済み、良好な状態。',
      zh: '松下电动自行车，大容量16Ah电池，续航70公里。已更换新电池，状况良好。'
    },
    stock: 1,
    featured: true,
    status: 'active'
  },
  {
    name: 'Xe đạp điện Bridgestone Assista 2021',
    brand: 'Bridgestone',
    category: 'electric',
    price: 7500000,
    condition: 'used',
    conditionPercentage: 80,
    specifications: {
      batteryType: 'Lithium-ion 12.3Ah',
      rangeKm: 50,
      motorPower: '240W',
      frameSize: '24 inch',
      weight: 26.5,
      color: 'Đỏ đô'
    },
    replacedParts: ['Xích xe', 'Đèn LED'],
    warranty: {
      battery: 3,
      motor: 3,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'
    ],
    description: {
      vi: 'Xe đạp điện Bridgestone giá rẻ, chất lượng ổn định. Phù hợp cho người lớn tuổi và học sinh cấp 2.',
      en: 'Affordable Bridgestone electric bicycle, stable quality. Suitable for seniors and middle school students.',
      ja: 'お手頃価格のブリヂストン電動自転車、安定した品質。高齢者や中学生に最適。',
      zh: '价格实惠的普利司通电动自行车，质量稳定。适合老年人和中学生。'
    },
    stock: 2,
    featured: false,
    status: 'active'
  },
  {
    name: 'Xe đạp thường 26 inch - Đi làm, đi học',
    brand: 'Other',
    category: 'normal',
    price: 2500000,
    condition: 'used',
    conditionPercentage: 75,
    specifications: {
      frameSize: '26 inch',
      weight: 16.5,
      color: 'Xanh dương'
    },
    replacedParts: ['Lốp xe', 'Giỏ xe'],
    warranty: {
      battery: 0,
      motor: 0,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'
    ],
    description: {
      vi: 'Xe đạp thường giá rẻ, phù hợp cho sinh viên đi học, người lao động đi làm. Khung chắc chắn, vận hành tốt.',
      en: 'Affordable regular bicycle, suitable for students and workers. Strong frame, good operation.',
      ja: 'お手頃価格の通常自転車、学生や労働者に最適。丈夫なフレーム、良好な動作。',
      zh: '价格实惠的普通自行车，适合学生和上班族。坚固的车架，运行良好。'
    },
    stock: 5,
    featured: false,
    status: 'active'
  },
  {
    name: 'Xe đạp thể thao Road Bike SHIMANO 105',
    brand: 'Other',
    category: 'sport',
    price: 12000000,
    condition: 'used',
    conditionPercentage: 88,
    specifications: {
      frameSize: '700C',
      weight: 9.2,
      color: 'Đen carbon'
    },
    replacedParts: ['Lốp mới', 'Xích mới', 'Băng tay lái'],
    warranty: {
      battery: 0,
      motor: 0,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'
    ],
    description: {
      vi: 'Xe đạp thể thao cao cấp với bộ chuyền SHIMANO 105, khung carbon nhẹ. Phù hợp cho người yêu thích đạp xe thể thao.',
      en: 'Premium sport bicycle with SHIMANO 105 groupset, lightweight carbon frame. Suitable for cycling enthusiasts.',
      ja: 'SHIMANO 105グループセット搭載の高級スポーツ自転車、軽量カーボンフレーム。サイクリング愛好家に最適。',
      zh: '配备SHIMANO 105套件的高级运动自行车，轻质碳纤维车架。适合骑行爱好者。'
    },
    stock: 1,
    featured: true,
    status: 'active'
  },
  {
    name: 'Xe đạp leo núi Mountain Bike 27.5 inch',
    brand: 'Other',
    category: 'sport',
    price: 5800000,
    condition: 'used',
    conditionPercentage: 82,
    specifications: {
      frameSize: '27.5 inch',
      weight: 13.8,
      color: 'Xanh lá mạ'
    },
    replacedParts: ['Giảm xóc', 'Phanh đĩa'],
    warranty: {
      battery: 0,
      motor: 0,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800'
    ],
    description: {
      vi: 'Xe đạp leo núi với hệ thống giảm xóc tốt, phanh đĩa an toàn. Phù hợp cho địa hình gồ ghề.',
      en: 'Mountain bike with good suspension system, safe disc brakes. Suitable for rough terrain.',
      ja: '優れたサスペンションシステム、安全なディスクブレーキ付きマウンテンバイク。荒れた地形に最適。',
      zh: '配备良好悬挂系统和安全盘式制动器的山地自行车。适合崎岖地形。'
    },
    stock: 2,
    featured: false,
    status: 'active'
  },
  {
    name: 'Xe đạp gấp Folding Bike 20 inch',
    brand: 'Other',
    category: 'normal',
    price: 3500000,
    condition: 'new',
    conditionPercentage: 100,
    specifications: {
      frameSize: '20 inch',
      weight: 12.5,
      color: 'Đỏ'
    },
    replacedParts: [],
    warranty: {
      battery: 0,
      motor: 0,
      discountPercent: 15
    },
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'
    ],
    description: {
      vi: 'Xe đạp gấp nhỏ gọn, dễ dàng mang theo trên tàu xe. Phù hợp cho dân văn phòng, sinh viên ký túc xá.',
      en: 'Compact folding bicycle, easy to carry on trains. Suitable for office workers and dormitory students.',
      ja: 'コンパクトな折りたたみ自転車、電車に持ち込み可能。オフィスワーカーや寮生に最適。',
      zh: '紧凑型折叠自行车，易于携带上火车。适合上班族和宿舍学生。'
    },
    stock: 3,
    featured: false,
    status: 'active'
  },
  {
    name: 'Xe đạp điện Yamaha PAS Babby un SP - Dành cho gia đình',
    brand: 'Yamaha',
    category: 'electric',
    price: 11500000,
    condition: 'used',
    conditionPercentage: 92,
    specifications: {
      batteryType: 'Lithium-ion 15.4Ah',
      rangeKm: 63,
      motorPower: '250W',
      frameSize: '20 inch',
      weight: 32.7,
      color: 'Kem'
    },
    replacedParts: ['Lốp', 'Phanh', 'Xích'],
    warranty: {
      battery: 3,
      motor: 3,
      discountPercent: 10
    },
    images: [
      'https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800'
    ],
    description: {
      vi: 'Xe đạp điện Yamaha có ghế ngồi cho trẻ em, an toàn cho gia đình. Phù hợp đưa đón con đi học.',
      en: 'Yamaha electric bicycle with child seat, safe for families. Suitable for school runs.',
      ja: '子供用シート付きヤマハ電動自転車、家族に安全。通学の送迎に最適。',
      zh: '配备儿童座椅的雅马哈电动自行车，对家庭安全。适合接送上学。'
    },
    stock: 1,
    featured: true,
    status: 'active'
  }
];

const createProducts = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Bắt đầu tạo sản phẩm...\n');
    
    const createdProducts = await Product.insertMany(sampleProducts);
    
    console.log(`✅ Đã tạo thành công ${createdProducts.length} sản phẩm!`);
    console.log('\n📝 Danh sách sản phẩm đã tạo:');
    
    createdProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - ${product.price.toLocaleString('vi-VN')}đ`);
    });
    
    console.log('\n✅ Hoàn tất!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo sản phẩm:', error);
    process.exit(1);
  }
};

createProducts();
