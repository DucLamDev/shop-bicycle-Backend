import express from 'express';
import Order from '../models/Order.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV${year}${month}${day}${random}`;
};

// Get invoice data for an order
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.product', 'name brand category images specifications');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = generateInvoiceNumber();
      order.invoiceGeneratedAt = new Date();
      await order.save();
    }

    // Company info (Japan)
    const companyInfo = {
      name: 'HBIKE JAPAN株式会社',
      address: '〒651-0077 神戸市中央区日暮通2-4-18-1F',
      phone: '078-123-4567',
      email: 'contact@hbike.jp',
      website: 'www.hbike.jp',
      taxCode: 'T1234567890123',
      bankInfo: {
        bankName: 'SMBC三井住友銀行',
        accountNumber: '1234567',
        accountName: 'HBIKE JAPAN株式会社'
      }
    };

    // Format invoice data
    const invoiceData = {
      invoiceNumber: order.invoiceNumber,
      invoiceDate: order.invoiceGeneratedAt || new Date(),
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      
      company: companyInfo,
      
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address ? 
          `${order.customer.address.street}, ${order.customer.address.city}, ${order.customer.address.prefecture}` : ''
      },
      
      items: order.items.map((item, index) => ({
        index: index + 1,
        name: item.name,
        brand: item.product?.brand || '',
        quantity: item.quantity,
        unitPrice: item.price,
        batteryOption: item.selectedBattery || 'lithium_basic',
        condition: item.selectedCondition || 'used',
        batteryAdjustment: item.batteryPriceAdjustment || 0,
        conditionAdjustment: item.conditionPriceAdjustment || 0,
        totalPrice: (item.price + (item.batteryPriceAdjustment || 0) + (item.conditionPriceAdjustment || 0)) * item.quantity
      })),
      
      subtotal: order.subtotal || order.totalAmount,
      loyaltyDiscount: order.loyaltyDiscount || { percent: 0, amount: 0 },
      couponDiscount: order.couponDiscount || { percent: 0, amount: 0 },
      shippingFee: order.shippingFee,
      codFee: order.codFee || 0,
      totalAmount: order.totalAmount,
      
      paymentMethod: order.paymentMethod,
      paymentMethodName: getPaymentMethodName(order.paymentMethod),
      paymentStatus: order.paymentStatus,
      
      deliveryPreference: order.deliveryPreference,
      
      notes: order.notes
    };

    res.json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generate PDF invoice (returns HTML for client-side PDF generation)
