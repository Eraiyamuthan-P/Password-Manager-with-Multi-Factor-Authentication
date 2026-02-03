const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const axios = require('axios');
const useragent = require('useragent');

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "studentbubble00@gmail.com",
    pass: "nqcb htux srdp ajxj",
  },
});

// Function to send login email
async function sendLoginAlert(email, ip, device, location) {
  const mailOptions = {
    from: `"Security Alert" <studentbubble00@gmail.com>`,
    to: email,
    subject: "New Login Detected",
    text: `A new login occurred on your account.

Email: ${email}
IP Address: ${ip}
Location: ${location.city}, ${location.country}
Device: ${device}
Time: ${new Date().toLocaleString()}

If this wasn't you, please reset your password immediately.`,
  };

  await transporter.sendMail(mailOptions);
}

// NEW: WELCOME EMAIL AFTER REGISTRATION
async function sendWelcomeEmail(email, tempLoginToken) {
  const loginUrl = `${process.env.CLIENT_URL}/auto-login?token=${tempLoginToken}`;

  const mailOptions = {
    from: '"Password Manager" <studentbubble00@gmail.com>',
    to: email,
    subject: "Welcome! Your account is ready",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background:#f9f9f9;">
        <h2 style="color: #2c3e50;">Welcome to Password Manager!</h2>
        <p>Your account <strong>${email}</strong> was created successfully.</p>
        <p>Click below to log in instantly — no password needed for the first 10 minutes:</p>
        <div style="text-align:center; margin:25px 0;">
          <a href="${loginUrl}" 
             style="background:#3498db; color:white; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold;">
            Secure One-Click Login
          </a>
        </div>
        <p style="color:#7f8c8d; font-size:0.9em;">
          This link is valid for <strong>10 minutes</strong>.<br>
          If you didn’t create this account, ignore this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// NEW: Generate 10-min temporary login token
function generateTempLoginToken(userId) {
  return jwt.sign(
    { userId, temp: true },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
}

// =================== REGISTER ===================
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('masterPasswordHash').isLength({ min: 8 }),
  body('encryptedVaultKey').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, masterPasswordHash, encryptedVaultKey, salt } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(masterPasswordHash, 12);

    user = new User({
      email,
      masterPasswordHash: hashedPassword,
      encryptedVaultKey,
      salt: salt || ''
    });

    await user.save();

    // Generate and send email OTP for verification
    const otp = generateOTP();
    user.emailOTP = await bcrypt.hash(otp, 10);
    user.emailOTPExpires = Date.now() + (10 * 60 * 1000); // 10 minutes
    user.emailOTPRequestedAt = Date.now();
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, 'signup');

    res.status(201).json({
      success: true,
      requiresEmailOTP: true,
      message: 'Registration successful! Please check your email for verification code.',
      email: user.email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// =================== AUTO-LOGIN (Magic Link) ===================
router.get('/auto-login', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=missing_token`);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.temp) throw new Error('Invalid token type');

    const realToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${process.env.CLIENT_URL}/?token=${realToken}&welcome=true`);
  } catch (err) {
    console.error('Magic link error:', err.message);
    res.redirect(`${process.env.CLIENT_URL}/login?error=expired`);
  }
});

