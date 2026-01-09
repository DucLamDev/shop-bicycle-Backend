import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Event notification template
const eventNotificationTemplate = (customer, event, language = 'vi') => {
  const isJa = language === 'ja';
  return {
    subject: isJa 
      ? `【HBike Japan】${event.title}` 
      : `【HBike Japan】${event.title}`,
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
          .event-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          .event-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚲 HBike Japan</h1>
            <p>${isJa ? '新着情報のお知らせ' : 'Thông báo sự kiện mới'}</p>
          </div>
          <div class="content">
            <p>${isJa ? 'お客様' : 'Xin chào'} <strong>${customer.name || customer.email}</strong>,</p>
            
            <div class="event-box">
              <h2 style="color: #10b981; margin-top: 0;">${event.title}</h2>
              ${event.image ? `<img src="${event.image}" alt="${event.title}" class="event-image" />` : ''}
              <p>${event.description}</p>
              ${event.startDate ? `
              <p style="color: #6b7280; font-size: 14px;">
                📅 ${isJa ? '開催期間' : 'Thời gian'}: ${new Date(event.startDate).toLocaleDateString(isJa ? 'ja-JP' : 'vi-VN')}
                ${event.endDate ? ` - ${new Date(event.endDate).toLocaleDateString(isJa ? 'ja-JP' : 'vi-VN')}` : ''}
              </p>
              ` : ''}
              ${event.couponCode ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">${isJa ? 'クーポンコード' : 'Mã giảm giá'}:</p>
                <p style="font-size: 24px; font-weight: bold; color: #d97706; margin: 10px 0; font-family: monospace;">${event.couponCode}</p>
                ${event.discount ? `<p style="color: #92400e; margin: 0;">${isJa ? `${event.discount}%オフ` : `Giảm ${event.discount}%`}</p>` : ''}
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://hungthinhbike.cloud'}" class="btn">
                ${isJa ? '今すぐチェック' : 'Xem ngay'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 HBike Japan. ${isJa ? '全著作権所有' : 'All rights reserved.'}</p>
            <p style="font-size: 12px; margin-top: 10px;">
              ${isJa 
                ? 'このメールは自動送信されています。配信停止をご希望の場合は、返信にてお知らせください。' 
                : 'Email này được gửi tự động. Nếu bạn không muốn nhận thông báo, vui lòng trả lời email này.'}
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Send event notification to all customers
router.post('/send-event', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, image, startDate, endDate, couponCode, discount, targetGroup } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và mô tả là bắt buộc'
      });
    }

    const event = {
      title,
      description,
      image,
      startDate,
      endDate,
      couponCode,
      discount
    };

    // Get customers based on target group
    let customers = [];
    
    if (targetGroup === 'all' || !targetGroup) {
      // Get all customers from Customer model
      const customerList = await Customer.find({ email: { $exists: true, $ne: '' } });
      customers = customerList.map(c => ({ name: c.name, email: c.email }));
      
      // Also get users with role 'user'
      const userList = await User.find({ role: 'user', email: { $exists: true, $ne: '' } });
      const userEmails = customers.map(c => c.email);
      userList.forEach(u => {
        if (!userEmails.includes(u.email)) {
          customers.push({ name: u.name, email: u.email });
        }
      });
    } else if (targetGroup === 'returning') {
      // Get returning customers (those with orders)
      const customerList = await Customer.find({ 
        email: { $exists: true, $ne: '' },
        totalOrders: { $gt: 0 }
      });
      customers = customerList.map(c => ({ name: c.name, email: c.email }));
    } else if (targetGroup === 'new') {
      // Get new customers (registered but no orders)
      const customerList = await Customer.find({ 
        email: { $exists: true, $ne: '' },
        totalOrders: 0
      });
      customers = customerList.map(c => ({ name: c.name, email: c.email }));
    }

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy khách hàng nào để gửi thông báo'
      });
    }

    // Send emails
    const results = [];
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    for (const customer of customers) {
      try {
        const emailContent = eventNotificationTemplate(customer, event, 'vi');
        
        await transporter.sendMail({
          from: `"HBike Japan" <${process.env.GMAIL_USER}>`,
          to: customer.email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        results.push({ email: customer.email, success: true });
      } catch (error) {
        results.push({ email: customer.email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Đã gửi thành công ${successCount}/${customers.length} email`,
      data: {
        total: customers.length,
        success: successCount,
        failed: failCount,
        details: results
      }
    });

  } catch (error) {
    console.error('Send event notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get notification history (optional - for future use)
router.get('/history', protect, authorize('admin'), async (req, res) => {
  // This can be implemented with a NotificationHistory model later
  res.json({
    success: true,
    data: [],
    message: 'Notification history feature coming soon'
  });
});

export default router;
