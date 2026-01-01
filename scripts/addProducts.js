import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const sampleProducts = [
  {
    name: 'Xe đạp Giant ATX 2023',
    description: 'Xe đạp địa hình Giant ATX với khung nhôm cao cấp, phanh đĩa thủy lực và hệ thống truyền động Shimano 21 tốc độ. Phù hợp cho các chuyến đi phượt địa hình.',
    price: 8500000,
    category: 'sport',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800',
      'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=800'
    ],
    stock: 15,
    specifications: {
      brand: 'Giant',
      model: 'ATX 2023',
      weight: '13.5kg',
      frameSize: 'M, L, XL',
      wheelSize: '27.5 inch',
      gears: '21 tốc độ',
      brakes: 'Phanh đĩa thủy lực'
    },
    featured: true
  },
  {
    name: 'Xe đạp điện Yamaha PAS',
    description: 'Xe đạp điện Yamaha PAS với động cơ 250W mạnh mẽ, pin lithium 36V có thể di chuyển 50km. Thiết kế hiện đại, phù hợp di chuyển trong thành phố.',
    price: 15000000,
    category: 'electric',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800',
      'https://images.unsplash.com/photo-1617633833824-5c9a7b0b5f4e?w=800'
    ],
    stock: 8,
    specifications: {
      brand: 'Yamaha',
      model: 'PAS',
      motor: '250W',
      battery: '36V 10Ah Lithium',
      maxSpeed: '25 km/h',
      range: '50 km',
      weight: '22kg'
    },
    featured: true
  },
  {
    name: 'Xe đạp thành phố Asama',
    description: 'Xe đạp thành phố Asama phong cách Nhật Bản, khung thép chắc chắn, giỏ trước tiện lợi. Hoàn hảo cho việc đi làm, đi học hàng ngày.',
    price: 3500000,
    category: 'normal',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800'
    ],
    stock: 25,
    specifications: {
      brand: 'Asama',
      model: 'City 2023',
      wheelSize: '26 inch',
      weight: '16kg',
      frameSize: 'S, M',
      basket: 'Có',
      features: 'Chắn bùn, giá sau, đèn'
    },
    featured: true
  },
  {
    name: 'Xe đạp thể thao Trek Domane',
    description: 'Xe đạp đường trường Trek Domane với khung carbon siêu nhẹ, hệ thống truyền động Shimano 105 22 tốc độ. Dành cho những ai yêu thích tốc độ.',
    price: 25000000,
    category: 'sport',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800',
      'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800'
    ],
    stock: 5,
    specifications: {
      brand: 'Trek',
      model: 'Domane SL5',
      frame: 'Carbon OCLV 500',
      gears: 'Shimano 105 22 tốc độ',
      wheelSize: '700c',
      weight: '8.5kg',
      brakes: 'Phanh đĩa thủy lực'
    },
    featured: true
  },
  {
    name: 'Xe đạp điện Panasonic EZ',
    description: 'Xe đạp điện trợ lực Panasonic với công nghệ cảm biến lực đạp thông minh. Pin lâu, thiết kế gọn nhẹ, lý tưởng cho người trung niên.',
    price: 18000000,
    category: 'electric',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800'
    ],
    stock: 10,
    specifications: {
      brand: 'Panasonic',
      model: 'EZ',
      motor: '250W trợ lực',
      battery: '36V 12Ah',
      range: '60 km',
      weight: '23kg',
      features: 'Cảm biến lực đạp, màn hình LCD'
    },
    featured: false
  },
  {
    name: 'Xe đạp gấp Dahon K3',
    description: 'Xe đạp gấp siêu gọn Dahon K3, gấp trong 10 giây. Bánh 14 inch nhỏ gọn, dễ mang theo trên xe hơi hoặc tàu điện.',
    price: 7500000,
    category: 'normal',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1505705694385-f2f05fa0e3c4?w=800',
      'https://images.unsplash.com/photo-1617957718614-8c19e10a2681?w=800'
    ],
    stock: 12,
    specifications: {
      brand: 'Dahon',
      model: 'K3',
      wheelSize: '14 inch',
      folded: '65x60x28 cm',
      weight: '11kg',
      gears: 'Single speed',
      color: 'Đen, Bạc, Đỏ'
    },
    featured: false
  },
  {
    name: 'Xe đạp mini Nhật Bản',
    description: 'Xe đạp mini phong cách retro Nhật Bản, bánh 20 inch, phanh V-brake. Đã qua sử dụng nhưng còn rất mới, vừa bảo dưỡng.',
    price: 2500000,
    category: 'normal',
    condition: 'used',
    images: [
      'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=800'
    ],
    stock: 3,
    specifications: {
      brand: 'Unknown',
      wheelSize: '20 inch',
      weight: '13kg',
      condition: 'Đã qua sử dụng 1 năm',
      status: '90% mới'
    },
    featured: false
  },
  {
    name: 'Xe đạp Touring Specialized',
    description: 'Xe đạp du lịch Specialized với khả năng chịu tải tốt, có giá đồ trước sau, thích hợp cho các chuyến đi xa nhiều ngày.',
    price: 20000000,
    category: 'sport',
    condition: 'like-new',
    images: [
      'https://images.unsplash.com/photo-1576761804978-d7c97966f9e6?w=800',
      'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=800'
    ],
    stock: 4,
    specifications: {
      brand: 'Specialized',
      model: 'AWOL',
      frame: 'Chromoly steel',
      gears: 'Shimano Deore 27 tốc độ',
      wheelSize: '700c',
      weight: '14kg',
      load: 'Chịu tải 150kg'
    },
    featured: false
  }
];

async function addProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bike-shop');
    console.log('✅ Đã kết nối MongoDB');

    // Xóa tất cả sản phẩm cũ (tùy chọn)
    // await Product.deleteMany({});
    // console.log('🗑️  Đã xóa sản phẩm cũ');

    // Thêm sản phẩm mới
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Đã thêm ${products.length} sản phẩm mẫu thành công!`);

    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.price.toLocaleString('vi-VN')}đ`);
    });

    mongoose.connection.close();
    console.log('\n✅ Hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

addProducts();