// =================== LOGIN ===================
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('masterPasswordHash').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, masterPasswordHash, twoFactorToken } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes`
      });
    }

    const isMatch = await user.comparePassword(masterPasswordHash);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + (15 * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if 2FA token is provided (for authenticator app login)
    if (twoFactorToken) {
      if (!user.twoFactorEnabled) {
        return res.status(400).json({ 
          success: false, 
          message: '2FA is not enabled for this account' 
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
      }

      // 2FA verified, skip OTP and proceed to generate token
      user.loginAttempts = 0;
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          twoFAEnabled: user.twoFactorEnabled,
          faceAuthEnabled: user.faceAuthEnabled,
          encryptedVaultKey: user.encryptedVaultKey,
          salt: user.salt
        }
      });
    }

    // EMAIL OTP CHECK (First layer of security after password)
    // Generate and send OTP if not already sent or expired
    if (!user.emailOTP || !user.emailOTPExpires || user.emailOTPExpires < Date.now()) {
      const otp = generateOTP();
      user.emailOTP = await bcrypt.hash(otp, 10);
      user.emailOTPExpires = Date.now() + (10 * 60 * 1000); // 10 minutes
      user.emailOTPRequestedAt = Date.now();
      user.emailOTPAttempts = 0;
      await user.save();
      
      // Send OTP email
      await sendOTPEmail(user.email, otp, 'login');
      
      return res.status(200).json({
        success: false,
        requiresEmailOTP: true,
        message: 'Verification code sent to your email'
      });
    }

    // Note: Face auth is a separate login method, not required here
    // Users who want face auth should use face-auth-standalone.html

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = Date.now();
    await user.save();

    const userIP = req.headers["x-forwarded-for"] || req.ip;
    const agent = useragent.parse(req.headers["user-agent"]);
    const device = `${agent.family} on ${agent.os.family}`;

    let location = { city: "Unknown", country: "Unknown" };
    try {
      const response = await axios.get(`https://ipapi.co/${userIP}/json/`);
      location.city = response.data.city || "Unknown";
      location.country = response.data.country_name || "Unknown";
    } catch (e) {
      console.error("IP lookup failed:", e.message);
    }

    sendLoginAlert(user.email, userIP, device, location).catch(console.error);

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        encryptedVaultKey: user.encryptedVaultKey,
        twoFactorEnabled: user.twoFactorEnabled,
        faceAuthEnabled: user.faceAuthEnabled,
        salt: user.salt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// =================== GET USER ===================
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        encryptedVaultKey: req.user.encryptedVaultKey,
        twoFactorEnabled: req.user.twoFactorEnabled,
        faceAuthEnabled: req.user.faceAuthEnabled,
        salt: req.user.salt,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =================== FACE ENROLL ===================
router.post('/face/enroll', auth, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor) {
      return res.status(400).json({ success: false, message: 'Face descriptor required' });
    }

    req.user.faceAuthTemplate = faceDescriptor;
    req.user.faceAuthEnabled = true;
    await req.user.save();

    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (error) {
    console.error('Face enroll error:', error);
    res.status(500).json({ success: false, message: 'Enrollment failed' });
  }
});

