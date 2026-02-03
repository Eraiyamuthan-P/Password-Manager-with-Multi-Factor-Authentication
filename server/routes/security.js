const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const auth = require('../middleware/auth');

// Check if password has been breached using HaveIBeenPwned API
router.post('/check-breach', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Hash password with SHA-1
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HaveIBeenPwned API (k-Anonymity model)
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      timeout: 5000
    });

    // Check if hash suffix exists in response
    const breached = response.data.split('\n').some(line => {
      const [hashSuffix] = line.split(':');
      return hashSuffix === suffix;
    });

    res.json({
      success: true,
      breached,
      message: breached 
        ? 'This password has been found in data breaches!' 
        : 'This password has not been found in any known breaches.'
    });
  } catch (error) {
    console.error('Breach check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking password breach status',
      breached: false // Default to safe if API fails
    });
  }
});

// Analyze password strength
router.post('/analyze-strength', auth, (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    else if (password.length < 8) feedback.push('Password should be at least 8 characters');

    // Complexity checks
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 10;
    else feedback.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    else feedback.push('Add special characters');

    // Variety check
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.5) score += 15;

    // Common patterns penalty
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }
    if (/123|abc|qwerty|password/i.test(password)) {
      score -= 20;
      feedback.push('Avoid common patterns');
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
    let strength = 'weak';
    if (score >= 80) strength = 'strong';
    else if (score >= 60) strength = 'medium';

    res.json({
      success: true,
      score,
      strength,
      feedback: feedback.length > 0 ? feedback : ['Password looks good!']
    });
  } catch (error) {
    console.error('Strength analysis error:', error);
    res.status(500).json({ success: false, message: 'Error analyzing password strength' });
  }
});

// Generate secure password
router.post('/generate-password', auth, (req, res) => {
  try {
    const { length = 16, includeUppercase = true, includeLowercase = true, includeNumbers = true, includeSymbols = true } = req.body;

    let charset = '';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one character type must be selected' });
    }

    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    res.json({
      success: true,
      password
    });
  } catch (error) {
    console.error('Password generation error:', error);
    res.status(500).json({ success: false, message: 'Error generating password' });
  }
});

module.exports = router;
