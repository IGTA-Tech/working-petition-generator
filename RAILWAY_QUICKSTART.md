# Railway Deployment - Quick Start Guide

## What You Need Before Starting

### Required API Keys to Gather:

1. **LLAMA_CLOUD_API_KEY**
   - Get from: https://cloud.llamaindex.ai
   - Used for: PDF text extraction with LlamaParse
   - Free tier: 1000 pages/day

2. **SENDGRID_API_KEY**
   - Get from: https://sendgrid.com
   - Used for: Sending petition documents via email
   - Free tier: 100 emails/day

3. **SENDGRID_FROM_EMAIL**
   - Your verified sender email in SendGrid
   - Example: `noreply@yourdomain.com`

4. **SENDGRID_REPLY_TO_EMAIL**
   - Reply-to email address
   - Example: `support@yourdomain.com`

### Already Configured (from Vercel):
- ANTHROPIC_API_KEY (Claude AI)
- PERPLEXITY_API_KEY
- KV_REST_API_URL (Upstash Redis)
- KV_REST_API_TOKEN
- KV_REST_API_READ_ONLY_TOKEN
- KV_URL
- REDIS_URL

## Step-by-Step Deployment

### 1. Create Railway Account
Go to https://railway.app and sign up (free tier available)

### 2. Run the Deployment Script
```bash
cd /home/innovativeautomations/working-petition-generator
./deploy-to-railway.sh
```

The script will:
- Install Railway CLI if needed
- Prompt you to login to Railway (opens browser)
- Initialize a new Railway project
- Set up all environment variables
- Build your Next.js application
- Deploy to Railway

### 3. Set Missing API Keys

When the script pauses, set these variables in your Railway dashboard or via CLI:

```bash
# LlamaParse for PDF processing
railway variables set LLAMA_CLOUD_API_KEY=your_llamaparse_key_here

# SendGrid for email delivery
railway variables set SENDGRID_API_KEY=your_sendgrid_key_here
railway variables set SENDGRID_FROM_EMAIL=your_verified_email@domain.com
railway variables set SENDGRID_REPLY_TO_EMAIL=support@domain.com
```

### 4. Verify Deployment

```bash
# Get your Railway URL
railway domain

# Test KV connection
curl https://YOUR_RAILWAY_URL.up.railway.app/api/test-kv

# Should return:
# {"success":true,"message":"KV connection successful"}
```

### 5. Test Full Generation Flow

```bash
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "visaType": "O-1A",
    "fieldOfProfession": "Engineering",
    "background": "Senior engineer with multiple publications",
    "primaryUrls": ["https://linkedin.com/in/testuser"],
    "uploadedFiles": [],
    "additionalInfo": "First Railway test",
    "recipientEmail": "your-email@example.com"
  }'
```

This should return a `caseId`. Then monitor progress:

```bash
curl https://YOUR_RAILWAY_URL.up.railway.app/api/status/CASE_ID_HERE
```

### 6. Monitor Logs

```bash
# Watch logs in real-time
railway logs --follow

# View recent logs
railway logs
```

## Railway vs Vercel Comparison

| Feature | Vercel | Railway |
|---------|--------|---------|
| Timeout Limit | 10s (free) / 300s (pro) | No limit |
| Long-running processes | ❌ Not supported | ✅ Fully supported |
| PDF processing | ❌ Times out | ✅ Works perfectly |
| Folder uploads | ⚠️ Limited | ✅ Full support |
| Monthly cost | $20 (Pro) | $5 (Hobby) |
| Best for | Static sites, quick APIs | Long-running servers |

## Benefits for Your Application

✅ **30+ minute generation times work fine** - No timeout limits
✅ **PDF processing completes** - LlamaParse can process large PDFs without interruption
✅ **Folder drag-and-drop** - Can handle multiple file uploads sequentially
✅ **Real-time progress updates** - Server stays alive throughout generation
✅ **Cheaper** - $5/month vs $20/month for Vercel Pro

## Troubleshooting

### Build fails
```bash
# Check build logs
railway logs --build

# If dependencies fail, try clearing node_modules
rm -rf node_modules package-lock.json
npm install
railway up
```

### Generation times out
This should NOT happen on Railway. If it does:
```bash
# Check if environment variables are set correctly
railway variables

# Verify KV connection
curl https://YOUR_URL/api/test-kv
```

### Can't find Railway URL
```bash
railway domain
# Or open in browser:
railway open
```

## Next Steps After Deployment

1. **Test complete flow**: Upload PDFs, generate documents, receive email
2. **Monitor first generation**: Watch logs during first real generation
3. **Update domain**: (Optional) Add custom domain in Railway dashboard
4. **Set up monitoring**: Railway has built-in monitoring and alerts

## Support

Railway CLI help: `railway help`
Railway dashboard: https://railway.app/dashboard
Railway docs: https://docs.railway.app
