# ⚡ INSTANT SETUP SCRIPT
# Run this to get everything working in 2 minutes!

Write-Host "🚀 Setting up Password Manager..." -ForegroundColor Cyan

# Step 1: Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Backend install failed!" -ForegroundColor Red; exit }

# Step 2: Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Frontend install failed!" -ForegroundColor Red; exit }
Set-Location ..

# Step 3: Check MongoDB
Write-Host "`n🔍 Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($mongoRunning) {
    Write-Host "✅ MongoDB is running!" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB is NOT running!" -ForegroundColor Red
    Write-Host "   Start MongoDB or use MongoDB Atlas (cloud)" -ForegroundColor Yellow
    Write-Host "   For MongoDB Atlas: Update .env with your connection string" -ForegroundColor Yellow
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure MongoDB is running (or use MongoDB Atlas)"
Write-Host "   2. Open TWO terminals:"
Write-Host "      Terminal 1: npm run server      (Backend)"
Write-Host "      Terminal 2: cd client && npm start    (Frontend)"
Write-Host "`n   3. Open http://localhost:3000 in your browser`n"
