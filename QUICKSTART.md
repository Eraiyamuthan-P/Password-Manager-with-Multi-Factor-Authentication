# 🚀 QUICK START GUIDE

## Setup (5 minutes)

### 1. Install Backend Dependencies
```bash
npm install
```

### 2. Install MongoDB
If you don't have MongoDB installed:
- **Windows**: Download from https://www.mongodb.com/try/download/community
- **Or use MongoDB Atlas** (free cloud database): https://www.mongodb.com/cloud/atlas

### 3. Start MongoDB (if local)
```bash
mongod
```

### 4. Start Backend Server
```bash
npm run server
```
Server runs on: http://localhost:5000

### 5. Start Frontend (in new terminal)
```bash
cd client
npm start
```
Frontend runs on: http://localhost:3000

---

## Quick Demo Script (for Professor)

### 1. **Register Account** (30 seconds)
- Open http://localhost:3000
- Click "Create Account"
- Enter email and master password
- **Explain**: "Master password never sent to server - used only for client-side encryption"

### 2. **Add Passwords** (1 minute)
- Click "Add Password"
- Generate strong password
- Save multiple entries (email, bank, social media)
- **Explain**: "All passwords encrypted before leaving browser using AES-256-GCM"

### 3. **Show Security Features** (1 minute)
- View Dashboard statistics
- Check password strength scores
- Test breach detection on a password
- **Explain**: "Integration with HaveIBeenPwned API using k-anonymity"

### 4. **Enable 2FA** (1 minute)
- Go to Settings
- Enable Two-Factor Authentication
- Scan QR code with authenticator app
- **Explain**: "TOTP-based 2FA adds second layer of security"

### 5. **Show Zero-Knowledge Architecture** (1 minute)
- Open Developer Tools → Network tab
- Create/view a password
- Show encrypted data in request
- **Explain**: "Server only sees encrypted blobs - true zero-knowledge"

---

## Research Highlights to Mention

1. **Zero-Knowledge Architecture**
   - Client-side encryption (AES-256-GCM)
   - Master password never transmitted
   - Server stores only encrypted data

2. **Key Derivation**
   - PBKDF2 with 100,000 iterations
   - Unique salt per user
   - Resistant to brute-force attacks

3. **Breach Detection**
   - HaveIBeenPwned API integration
   - k-Anonymity model (privacy-preserving)
   - Automatic security alerts

4. **Multi-Factor Authentication**
   - TOTP-based 2FA
   - Account lockout after failed attempts
   - JWT-based session management

5. **Security Best Practices**
   - Rate limiting
   - Helmet.js security headers
   - Input validation
   - CORS configuration

---

## Troubleshooting

### MongoDB Connection Error
```bash
# Option 1: Start local MongoDB
mongod

# Option 2: Use MongoDB Atlas (cloud)
# 1. Create free account at mongodb.com/cloud/atlas
# 2. Create cluster and get connection string
# 3. Update .env file:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/password-manager
```

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Or change port in .env
PORT=5001
```

---

## Project Structure
```
pwdmgr/
├── server/                 # Backend (Node.js + Express)
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   └── server.js          # Entry point
├── client/                # Frontend (React + TypeScript)
│   └── src/
│       ├── components/    # UI components
│       ├── context/       # Auth context
│       └── utils/         # Crypto & API utils
└── README.md
```

---

## Next Steps (Post-Demo)

1. **Performance Testing**
   - Benchmark encryption/decryption speed
   - Load testing with 1000+ passwords

2. **Security Audit**
   - Penetration testing
   - Code review

3. **Research Paper**
   - Focus on zero-knowledge architecture
   - Compare with existing solutions
   - Benchmark results

Good luck with your demo! 🎓
