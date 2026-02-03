const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Password = require('../models/Password');
const auth = require('../middleware/auth');

// Get all passwords for user
router.get('/', auth, async (req, res) => {
  try {
    const passwords = await Password.find({ userId: req.userId })
      .sort({ favorite: -1, updatedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: passwords.length,
      passwords
    });
  } catch (error) {
    console.error('Get passwords error:', error);
    res.status(500).json({ success: false, message: 'Error fetching passwords' });
  }
});

// Get single password
router.get('/:id', auth, async (req, res) => {
  try {
    const password = await Password.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!password) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    // Update last used
    password.lastUsed = Date.now();
    await password.save();

    res.json({
      success: true,
      password
    });
  } catch (error) {
    console.error('Get password error:', error);
    res.status(500).json({ success: false, message: 'Error fetching password' });
  }
});

// Create new password
router.post('/', auth, [
  body('encryptedData').notEmpty(),
  body('website').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { encryptedData, website, category, securityScore } = req.body;

    const password = new Password({
      userId: req.userId,
      encryptedData,
      website: website || '',
      category: category || 'other',
      securityScore: securityScore || 0
    });

    await password.save();

    res.status(201).json({
      success: true,
      message: 'Password saved successfully',
      password
    });
  } catch (error) {
    console.error('Create password error:', error);
    res.status(500).json({ success: false, message: 'Error saving password' });
  }
});

// Update password
router.put('/:id', auth, async (req, res) => {
  try {
    const { encryptedData, website, category, favorite, securityScore, breached } = req.body;

    const password = await Password.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!password) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    // Update fields
    if (encryptedData) password.encryptedData = encryptedData;
    if (website !== undefined) password.website = website;
    if (category) password.category = category;
    if (favorite !== undefined) password.favorite = favorite;
    if (securityScore !== undefined) password.securityScore = securityScore;
    if (breached !== undefined) {
      password.breached = breached;
      password.lastBreachCheck = Date.now();
    }

    await password.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
      password
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// Delete password
router.delete('/:id', auth, async (req, res) => {
  try {
    const password = await Password.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!password) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    res.json({
      success: true,
      message: 'Password deleted successfully'
    });
  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({ success: false, message: 'Error deleting password' });
  }
});

// Toggle favorite
router.patch('/:id/favorite', auth, async (req, res) => {
  try {
    const password = await Password.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!password) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    password.favorite = !password.favorite;
    await password.save();

    res.json({
      success: true,
      message: `Password ${password.favorite ? 'added to' : 'removed from'} favorites`,
      password
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Error updating favorite status' });
  }
});

// Get statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const total = await Password.countDocuments({ userId: req.userId });
    const breached = await Password.countDocuments({ userId: req.userId, breached: true });
    const weak = await Password.countDocuments({ userId: req.userId, securityScore: { $lt: 50 } });
    const favorites = await Password.countDocuments({ userId: req.userId, favorite: true });

    const passwords = await Password.find({ userId: req.userId }).select('securityScore');
    const avgScore = passwords.length > 0 
      ? passwords.reduce((sum, p) => sum + p.securityScore, 0) / passwords.length 
      : 0;

    res.json({
      success: true,
      stats: {
        total,
        breached,
        weak,
        favorites,
        averageSecurityScore: Math.round(avgScore)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

module.exports = router;
