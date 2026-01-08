import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Partner from '../models/Partner.js';
import Customer from '../models/Customer.js';
import { protect, authorize, verifyPartnerToken } from '../middleware/auth.js';
import shippingService from '../services/shippingService.js';
import miniGameService from '../services/miniGameService.js';
import { sendOrderConfirmation, sendOrderStatusUpdate } from '../services/emailService.js';

// COD fee configuration
const COD_FEE = 500; // 500 yen for COD

const router = express.Router();

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`;
};

router.post('/', verifyPartnerToken, async (req, res) => {
  try {
    const { customer, items, paymentMethod, notes, deliveryPreference, couponCode, couponDiscount, shippingOption, bankTransferInfo, visaCardInfo } = req.body;

    let subtotal = 0;
    const orderItems = [];
    const productCategories = [];

    // Process items with battery and condition options
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.product} không khả dụng`
        });
      }

      // Calculate price with battery and condition adjustments
      let itemPrice = product.price;
      let batteryPriceAdjustment = 0;
      let conditionPriceAdjustment = 0;

      // Apply battery option price adjustment
      if (item.selectedBattery && product.batteryOptions?.length > 0) {
        const selectedBatteryOption = product.batteryOptions.find(
          opt => opt.type === item.selectedBattery
        );
        if (selectedBatteryOption) {
          batteryPriceAdjustment = selectedBatteryOption.priceAdjustment || 0;
        }
      }

      // Apply condition price adjustment (new vs used)
      if (item.selectedCondition === 'new' && product.conditionPricing?.newConditionAvailable) {
        conditionPriceAdjustment = (product.conditionPricing.newConditionPrice || 0) - (product.conditionPricing.usedConditionPrice || product.price);
      }

      const finalItemPrice = itemPrice + batteryPriceAdjustment + conditionPriceAdjustment;
      subtotal += finalItemPrice * (item.quantity || 1);

      orderItems.push({
        product: product._id,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity || 1,
        selectedBattery: item.selectedBattery || 'lithium_basic',
        selectedCondition: item.selectedCondition || 'used',
        batteryPriceAdjustment,
        conditionPriceAdjustment
      });

      // Track categories for CTV commission
      productCategories.push({
        category: product.category,
        quantity: item.quantity || 1
      });

      product.status = 'reserved';
      await product.save();
    }

    // Check for returning customer discount
    let loyaltyDiscount = { percent: 0, amount: 0 };
    let existingCustomer = null;
    
    if (customer.email || customer.phone) {
      existingCustomer = await Customer.findOne({
        $or: [
          { email: customer.email?.toLowerCase() },
          { phone: customer.phone }
        ]
      });

      if (existingCustomer && existingCustomer.discountPercent > 0) {
        loyaltyDiscount.percent = existingCustomer.discountPercent;
        loyaltyDiscount.amount = Math.round(subtotal * (existingCustomer.discountPercent / 100));
      }
    }

    // Calculate COD fee
    const codFee = paymentMethod === 'cod' ? COD_FEE : 0;
    
    // Calculate shipping fee based on option or distance
    let shippingFee = 0;
    let shippingMethodData = { type: 'free_delivery' };
    
    if (shippingOption) {
      if (shippingOption.method === 'pickup') {
        shippingFee = 0;
        shippingMethodData = { type: 'pickup', description: '店舗受取' };
      } else if (shippingOption.distanceKm) {
        const shippingCalc = shippingService.calculateShippingFee(shippingOption.distanceKm, 'delivery');
        shippingFee = shippingCalc.fee;
        shippingMethodData = {
          type: shippingCalc.method,
          distanceKm: shippingOption.distanceKm,
          description: shippingCalc.description,
          estimatedDays: shippingCalc.estimatedDays
        };
      } else if (shippingOption.fee !== undefined) {
        shippingFee = shippingOption.fee;
        shippingMethodData = {
          type: shippingOption.type || 'zone_1',
          description: shippingOption.description
        };
      }
    }

    // Apply coupon discount if provided
    let couponDiscountData = { code: '', percent: 0, amount: 0 };
    if (couponDiscount && couponDiscount.code && couponDiscount.amount) {
      couponDiscountData = {
        code: couponDiscount.code,
        amount: couponDiscount.amount
      };
    }

    // Calculate total amount
    const totalAmount = subtotal - loyaltyDiscount.amount - couponDiscountData.amount + shippingFee + codFee;

    // Generate restaurant coupon for bike purchase
    const restaurantCoupon = miniGameService.generateRestaurantCoupon();

    // Calculate CTV commission if order is from partner
    let ctvCommission = { amount: 0, paid: false };
    if (req.partner) {
      ctvCommission.amount = req.partner.calculateCommission(productCategories);
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customer,
      items: orderItems,
      subtotal,
      loyaltyDiscount,
      couponDiscount: couponDiscountData,
      totalAmount,
      shippingFee,
      shippingMethod: shippingMethodData,
      restaurantCoupon,
      ctvCommission,
      codFee,
      paymentMethod,
      bankTransferInfo: paymentMethod === 'bank_transfer' && bankTransferInfo ? {
        bankName: bankTransferInfo.bankName,
        accountNumber: bankTransferInfo.accountNumber,
        accountName: bankTransferInfo.accountName,
        transferContent: bankTransferInfo.transferContent,
        receiptImage: bankTransferInfo.receiptImage || null,
        verified: false
      } : undefined,
      visaCardInfo: paymentMethod === 'visa_card' && visaCardInfo ? {
        receiptImage: visaCardInfo.receiptImage || null
      } : undefined,
      deliveryPreference: deliveryPreference ? {
        preferredDate: deliveryPreference.preferredDate,
        preferredTimeSlot: deliveryPreference.preferredTimeSlot || 'anytime',
        timeFrom: deliveryPreference.timeFrom,
        timeTo: deliveryPreference.timeTo,
        specialInstructions: deliveryPreference.specialInstructions
      } : undefined,
      notes,
      partner: req.partner?._id
    });

    // Update or create customer record for loyalty tracking
    if (customer.email) {
      try {
        if (existingCustomer) {
          existingCustomer.totalOrders += 1;
          existingCustomer.totalSpent += totalAmount;
          existingCustomer.lastOrderDate = new Date();
          if (customer.address) existingCustomer.address = customer.address;
          await existingCustomer.save();
        } else {
          await Customer.create({
            name: customer.name,
            email: customer.email.toLowerCase(),
            phone: customer.phone,
            address: customer.address,
            totalOrders: 1,
            totalSpent: totalAmount,
            firstOrderDate: new Date(),
            lastOrderDate: new Date()
          });
        }
      } catch (customerError) {
        console.log('Customer tracking error:', customerError.message);
      }
    }

    // Update partner commission
    if (req.partner) {
      req.partner.totalOrders += 1;
      req.partner.commissionPending += ctvCommission.amount;
      req.partner.totalCommissionEarned += ctvCommission.amount;
      await req.partner.save();
    }

    // Send order confirmation email
    try {
      await sendOrderConfirmation(order, 'vi');
    } catch (emailError) {
      console.log('Email sending error:', emailError.message);
    }

    // Emit socket event for real-time dashboard updates
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('newOrder', {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt
      });
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.orderStatus = status;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product')
      .populate('partner')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('partner');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generate PDF invoice
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('partner');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber || order._id.toString().slice(-6)}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#e74c3c').text('XE ĐẠP NHẬT BẢN', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Hóa đơn bán hàng / Invoice', { align: 'center' });
    doc.moveDown();

    // Order Info
    doc.fontSize(10).fillColor('#333');
    doc.text(`Mã đơn hàng: #${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}`);
    doc.text(`Ngày đặt: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}`);
    doc.text(`Trạng thái: ${order.orderStatus}`);
    doc.text(`Thanh toán: ${order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod}`);
    doc.moveDown();

    // Customer Info
    doc.fontSize(12).fillColor('#e74c3c').text('THÔNG TIN KHÁCH HÀNG');
    doc.fontSize(10).fillColor('#333');
    doc.text(`Tên: ${order.customer?.name || 'N/A'}`);
    doc.text(`SĐT: ${order.customer?.phone || 'N/A'}`);
    doc.text(`Email: ${order.customer?.email || 'N/A'}`);
    doc.text(`Địa chỉ: ${order.customer?.address || 'N/A'}`);
    doc.moveDown();

    // Items Table Header
    doc.fontSize(12).fillColor('#e74c3c').text('SẢN PHẨM');
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    doc.fontSize(9).fillColor('#666');
    doc.text('Sản phẩm', 50, tableTop);
    doc.text('Đơn giá', 280, tableTop);
    doc.text('SL', 380, tableTop);
    doc.text('Thành tiền', 420, tableTop, { align: 'right', width: 100 });
    
    doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke('#ddd');
    
    let itemY = tableTop + 25;
    doc.fillColor('#333');
    
    for (const item of order.items) {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      doc.fontSize(9);
      doc.text(item.name || item.product?.name || 'Sản phẩm', 50, itemY, { width: 220 });
      doc.text(`¥${(item.price || 0).toLocaleString()}`, 280, itemY);
      doc.text(String(item.quantity || 1), 380, itemY);
      doc.text(`¥${itemTotal.toLocaleString()}`, 420, itemY, { align: 'right', width: 100 });
      itemY += 20;
    }

    doc.moveTo(50, itemY).lineTo(520, itemY).stroke('#ddd');
    itemY += 15;

    // Totals
    doc.fontSize(10);
    doc.text(`Tạm tính:`, 350, itemY);
    doc.text(`¥${(order.subtotal || 0).toLocaleString()}`, 420, itemY, { align: 'right', width: 100 });
    itemY += 18;

    if (order.shippingFee) {
      doc.text(`Phí vận chuyển:`, 350, itemY);
      doc.text(`¥${order.shippingFee.toLocaleString()}`, 420, itemY, { align: 'right', width: 100 });
      itemY += 18;
    }

    if (order.discount) {
      doc.fillColor('#27ae60').text(`Giảm giá:`, 350, itemY);
      doc.text(`-¥${order.discount.toLocaleString()}`, 420, itemY, { align: 'right', width: 100 });
      itemY += 18;
    }

    doc.moveTo(350, itemY).lineTo(520, itemY).stroke('#e74c3c');
    itemY += 10;
    
    doc.fontSize(14).fillColor('#e74c3c');
    doc.text(`TỔNG CỘNG:`, 350, itemY);
    doc.text(`¥${(order.totalAmount || 0).toLocaleString()}`, 420, itemY, { align: 'right', width: 100 });

    // Footer
    doc.fontSize(9).fillColor('#666');
    doc.text('Cảm ơn quý khách đã mua hàng!', 50, 700, { align: 'center', width: 500 });
    doc.text('Hotline: 0123-456-789 | Email: support@xedapnhatban.com', 50, 715, { align: 'center', width: 500 });

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Restore product stock if order is being deleted
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { status: 'active' });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    if (orderStatus === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { status: 'active' });
      }
    } else if (orderStatus === 'delivered' && order.partner) {
      const partner = await Partner.findById(order.partner);
      if (partner) {
        partner.totalRevenue += order.totalAmount;
        await partner.save();
      }
    }

    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