// =================== FACE VERIFY (PUBLIC) ===================
router.post('/face/verify', async (req, res) => {
  try {
    console.log('--- /face/verify called ---');
    const { email, faceDescriptor } = req.body;

    if (!email || !faceDescriptor) {
      console.error('Missing email or faceDescriptor');
      return res.status(400).json({ success: false, message: 'Email and face descriptor required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'User not found' });
    if (!user.faceAuthEnabled || !user.faceAuthTemplate) {
      return res.status(400).json({ success: false, message: 'Face authentication not enabled' });
    }

    function base64ToFloat32Array(b64) {
      const buf = Buffer.from(b64, 'base64');
      return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
    }

    const stored = base64ToFloat32Array(user.faceAuthTemplate);
    const incoming = base64ToFloat32Array(faceDescriptor);

    // --- COSINE DISTANCE (Better Accuracy) ---
    function cosineDistance(a, b) {
      let dot = 0.0, normA = 0.0, normB = 0.0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const distance = cosineDistance(stored, incoming);
    console.log('Cosine distance:', distance);

    const FACE_MATCH_THRESHOLD = 0.45; // Lower = stricter, try 0.4–0.5
    if (distance < FACE_MATCH_THRESHOLD) {
      console.log('✅ Face recognized!');
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          encryptedVaultKey: user.encryptedVaultKey,
          twoFactorEnabled: user.twoFactorEnabled,
          faceAuthEnabled: user.faceAuthEnabled,
          salt: user.salt
        }
      });
    } else {
      console.warn('❌ Face not recognized. Distance too high:', distance);
      res.json({ success: false, message: `Face not recognized (distance: ${distance.toFixed(3)})` });
    }
  } catch (error) {
    console.error('Face verify error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// =================== FACE DISABLE ===================
router.post('/face/disable', auth, async (req, res) => {
  try {
    req.user.faceAuthEnabled = false;
    req.user.faceAuthTemplate = null;
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// =================== 2FA SETUP ===================
router.post('/2fa/setup', auth, async (req, res) => {
  try {
    console.log('=== 2FA Setup Request ===');
    console.log('User ID:', req.user._id);
    console.log('User email:', req.user.email);
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Password Manager (${req.user.email})`,
      length: 32
    });

    console.log('Generated secret:', secret.base32);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store temporarily (don't enable until verified)
    req.user.twoFactorSecret = secret.base32;
    const savedUser = await req.user.save();
    
    console.log('Secret saved to DB:', !!savedUser.twoFactorSecret);
    console.log('Saved secret value:', savedUser.twoFactorSecret);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ success: false, message: 'Failed to setup 2FA' });
  }
});

// =================== 2FA VERIFY & ENABLE ===================
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('=== 2FA Verify Request ===');
    console.log('Request body:', req.body);
    console.log('Token received:', token);
    console.log('User ID:', req.user._id);
    console.log('User has twoFactorSecret:', !!req.user.twoFactorSecret);

    if (!token || !req.user.twoFactorSecret) {
      console.error('Validation failed - token:', !!token, 'secret:', !!req.user.twoFactorSecret);
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const verified = speakeasy.totp.verify({
      secret: req.user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
    }

    req.user.twoFactorEnabled = true;
    await req.user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// =================== 2FA DISABLE ===================
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    req.user.twoFactorEnabled = false;
    req.user.twoFactorSecret = null;
    await req.user.save();
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// =================== EMAIL OTP HELPERS ===================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function sendOTPEmail(email, otp, purpose = 'login') {
  const subject = purpose === 'signup' ? 'Verify Your Registration' : 'Login Verification Code';
  const mailOptions = {
    from: '"Password Manager Security" <studentbubble00@gmail.com>',
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background:#f9f9f9;">
        <h2 style="color: #2c3e50; text-align: center;">Your Verification Code</h2>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Your OTP code is:</p>
          <h1 style="margin: 10px 0; font-size: 48px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
        </div>
        <p style="color: #555; text-align: center;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// =================== SEND EMAIL OTP (DURING REGISTRATION) ===================
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body; // purpose: 'signup' or 'login'
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const user = await User.findOne({ email });
    
    // For signup: user should exist but not have verified
    // For login: user must exist
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Check if user is locked out
    if (user.emailOTPLockedUntil && user.emailOTPLockedUntil > Date.now()) {
      const lockMinutes = Math.ceil((user.emailOTPLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lockMinutes} minutes.`
      });
    }

    // Rate limiting: 60 seconds between requests
    if (user.emailOTPRequestedAt && (Date.now() - user.emailOTPRequestedAt.getTime()) < 60000) {
      const waitTime = Math.ceil((60000 - (Date.now() - user.emailOTPRequestedAt.getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitTime} seconds before requesting another code.`
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    user.emailOTP = await bcrypt.hash(otp, 10); // Hash the OTP
    user.emailOTPExpires = Date.now() + (10 * 60 * 1000); // 10 minutes
    user.emailOTPRequestedAt = Date.now();
    user.emailOTPAttempts = 0; // Reset attempts on new OTP
    await user.save();

    // Send email
    await sendOTPEmail(email, otp, purpose);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: 600 // seconds
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

// =================== VERIFY SIGNUP OTP ===================
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Check lockout
    if (user.emailOTPLockedUntil && user.emailOTPLockedUntil > Date.now()) {
      const lockMinutes = Math.ceil((user.emailOTPLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockMinutes} minutes.`
      });
    }

    // Check if OTP exists and not expired
    if (!user.emailOTP || !user.emailOTPExpires) {
      return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
    }

    if (user.emailOTPExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.emailOTP);
    if (!isValid) {
      user.emailOTPAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.emailOTPAttempts >= 5) {
        user.emailOTPLockedUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
        await user.save();
        return res.status(423).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }
      
      await user.save();
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${5 - user.emailOTPAttempts} attempts remaining.`
      });
    }

    // Success! Clear OTP fields and generate token
    user.emailOTP = null;
    user.emailOTPExpires = null;
    user.emailOTPRequestedAt = null;
    user.emailOTPAttempts = 0;
    user.emailOTPLockedUntil = null;
    user.isVerified = true; // Mark as verified
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        encryptedVaultKey: user.encryptedVaultKey,
        salt: user.salt
      }
    });
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// =================== VERIFY LOGIN OTP ===================
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Check lockout
    if (user.emailOTPLockedUntil && user.emailOTPLockedUntil > Date.now()) {
      const lockMinutes = Math.ceil((user.emailOTPLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockMinutes} minutes.`
      });
    }

    // Check if OTP exists and not expired
    if (!user.emailOTP || !user.emailOTPExpires) {
      return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
    }

    if (user.emailOTPExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.emailOTP);
    if (!isValid) {
      user.emailOTPAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.emailOTPAttempts >= 5) {
        user.emailOTPLockedUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
        await user.save();
        return res.status(423).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }
      
      await user.save();
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${5 - user.emailOTPAttempts} attempts remaining.`
      });
    }

    // Success! Clear OTP fields and generate token
    user.emailOTP = null;
    user.emailOTPExpires = null;
    user.emailOTPRequestedAt = null;
    user.emailOTPAttempts = 0;
    user.emailOTPLockedUntil = null;
    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send login alert email
    const userIP = req.headers["x-forwarded-for"] || req.ip;
    const agent = useragent.parse(req.headers["user-agent"]);
    const device = `${agent.family} on ${agent.os.family}`;
    
    let location = { city: "Unknown", country: "Unknown" };
    try {
      const response = await axios.get(`https://ipapi.co/${userIP}/json/`);
      location.city = response.data.city || "Unknown";
      location.country = response.data.country_name || "Unknown";
    } catch (e) {
      console.error("IP lookup failed:", e.message);
    }

    sendLoginAlert(user.email, userIP, device, location).catch(console.error);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        encryptedVaultKey: user.encryptedVaultKey,
        twoFactorEnabled: user.twoFactorEnabled,
        faceAuthEnabled: user.faceAuthEnabled,
        salt: user.salt
      }
    });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// =================== RESEND OTP ===================
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body; // purpose: 'signup' or 'login'

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Check lockout
    if (user.emailOTPLockedUntil && user.emailOTPLockedUntil > Date.now()) {
      const lockMinutes = Math.ceil((user.emailOTPLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockMinutes} minutes.`
      });
    }

    // Rate limiting: 60 seconds between requests
    if (user.emailOTPRequestedAt && (Date.now() - user.emailOTPRequestedAt.getTime()) < 60000) {
      const waitTime = Math.ceil((60000 - (Date.now() - user.emailOTPRequestedAt.getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitTime} seconds before requesting another code.`
      });
    }

    // Generate and save new OTP
    const otp = generateOTP();
    user.emailOTP = await bcrypt.hash(otp, 10);
    user.emailOTPExpires = Date.now() + (10 * 60 * 1000); // 10 minutes
    user.emailOTPRequestedAt = Date.now();
    user.emailOTPAttempts = 0; // Reset attempts
    await user.save();

    // Send email
    await sendOTPEmail(email, otp, purpose);

    res.json({
      success: true,
      message: 'New verification code sent',
      expiresIn: 600
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend code' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    const mailOptions = {
      from: '"Password Manager" <studentbubble00@gmail.com>',
      to: email,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below to verify your identity:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #111827; margin: 0; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
          <p style="color: #6b7280;">If you didn't request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Password Manager Security Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

// Verify Reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if OTP exists and hasn't expired
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ success: false, message: 'No reset code found. Please request a new one.' });
    }

    if (new Date() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, purpose: 'reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    res.json({ success: true, resetToken, message: 'Verification successful' });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded.purpose !== 'reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash new password (newPassword should already be SHA-256 hash from frontend)
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.masterPasswordHash = hashedPassword;

    // Clear reset OTP fields and unlock account
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    user.loginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    // Send confirmation email
    const mailOptions = {
      from: '"Password Manager" <studentbubble00@gmail.com>',
      to: email,
      subject: 'Password Reset Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Password Reset Successful</h2>
          <p>Your password has been successfully reset.</p>
          <p>You can now login with your new password.</p>
          <p style="color: #6b7280; margin-top: 20px;">If you didn't make this change, please contact us immediately.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Password Manager Security Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

module.exports = router;
