#!/usr/bin/env pwsh
# Deploy script for Ek Aur Bite
# Usage: Set CLOUDFLARE_API_TOKEN as environment variable first, then run .\deploy.ps1
#
# Set token via:
#   $env:CLOUDFLARE_API_TOKEN="your_token_here"
#   $env:CLOUDFLARE_ACCOUNT_ID="bdb441663f061db9c61f0a74be0945fa"

Write-Host "🍫 Building Ek Aur Bite..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "❌ CLOUDFLARE_API_TOKEN not set!" -ForegroundColor Red
    Write-Host "   Run: `$env:CLOUDFLARE_API_TOKEN='your_token'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Build successful! Deploying to Cloudflare Pages..." -ForegroundColor Green
npx wrangler pages deploy dist --project-name ekaurbite --commit-dirty=true

Write-Host "🚀 Deployed!" -ForegroundColor Green
