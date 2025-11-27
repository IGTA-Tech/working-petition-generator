# Railway Deployment Guide

## Why Railway?
- **No timeout limits** - Generation can take 30+ minutes without issues
- **Long-running server** - Process stays alive throughout entire operation
- **Better for file handling** - PDF processing and folder uploads work seamlessly
- **Persistent storage** - Can still use Upstash KV or add Railway PostgreSQL

## Prerequisites
1. Railway account (https://railway.app)
2. Railway CLI installed
3. Environment variables ready

## Environment Variables Needed

### Required (from Vercel)
```bash
# Anthropic API (for Claude AI document generation)
ANTHROPIC_API_KEY=your_key_here

# SendGrid (for email delivery)
SENDGRID_API_KEY=your_key_here

# LlamaParse (for PDF text extraction)
LLAMA_CLOUD_API_KEY=your_key_here

# Vercel KV / Upstash Redis (for persistence)
KV_REST_API_URL=https://assured-chicken-10769.upstash.io
KV_REST_API_TOKEN=your_token_here
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token_here
KV_URL=your_kv_url_here
REDIS_URL=your_redis_url_here
```

### Optional (for Vercel Blob - may not be needed)
```bash
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

## Deployment Steps

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
cd /home/innovativeautomations/working-petition-generator
railway init
```

### 4. Add Environment Variables
```bash
# Add each variable one at a time
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set SENDGRID_API_KEY=your_key
railway variables set LLAMA_CLOUD_API_KEY=your_key
railway variables set KV_REST_API_URL=your_url
railway variables set KV_REST_API_TOKEN=your_token
# ... etc
```

### 5. Deploy
```bash
railway up
```

### 6. Verify Deployment
```bash
railway logs
railway open
```

## Testing After Deployment

1. Get your Railway URL (e.g., https://yourapp.up.railway.app)
2. Test the generation endpoint:
```bash
curl -X POST https://yourapp.up.railway.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "visaType": "O-1A",
    "fieldOfProfession": "Engineering",
    "background": "Test background",
    "primaryUrls": ["https://example.com"],
    "uploadedFiles": [],
    "additionalInfo": "Test",
    "recipientEmail": "test@example.com"
  }'
```

3. Check progress:
```bash
curl https://yourapp.up.railway.app/api/status/YOUR_CASE_ID
```

## Benefits Over Vercel

✅ **No 10s/300s timeout** - Can run for hours if needed
✅ **True background processing** - Server doesn't freeze after response
✅ **Better PDF handling** - LlamaParse can process large documents
✅ **Folder uploads** - Can handle multiple file uploads sequentially
✅ **Persistent connections** - Redis/KV connections stay alive
✅ **Real-time progress** - WebSocket support for live updates

## Cost Comparison

- **Vercel**: $20/month (Pro) - but doesn't work for long tasks
- **Railway**: $5/month (Hobby) - includes 500 hours, no timeout limits
- **Railway**: $20/month (Developer) - includes $20 credit + additional usage

For this application, Railway is both cheaper AND more capable.
