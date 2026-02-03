# 🔐 Password Manager with Face Authentication

A secure, modern password manager featuring multiple authentication methods including face recognition, OTP verification, and 2FA. Built with end-to-end encryption to keep your passwords safe.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)

---

## ✨ Core Features

### 🔒 Multi-Layer Security
- **End-to-End Encryption**: All passwords are encrypted client-side using AES-256-GCM
- **Zero-Knowledge Architecture**: Server never has access to your master password
- **PBKDF2 Key Derivation**: 100,000 iterations for master password protection
- **Secure Password Generation**: Built-in strong password generator with customizable options

### 🎭 Multiple Authentication Methods
- **👤 Face Recognition**: Login using DeepFace AI-powered facial recognition
- **📧 Email + OTP**: Secure one-time password verification via email
- **📱 2FA Authenticator**: TOTP-based two-factor authentication support
- **🔑 Traditional Login**: Email and master password authentication

### 💾 Password Management
- **Secure Storage**: Store unlimited passwords with encrypted titles and credentials
- **Password Categories**: Organize passwords by category (Social, Email, Banking, etc.)
- **Quick Search**: Instantly find passwords with real-time search
- **Copy to Clipboard**: One-click copy for usernames and passwords
- **Password Visibility Toggle**: Show/hide passwords as needed
- **Secure Notes**: Add encrypted notes to password entries

### 🔐 Advanced Security Features
- **Account Lockout Protection**: Automatic lockout after failed login attempts
- **Session Management**: Secure JWT-based session handling
- **Password Reset**: Secure password recovery with OTP verification
- **Login Alerts**: Email notifications for new login attempts with device and location info
- **Security Dashboard**: View account security status and settings

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with smooth animations
- **Dark Mode Ready**: Beautiful gradient interface
- **Mobile Responsive**: Works seamlessly on all devices
- **Intuitive Navigation**: Easy-to-use interface for all skill levels
- **Real-time Validation**: Instant feedback on form inputs

---

## 🏗️ Technology Stack

### Frontend
- **HTML5/CSS3**: Modern, semantic markup with responsive design
- **Vanilla JavaScript**: No frameworks, pure performance
- **Web Crypto API**: Client-side encryption and key derivation
- **Face-API.js**: Browser-based face detection and recognition

### Backend
- **Node.js + Express**: RESTful API server
- **MongoDB Atlas**: Cloud-based NoSQL database
- **Python + Flask**: DeepFace backend for face authentication
- **DeepFace**: Advanced face recognition library

### Security & Authentication
- **bcrypt**: Password hashing (12 rounds)
- **JSON Web Tokens**: Secure session management
- **Speakeasy**: TOTP 2FA implementation
- **Nodemailer**: Email delivery for OTPs and alerts

---

## 🚀 Quick Start

### Prerequisites
```bash
- Node.js (v14 or higher)
- Python 3.8+
- MongoDB Atlas account (free tier)
- Gmail account for email notifications
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR-USERNAME/password-manager.git
cd password-manager/pwdmgr
```

2. **Install Node.js dependencies**
```bash
cd server
npm install
```

3. **Install Python dependencies**
```bash
pip install flask flask-cors deepface opencv-python numpy
```

4. **Configure environment variables**

Create `.env` file in the `server` folder:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_string
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:8080
```

5. **Start the servers**

Terminal 1 - Node.js Backend:
```bash
cd server
node server.js
```

Terminal 2 - Python Backend:
```bash
cd server
python deepface_backend.py
```

Terminal 3 - Frontend:
```bash
cd ..
python -m http.server 8080
```

6. **Open your browser**
```
http://localhost:8080
```

---

## 📋 Feature Details

### Password Storage & Encryption

All passwords are encrypted using a unique vault key derived from your master password:

1. **Master Password** → SHA-256 hash → bcrypt (stored on server for auth)
2. **Master Password** + **Salt** → PBKDF2 (100,000 iterations) → **Vault Key** (client-side only)
3. **Password Data** + **Vault Key** → AES-256-GCM → **Encrypted Storage**

**The server never has access to your vault key or decrypted passwords.**

### Face Authentication Flow

1. **Enrollment**: User captures face images, embeddings generated using DeepFace
2. **Storage**: Face template stored as encrypted vector in MongoDB
3. **Verification**: Live face compared against stored template
4. **Threshold**: 0.6 similarity score required for successful authentication

### Email OTP Verification

- 6-digit codes sent via Gmail SMTP
- 10-minute expiration time
- Rate limiting: 60-second cooldown between requests
- Account lockout after 5 failed attempts

### 2FA Authenticator Support

- TOTP-based (Time-based One-Time Password)
- Compatible with Google Authenticator, Authy, Microsoft Authenticator
- QR code generation for easy setup
- 30-second time window

---

## 🔑 API Endpoints

### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login with credentials
POST   /api/auth/verify-signup-otp     - Verify email during registration
POST   /api/auth/verify-login-otp      - Verify OTP during login
POST   /api/auth/forgot-password       - Request password reset OTP
POST   /api/auth/verify-reset-otp      - Verify reset OTP
POST   /api/auth/reset-password        - Reset password with token
POST   /api/auth/resend-otp            - Resend OTP code
```

