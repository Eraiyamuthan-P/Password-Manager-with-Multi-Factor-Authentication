// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // This is NOT the master password! It's a hash for authentication
  masterPasswordHash: {
    type: String,
    required: true
  },
  // Salt for additional security
  salt: {
    type: String,
    required: true
  },
  // Encrypted vault key (encrypted with master password on client)
  encryptedVaultKey: {
    type: String,
    required: true
  },
  // 2FA Settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  // Security Settings
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // ──────────────────────────────────────────────────────────────
  //  NEW: EMAIL VERIFICATION (ADDED BY YOU)
  // ──────────────────────────────────────────────────────────────
  isVerified: {
    type: Boolean,
    default: false
  },
  verifyToken: {
    type: String,
    default: null
  },
  verifyExpires: {
    type: Date,
    default: null
  },

  // ──────────────────────────────────────────────────────────────
  //  NEW: FACE AUTHENTICATION (ADDED NOW — NO LINES REMOVED)
  // ──────────────────────────────────────────────────────────────
  faceAuthEnabled: {
    type: Boolean,
    default: false
  },
  faceAuthTemplate: {
    type: String,
    default: null
  },

  // ──────────────────────────────────────────────────────────────
  //  NEW: EMAIL OTP AUTHENTICATION (2-FACTOR EMAIL VERIFICATION)
  // ──────────────────────────────────────────────────────────────
  emailOTP: {
    type: String,
    default: null
  },
  emailOTPExpires: {
    type: Date,
    default: null
  },
  emailOTPRequestedAt: {
    type: Date,
    default: null
  },
  emailOTPAttempts: {
    type: Number,
    default: 0
  },
  emailOTPLockedUntil: {
    type: Date,
    default: null
  },

  // ──────────────────────────────────────────────────────────────
  //  FORGOT PASSWORD OTP FIELDS
  // ──────────────────────────────────────────────────────────────
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordOTPExpiry: {
    type: Date,
    default: null
  }
});

// Pre-save hook to update timestamp
UserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare master password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.masterPasswordHash);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

module.exports = mongoose.model('User', UserSchema);