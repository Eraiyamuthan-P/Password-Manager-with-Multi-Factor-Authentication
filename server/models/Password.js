const mongoose = require('mongoose');

const PasswordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // All sensitive data is encrypted on client-side (Zero-Knowledge)
  encryptedData: {
    type: String,
    required: true
  },
  // Metadata (not encrypted - for searching/filtering)
  website: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['social', 'banking', 'email', 'work', 'shopping', 'other'],
    default: 'other'
  },
  favorite: {
    type: Boolean,
    default: false
  },
  // Security Score (calculated on client)
  securityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Breach Detection
  breached: {
    type: Boolean,
    default: false
  },
  lastBreachCheck: {
    type: Date,
    default: null
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: null
  }
});

// Index for faster queries
PasswordSchema.index({ userId: 1, website: 1 });
PasswordSchema.index({ userId: 1, category: 1 });

// Pre-save hook
PasswordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Password', PasswordSchema);