### Face Authentication
```
POST   /api/auth/face/enroll           - Enroll face template
POST   /api/auth/face/verify           - Verify face for login
POST   /api/auth/face/disable          - Disable face authentication
```

### 2FA Management
```
POST   /api/auth/2fa/setup             - Generate 2FA secret and QR code
POST   /api/auth/2fa/verify            - Verify and enable 2FA
POST   /api/auth/2fa/disable           - Disable 2FA
```

### Password Management
```
GET    /api/passwords                  - Get all passwords (encrypted)
POST   /api/passwords                  - Save new password
PUT    /api/passwords/:id              - Update password
DELETE /api/passwords/:id              - Delete password
```

### Security
```
GET    /api/security/check-password    - Check password strength
POST   /api/security/generate-password - Generate strong password
GET    /api/security/breach-check      - Check if password is breached
```

---

## 🔒 Security Best Practices

### For Users
1. **Use a strong master password**: At least 12 characters with mixed case, numbers, and symbols
2. **Enable 2FA**: Add an extra layer of security to your account
3. **Regular backups**: Export your passwords periodically
4. **Unique passwords**: Use the password generator for unique passwords
5. **Secure your email**: Your email is used for password recovery

### For Developers
1. **Never log sensitive data**: Master passwords, vault keys, or decrypted passwords
2. **Use HTTPS**: Always use HTTPS in production
3. **Rotate secrets**: Regularly update JWT secrets and encryption keys
4. **Monitor logs**: Watch for suspicious login attempts
5. **Keep dependencies updated**: Regularly update npm and pip packages

---

## 📊 Database Schema

### User Model
```javascript
{
  email: String (unique, lowercase),
  masterPasswordHash: String (bcrypt hashed),
  salt: String (for vault key derivation),
  encryptedVaultKey: String,
  faceAuthEnabled: Boolean,
  faceAuthTemplate: String (encrypted face embeddings),
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,
  emailOTP: String,
  emailOTPExpires: Date,
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date,
  createdAt: Date
}
```

### Password Model
```javascript
{
  userId: ObjectId (ref: User),
  encryptedTitle: String,
  encryptedUsername: String,
  encryptedPassword: String,
  encryptedUrl: String,
  encryptedNotes: String,
  category: String,
  iv: String (initialization vector),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Roadmap

- [ ] Password sharing with encrypted sharing keys
- [ ] Browser extension for auto-fill
- [ ] Mobile app (React Native)
- [ ] Biometric authentication (fingerprint, Windows Hello)
- [ ] Password health dashboard
- [ ] Secure file attachments
- [ ] Family/team sharing plans
- [ ] Import from other password managers
- [ ] Encrypted backup/sync across devices
- [ ] Dark mode toggle

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- [DeepFace](https://github.com/serengil/deepface) - Face recognition library
- [Face-API.js](https://github.com/justadudewhohacks/face-api.js) - Browser face detection
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database hosting
- [Render](https://render.com) - Backend hosting

---

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Deployment Guide](DEPLOYMENT_GUIDE.md)
2. Search existing [Issues](https://github.com/your-username/password-manager/issues)
3. Create a new issue with detailed information

---

## ⚠️ Disclaimer

This is an educational project. While it implements strong security practices, please conduct a thorough security audit before using it in production for sensitive data. Always keep backups of your passwords.

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ and strong encryption**
