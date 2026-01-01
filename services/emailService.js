import nodemailer from 'nodemailer';

// Gmail SMTP configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
    }
  });
};

// Email templates
const templates = {
  orderConfirmation: (order, language = 'vi') => {
    const isJa = language === 'ja';
    return {
      subject: isJa 
        ? `【HBike Japan】ご注文確認 #${order.orderNumber}` 
        : `【HBike Japan】Xác nhận đơn hàng #${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-size: 24px; color: #10b981; font-weight: bold; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚲 HBike Japan</h1>
              <p>${isJa ? 'ご注文ありがとうございます！' : 'Cảm ơn bạn đã đặt hàng!'}</p>
            </div>
            <div class="content">
              <h2>${isJa ? '注文確認' : 'Xác nhận đơn hàng'}</h2>
              <p>${isJa ? 'お客様' : 'Xin chào'} <strong>${order.customer.name}</strong>,</p>
              <p>${isJa ? 'ご注文を受け付けました。' : 'Đơn hàng của bạn đã được tiếp nhận.'}</p>
              
              <div class="order-info">
                <p><strong>${isJa ? '注文番号' : 'Mã đơn hàng'}:</strong> ${order.orderNumber}</p>
                <p><strong>${isJa ? '注文日' : 'Ngày đặt'}:</strong> ${new Date(order.createdAt).toLocaleDateString(isJa ? 'ja-JP' : 'vi-VN')}</p>
                <p><strong>${isJa ? 'お届け先' : 'Địa chỉ giao hàng'}:</strong> ${order.customer.address?.street || ''}, ${order.customer.address?.city || ''}</p>
                ${order.deliveryPreference?.preferredDate ? `
                <p><strong>${isJa ? '希望配達日' : 'Ngày giao mong muốn'}:</strong> ${new Date(order.deliveryPreference.preferredDate).toLocaleDateString(isJa ? 'ja-JP' : 'vi-VN')}</p>
                ` : ''}
              </div>

              <h3>${isJa ? '注文内容' : 'Chi tiết đơn hàng'}</h3>
              ${order.items.map(item => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>¥${item.price.toLocaleString()}</span>
                </div>
              `).join('')}
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #10b981;">
                ${order.shippingFee > 0 ? `<p>${isJa ? '送料' : 'Phí ship'}: ¥${order.shippingFee.toLocaleString()}</p>` : ''}
                ${order.codFee > 0 ? `<p>${isJa ? '代引き手数料' : 'Phí COD'}: ¥${order.codFee.toLocaleString()}</p>` : ''}
                ${order.loyaltyDiscount?.amount > 0 ? `<p style="color: #10b981;">${isJa ? '会員割引' : 'Giảm giá KH thân thiết'}: -¥${order.loyaltyDiscount.amount.toLocaleString()}</p>` : ''}
                <p class="total">${isJa ? '合計' : 'Tổng cộng'}: ¥${order.totalAmount.toLocaleString()}</p>
              </div>

              ${order.restaurantCoupon ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4>🎁 ${isJa ? '特典クーポン' : 'Mã khuyến mãi quán ăn'}</h4>
                <p>${isJa ? 'ご購入ありがとうございます！提携レストランでご利用いただけるクーポンをプレゼント：' : 'Cảm ơn bạn đã mua xe! Nhận ngay mã giảm giá tại quán ăn đối tác:'}</p>
                <p style="font-size: 24px; font-weight: bold; color: #d97706;">${order.restaurantCoupon}</p>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>HBike Japan</p>
              <p>〒651-0077 神戸市中央区日暮通2-4-18-1F</p>
              <p>📧 ${process.env.GMAIL_USER || 'info@hbikejapan.com'}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  orderStatusUpdate: (order, newStatus, language = 'vi') => {
    const isJa = language === 'ja';
    const statusLabels = {
      vi: {
        pending: 'Chờ xử lý',
        confirmed: 'Đã xác nhận',
        processing: 'Đang xử lý',
        shipped: 'Đang giao hàng',
        delivered: 'Đã giao hàng',
        cancelled: 'Đã hủy'
      },
      ja: {
        pending: '処理待ち',
        confirmed: '確認済み',
        processing: '処理中',
        shipped: '配送中',
        delivered: '配達完了',
        cancelled: 'キャンセル'
      }
    };

    return {
      subject: isJa 
        ? `【HBike Japan】注文状況更新 #${order.orderNumber}` 
        : `【HBike Japan】Cập nhật trạng thái đơn hàng #${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .status-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚲 HBike Japan</h1>
              <p>${isJa ? '注文状況が更新されました' : 'Trạng thái đơn hàng đã cập nhật'}</p>
            </div>
            <div class="content">
              <p>${isJa ? 'お客様' : 'Xin chào'} <strong>${order.customer.name}</strong>,</p>
              <p>${isJa ? '注文番号' : 'Mã đơn hàng'}: <strong>${order.orderNumber}</strong></p>
              <p>${isJa ? '新しいステータス' : 'Trạng thái mới'}:</p>
              <p><span class="status-badge">${statusLabels[isJa ? 'ja' : 'vi'][newStatus]}</span></p>
              ${newStatus === 'shipped' ? `
              <p style="margin-top: 20px;">${isJa ? 'まもなくお届けします！' : 'Đơn hàng đang trên đường giao đến bạn!'}</p>
              ` : ''}
              ${newStatus === 'delivered' ? `
              <p style="margin-top: 20px;">${isJa ? 'ご利用ありがとうございました！またのご来店をお待ちしております。' : 'Cảm ơn bạn đã mua hàng! Hẹn gặp lại.'}</p>
              ` : ''}
            </div>
            <div class="footer">
              <p>HBike Japan</p>
              <p>〒651-0077 神戸市中央区日暮通2-4-18-1F</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  promotionNotification: (customer, promotion, language = 'vi') => {
    const isJa = language === 'ja';
    return {
      subject: isJa 
        ? `【HBike Japan】${promotion.title}` 
        : `【HBike Japan】${promotion.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .promo-code { background: #fef3c7; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #d97706; letter-spacing: 2px; }
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ${promotion.title}</h1>
            </div>
            <div class="content">
              <p>${isJa ? 'お客様' : 'Xin chào'} <strong>${customer.name}</strong>,</p>
              <p>${promotion.description}</p>
              ${promotion.code ? `
              <div class="promo-code">
                <p>${isJa ? 'クーポンコード' : 'Mã giảm giá'}:</p>
                <p class="code">${promotion.code}</p>
                <p>${isJa ? `${promotion.discount}%オフ` : `Giảm ${promotion.discount}%`}</p>
              </div>
              ` : ''}
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/products" class="btn">
                  ${isJa ? '今すぐ購入' : 'Mua ngay'}
                </a>
              </p>
            </div>
            <div class="footer">
              <p>HBike Japan</p>
              <p>〒651-0077 神戸市中央区日暮通2-4-18-1F</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
};

// Send email function
export async function sendEmail(to, template, data, language = 'vi') {
  try {
    const transporter = createTransporter();
    const emailContent = templates[template](data, language);

    const mailOptions = {
      from: `"HBike Japan" <${process.env.GMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

// Send order confirmation email
export async function sendOrderConfirmation(order, language = 'vi') {
  return sendEmail(order.customer.email, 'orderConfirmation', order, language);
}

// Send order status update email
export async function sendOrderStatusUpdate(order, newStatus, language = 'vi') {
  return sendEmail(order.customer.email, 'orderStatusUpdate', { ...order, newStatus }, language);
}

// Send promotion notification to customers
export async function sendPromotionNotification(customers, promotion, language = 'vi') {
  const results = [];
  for (const customer of customers) {
    const result = await sendEmail(customer.email, 'promotionNotification', { customer, promotion }, language);
    results.push({ email: customer.email, ...result });
  }
  return results;
}

export default {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPromotionNotification,
  templates
};
