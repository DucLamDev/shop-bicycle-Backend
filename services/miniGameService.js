// Mini game service for customer promotions
import Coupon from '../models/Coupon.js';

// Wheel of Fortune prizes
const WHEEL_PRIZES = [
  { id: 1, name: '5% 割引', nameVi: 'Giảm 5%', discount: 5, probability: 25, color: '#10b981' },
  { id: 2, name: '10% 割引', nameVi: 'Giảm 10%', discount: 10, probability: 15, color: '#3b82f6' },
  { id: 3, name: '15% 割引', nameVi: 'Giảm 15%', discount: 15, probability: 8, color: '#8b5cf6' },
  { id: 4, name: '20% 割引', nameVi: 'Giảm 20%', discount: 20, probability: 3, color: '#f59e0b' },
  { id: 5, name: '送料無料', nameVi: 'Freeship', type: 'freeship', probability: 20, color: '#ec4899' },
  { id: 6, name: 'ステッカー', nameVi: 'Sticker', type: 'gift', giftName: 'Sticker HBike', probability: 15, color: '#6366f1' },
  { id: 7, name: '次回挑戦', nameVi: 'Chúc bạn may mắn lần sau', type: 'none', probability: 14, color: '#9ca3af' }
];

// Restaurant coupon codes (given when buying a bike)
const RESTAURANT_COUPONS = [
  { code: 'HBIKE-FOOD10', discount: 10, restaurant: 'Partner Restaurant', validDays: 30 },
  { code: 'HBIKE-FOOD15', discount: 15, restaurant: 'Partner Restaurant', validDays: 30 },
  { code: 'HBIKE-FOOD500', discountAmount: 500, restaurant: 'Partner Restaurant', validDays: 30 }
];

// Generate random prize based on probability
function spinWheel() {
  const totalProbability = WHEEL_PRIZES.reduce((sum, p) => sum + p.probability, 0);
  let random = Math.random() * totalProbability;
  
  for (const prize of WHEEL_PRIZES) {
    random -= prize.probability;
    if (random <= 0) {
      return prize;
    }
  }
  return WHEEL_PRIZES[WHEEL_PRIZES.length - 1]; // Fallback to last prize
}

// Generate unique coupon code
function generateCouponCode(prefix = 'SPIN') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Create coupon from prize
async function createPrizeCoupon(prize, userId = null) {
  // Don't create coupon for 'none' (try again) or 'gift' (physical gift) types
  if (prize.type === 'none' || prize.type === 'gift') {
    return null;
  }

  const code = generateCouponCode(prize.type === 'freeship' ? 'FREE' : 'SPIN');
  const validDays = 7; // Coupon valid for 7 days
  
  const couponData = {
    code,
    description: `Mini Game Prize: ${prize.nameVi}`,
    discountType: prize.type === 'freeship' ? 'fixed' : 'percentage',
    discountValue: prize.discount || 0,
    minOrderAmount: 0,
    maxDiscountAmount: prize.type === 'freeship' ? 10000 : null, // Max shipping fee
    startDate: new Date(),
    endDate: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
    usageLimit: 1,
    usedCount: 0,
    isActive: true,
    createdBy: userId,
    source: 'mini_game',
    prizeType: prize.type || 'discount'
  };

  // Note: This would need to be saved to DB - for now return the data
  return couponData;
}

// Play spin wheel game
export async function playSpinWheel(playerId = null) {
  const prize = spinWheel();
  const coupon = await createPrizeCoupon(prize, playerId);
  
  return {
    success: true,
    prize: {
      id: prize.id,
      name: prize.name,
      nameVi: prize.nameVi,
      discount: prize.discount,
      type: prize.type || 'discount',
      color: prize.color
    },
    coupon: coupon ? {
      code: coupon.code,
      validUntil: coupon.endDate,
      description: coupon.description
    } : null,
    message: prize.type === 'none' 
      ? 'Chúc bạn may mắn lần sau!' 
      : prize.type === 'gift'
        ? `Chúc mừng! Bạn đã nhận được ${prize.nameVi}! Liên hệ cửa hàng để nhận quà.`
        : `Chúc mừng! Bạn đã nhận được ${prize.nameVi}!`
  };
}

// Generate restaurant coupon for bike purchase
export function generateRestaurantCoupon() {
  const randomIndex = Math.floor(Math.random() * RESTAURANT_COUPONS.length);
  const template = RESTAURANT_COUPONS[randomIndex];
  
  const uniqueCode = `${template.code}-${Date.now().toString(36).toUpperCase()}`;
  
  return {
    code: uniqueCode,
    discount: template.discount,
    discountAmount: template.discountAmount,
    restaurant: template.restaurant,
    validUntil: new Date(Date.now() + template.validDays * 24 * 60 * 60 * 1000),
    message: template.discount 
      ? `Giảm ${template.discount}% tại ${template.restaurant}`
      : `Giảm ¥${template.discountAmount} tại ${template.restaurant}`
  };
}

// Scratch card game
export function playScratchCard() {
  const prizes = [
    { name: 'Giảm 3%', discount: 3, probability: 30 },
    { name: 'Giảm 5%', discount: 5, probability: 25 },
    { name: 'Giảm 8%', discount: 8, probability: 15 },
    { name: 'Giảm 10%', discount: 10, probability: 10 },
    { name: 'Phụ kiện miễn phí', type: 'gift', probability: 10 },
    { name: 'Chúc may mắn', type: 'none', probability: 10 }
  ];

  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
  let random = Math.random() * totalProbability;
  
  for (const prize of prizes) {
    random -= prize.probability;
    if (random <= 0) {
      return {
        success: true,
        prize,
        code: prize.type !== 'none' ? generateCouponCode('SCRATCH') : null
      };
    }
  }
  
  return { success: true, prize: prizes[prizes.length - 1], code: null };
}

// Get wheel configuration for frontend
export function getWheelConfig() {
  return {
    prizes: WHEEL_PRIZES.map(p => ({
      id: p.id,
      name: p.name,
      nameVi: p.nameVi,
      color: p.color
    })),
    spinDuration: 5000, // 5 seconds
    minSpins: 5
  };
}

export default {
  playSpinWheel,
  playScratchCard,
  generateRestaurantCoupon,
  getWheelConfig,
  WHEEL_PRIZES
};