router.get('/:orderId/html', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.product', 'name brand category images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = generateInvoiceNumber();
      order.invoiceGeneratedAt = new Date();
      await order.save();
    }

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書 ${order.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 14px; 
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .invoice { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .logo { 
      font-size: 28px; 
      font-weight: bold; 
      color: #2563eb;
    }
    .logo span { color: #10b981; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { 
      font-size: 24px; 
      color: #2563eb;
      margin-bottom: 10px;
    }
    .invoice-info p { color: #666; margin: 4px 0; }
    
    .parties { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 30px;
      gap: 40px;
    }
    .party { flex: 1; }
    .party h3 { 
      font-size: 14px; 
      text-transform: uppercase;
      color: #2563eb;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    .party p { margin: 4px 0; color: #555; }
    .party strong { color: #333; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20px;
    }
    th { 
      background: #2563eb; 
      color: white; 
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
    }
    th:last-child, td:last-child { text-align: right; }
    td { 
      padding: 12px 8px; 
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) { background: #f9fafb; }
    
    .summary { 
      margin-left: auto;
      width: 300px;
    }
    .summary-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row.total { 
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      border-top: 2px solid #2563eb;
      border-bottom: none;
      padding-top: 12px;
    }
    .discount { color: #10b981; }
    
    .payment-info {
      margin-top: 30px;
      padding: 20px;
      background: #f0f9ff;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .payment-info h3 {
      color: #2563eb;
      margin-bottom: 10px;
    }
    
    .delivery-info {
      margin-top: 20px;
      padding: 20px;
      background: #f0fdf4;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .delivery-info h3 {
      color: #10b981;
      margin-bottom: 10px;
    }
    
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-paid { background: #d1fae5; color: #059669; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-failed { background: #fee2e2; color: #dc2626; }
    
    @media print {
      body { background: white; padding: 0; }
      .invoice { box-shadow: none; padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company">
        <div class="logo">H<span>BIKE</span> JAPAN</div>
        <p>〒651-0077 神戸市中央区日暮通2-4-18-1F</p>
        <p>TEL: 078-123-4567</p>
        <p>Email: contact@hbike.jp</p>
        <p>法人番号: T1234567890123</p>
      </div>
      <div class="invoice-info">
        <h2>請求書</h2>
        <p><strong>請求書番号:</strong> ${order.invoiceNumber}</p>
        <p><strong>発行日:</strong> ${formatDate(order.invoiceGeneratedAt || new Date())}</p>
        <p><strong>注文番号:</strong> ${order.orderNumber}</p>
        <p>
          <span class="status-badge status-${order.paymentStatus}">
            ${order.paymentStatus === 'paid' ? '支払済み' : order.paymentStatus === 'pending' ? '未払い' : '失敗'}
          </span>
        </p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>販売者情報</h3>
        <p><strong>HBIKE JAPAN株式会社</strong></p>
        <p>〒651-0077 神戸市中央区日暮通2-4-18-1F</p>
        <p>TEL: 078-123-4567</p>
        <p>Email: contact@hbike.jp</p>
      </div>
      <div class="party">
        <h3>購入者情報</h3>
        <p><strong>${order.customer.name}</strong></p>
        <p>${order.customer.address?.street || ''}, ${order.customer.address?.city || ''}</p>
        <p>${order.customer.address?.prefecture || ''}</p>
        <p>TEL: ${order.customer.phone}</p>
        <p>Email: ${order.customer.email}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px">No.</th>
          <th>商品名</th>
          <th style="width: 100px">バッテリー</th>
          <th style="width: 80px">状態</th>
          <th style="width: 60px">数量</th>
          <th style="width: 120px">単価</th>
          <th style="width: 120px">金額</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.name}</strong>
              ${item.batteryPriceAdjustment ? `<br><small style="color: #666">+ バッテリー: ${formatCurrency(item.batteryPriceAdjustment)}</small>` : ''}
              ${item.conditionPriceAdjustment ? `<br><small style="color: #666">+ 新品: ${formatCurrency(item.conditionPriceAdjustment)}</small>` : ''}
            </td>
            <td>${getBatteryName(item.selectedBattery)}</td>
            <td>${item.selectedCondition === 'new' ? '新品' : '中古'}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price + (item.batteryPriceAdjustment || 0) + (item.conditionPriceAdjustment || 0))}</td>
            <td>${formatCurrency((item.price + (item.batteryPriceAdjustment || 0) + (item.conditionPriceAdjustment || 0)) * item.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>小計:</span>
        <span>${formatCurrency(order.subtotal || order.totalAmount)}</span>
      </div>
      ${order.loyaltyDiscount?.amount > 0 ? `
        <div class="summary-row discount">
          <span>会員割引 (${order.loyaltyDiscount.percent}%):</span>
          <span>-${formatCurrency(order.loyaltyDiscount.amount)}</span>
        </div>
      ` : ''}
      ${order.couponDiscount?.amount > 0 ? `
        <div class="summary-row discount">
          <span>クーポン (${order.couponDiscount.code}):</span>
          <span>-${formatCurrency(order.couponDiscount.amount)}</span>
        </div>
      ` : ''}
      <div class="summary-row">
        <span>配送料:</span>
        <span>${order.shippingFee > 0 ? formatCurrency(order.shippingFee) : '無料'}</span>
      </div>
      ${order.codFee > 0 ? `
        <div class="summary-row">
          <span>代引き手数料:</span>
          <span>${formatCurrency(order.codFee)}</span>
        </div>
      ` : ''}
      <div class="summary-row total">
        <span>合計:</span>
        <span>${formatCurrency(order.totalAmount)}</span>
      </div>
    </div>

    <div class="payment-info">
      <h3>💳 お支払い情報</h3>
      <p><strong>お支払い方法:</strong> ${getPaymentMethodName(order.paymentMethod)}</p>
      ${order.paymentMethod === 'bank_transfer' || order.paymentMethod === 'visa_card' ? `
        <p style="margin-top: 10px"><strong>振込先:</strong></p>
        <p>銀行: SMBC三井住友銀行 神戸支店</p>
        <p>口座番号: 1234567</p>
        <p>口座名義: HBIKE JAPAN株式会社</p>
        <p>振込内容: ${order.orderNumber}</p>
      ` : ''}
    </div>

    ${order.deliveryPreference?.preferredDate ? `
      <div class="delivery-info">
        <h3>🚚 配送情報</h3>
        <p><strong>希望配達日:</strong> ${formatDate(order.deliveryPreference.preferredDate)}</p>
        <p><strong>時間帯:</strong> ${getTimeSlotName(order.deliveryPreference.preferredTimeSlot)}</p>
        ${order.deliveryPreference.timeFrom ? `<p><strong>指定時間:</strong> ${order.deliveryPreference.timeFrom} - ${order.deliveryPreference.timeTo}</p>` : ''}
        ${order.deliveryPreference.specialInstructions ? `<p><strong>備考:</strong> ${order.deliveryPreference.specialInstructions}</p>` : ''}
      </div>
    ` : ''}

    ${order.notes ? `
      <div style="margin-top: 20px; padding: 15px; background: #fff7ed; border-radius: 8px; border-left: 4px solid #f97316;">
        <h3 style="color: #f97316; margin-bottom: 10px;">📝 注文メモ</h3>
        <p>${order.notes}</p>
      </div>
    ` : ''}

    <div class="footer">
      <p><strong>HBIKE JAPANをご利用いただきありがとうございます！</strong></p>
      <p>お問い合わせ: 078-123-4567 | contact@hbike.jp</p>
      <p style="margin-top: 10px; color: #999;">この請求書はHBIKEシステムにより自動生成されました</p>
    </div>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 12px 30px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
      🖨️ 印刷する / Print
    </button>
  </div>
  <script>
    // Auto-trigger print dialog when page loads
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper functions
function getPaymentMethodName(method) {
  const names = {
    'bank_transfer': '銀行振込',
    'cod': '代金引換 (COD)',
    'visa_card': 'クレジットカード'
  };
  return names[method] || method;
}

function getBatteryName(type) {
  const names = {
    'lithium_basic': 'リチウム基本',
    'lithium_standard': 'リチウム標準',
    'lithium_premium': 'リチウムプレミアム',
    'lead_acid': '鉛蓄電池'
  };
  return names[type] || type;
}

function getTimeSlotName(slot) {
  const names = {
    'morning': '午前 (8時〜12時)',
    'afternoon': '午後 (13時〜17時)',
    'evening': '夜間 (18時〜21時)',
    'anytime': '指定なし'
  };
  return names[slot] || slot;
}

export default router;
