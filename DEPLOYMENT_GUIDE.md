# Deployment Guide - Password Manager with Face Authentication

## 🏗️ Architecture Overview

Your application has 3 components that need separate hosting:

1. **Frontend (HTML/CSS/JS)** → GitHub Pages ✅ FREE
2. **Node.js Backend (API + MongoDB)** → Render/Railway ✅ FREE TIER
3. **Python DeepFace Backend** → Render/Railway ✅ FREE TIER

---

## 📋 Prerequisites

- GitHub account
- Render account (https://render.com) - recommended for free hosting
- MongoDB Atlas account (you already have this)

---

## 🚀 Step 1: Deploy Node.js Backend to Render

### 1.1 Prepare Backend for Deployment

Create `package.json` in the `server` folder if it doesn't exist:

```json
{
  "name": "password-manager-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "nodemailer": "^6.9.1",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.1",
    "express-validator": "^7.0.1",
    "axios": "^1.4.0",
    "useragent": "^2.3.0"
  }
}
```

### 1.2 Update server.js for Production

Add at the top of `server/server.js`:

```javascript
const PORT = process.env.PORT || 5000;
```

And update the CORS configuration:

```javascript
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://your-username.github.io'  // Replace with your GitHub Pages URL
  ],
  credentials: true
}));
```

### 1.3 Deploy to Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `password-manager-api`
   - **Root Directory**: `pwdmgr/server`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `MONGODB_URI`: (your MongoDB Atlas connection string)
   - `JWT_SECRET`: (a random secure string)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: (your GitHub Pages URL)
6. Click "Create Web Service"
7. **Copy the deployed URL** (e.g., `https://password-manager-api.onrender.com`)

---

## 🐍 Step 2: Deploy Python DeepFace Backend to Render

### 2.1 Create Requirements File

Create `server/requirements.txt`:

```txt
flask==3.0.0
flask-cors==4.0.0
deepface==0.0.90
opencv-python-headless==4.8.1.78
numpy==1.24.3
```

### 2.2 Create Procfile

Create `server/Procfile`:

```
web: python deepface_backend.py
```

### 2.3 Update deepface_backend.py

Add at the bottom of the file:

```python
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
```

### 2.4 Deploy to Render

1. Go to Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `password-manager-deepface`
   - **Root Directory**: `pwdmgr/server`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python deepface_backend.py`
5. Click "Create Web Service"
6. **Copy the deployed URL** (e.g., `https://password-manager-deepface.onrender.com`)

---

## 📦 Step 3: Deploy Frontend to GitHub Pages

### 3.1 Update config.js

Edit `pwdmgr/config.js` and replace with your deployed URLs:

```javascript
PRODUCTION: {
    API_BASE_URL: 'https://password-manager-api.onrender.com/api',
    DEEPFACE_URL: 'https://password-manager-deepface.onrender.com'
}
```

### 3.2 Add config.js to all HTML files

Add this line in the `<head>` section of these files BEFORE any other scripts:
- index.html
- login-standalone-with-otp.html
- register-standalone-with-otp.html
- dashboard-standalone.html
- face-auth-standalone.html
- forgot-password.html
- settings-standalone.html

```html
<script src="config.js"></script>
```

### 3.3 Update API URLs in HTML files

Replace all instances of hardcoded localhost URLs with the config variables:

**Example:**
```javascript
// OLD
const response = await fetch('http://localhost:5000/api/auth/login', {

// NEW
const response = await fetch(`${API_BASE_URL}/auth/login`, {
```

### 3.4 Create GitHub Repository

1. Create a new repository on GitHub (make it public)
2. Name it: `password-manager`
3. Don't initialize with README

### 3.5 Push to GitHub

```bash
cd "D:\MY PROJECTS\pwd with face - Copy\pwdmgr"
git init
git add .
git commit -m "Initial commit - Password Manager"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/password-manager.git
git push -u origin main
```

### 3.6 Enable GitHub Pages

1. Go to repository Settings
2. Click "Pages" in the left sidebar
3. Under "Source", select branch: `main` and folder: `/root` (or `/pwdmgr`)
4. Click "Save"
5. Your site will be available at: `https://YOUR-USERNAME.github.io/password-manager/`

---

## ⚙️ Step 4: Configure CORS and URLs

### 4.1 Update Backend CORS

In `server/server.js`, update allowed origins:

```javascript
app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://YOUR-USERNAME.github.io'
  ],
  credentials: true
}));
```

Redeploy the backend after this change.

### 4.2 Update MongoDB Whitelist

1. Go to MongoDB Atlas
2. Network Access → Add IP Address
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Save

---

## 🔒 Important Security Notes

1. **Never commit sensitive data** to GitHub:
   - Don't commit `.env` files
   - Don't commit MongoDB credentials
   - Don't commit JWT secrets

2. **Use environment variables** on Render for:
   - Database credentials
   - API keys
   - JWT secrets
   - Email credentials

3. **HTTPS Only**: All APIs must use HTTPS in production

---

## ✅ Testing Your Deployment

1. Visit your GitHub Pages URL
2. Try registering a new account
3. Test login with OTP
4. Test face authentication
5. Check if password storage works

---

## 🐛 Troubleshooting

### Backend not responding
- Check Render logs
- Verify environment variables
- Check MongoDB connection string

### CORS errors
- Verify CORS origins match your GitHub Pages URL
- Check if backend is running

### Face auth not working
- Check DeepFace backend logs
- Verify DEEPFACE_URL in config.js
- Ensure camera permissions are granted

---

## 💰 Cost Breakdown

- **Frontend (GitHub Pages)**: FREE
- **Node.js Backend (Render)**: FREE (with 750 hours/month)
- **Python Backend (Render)**: FREE (with 750 hours/month)
- **MongoDB Atlas**: FREE (512 MB storage)
- **Total**: $0/month 🎉

---

## 📝 Alternative Hosting Options

### Backend Alternatives:
- **Railway** (https://railway.app) - Free $5/month credit
- **Vercel** - Good for Node.js serverless functions
- **Heroku** - No longer has free tier
- **Fly.io** - Free tier available

### Database Alternatives:
- **MongoDB Atlas** - Current choice ✅
- **Supabase** - PostgreSQL alternative
- **PlanetScale** - MySQL alternative

---

## 🔄 Updating Your Deployment

### Update Frontend:
```bash
git add .
git commit -m "Update frontend"
git push
```
GitHub Pages will automatically update.

### Update Backend:
1. Push changes to GitHub
2. Render will automatically redeploy

---

## 📞 Need Help?

- Render docs: https://render.com/docs
- GitHub Pages: https://docs.github.com/pages
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/

---

Good luck with your deployment! 🚀
