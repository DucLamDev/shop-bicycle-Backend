import express from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
import User from '../models/User.js';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Google OAuth - Redirect to Google
router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get('/google/callback',
  (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    passport.authenticate('google', { 
      session: false, 
      failureRedirect: `${frontendUrl}/login?error=google_auth_failed` 
    })(req, res, next);
  },
  (req, res) => {
    try {
      const token = generateToken(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar
      }))}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
    }
  }
);

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth login/register
 * @access  Public
 */
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin từ Google'
      });
    }

    // Tìm user theo googleId hoặc email
    let user = await User.findOne({ 
      $or: [
        { googleId },
        { email }
      ]
    });

    if (user) {
      // Nếu user đã tồn tại nhưng chưa liên kết Google
      if (!user.googleId && user.authProvider === 'local') {
        user.googleId = googleId;
        user.avatar = avatar;
        user.authProvider = 'google';
        await user.save();
      }
    } else {
      // Tạo user mới
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        authProvider: 'google',
        role: 'user'
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập với Google',
      error: error.message
    });
  }
});

export default router;
