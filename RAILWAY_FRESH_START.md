# Railway Fresh Deployment Guide

## Step-by-Step Instructions for NEW Railway Project

### 1. Create New Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select: **`IGTA-Tech/working-petition-generator`**
4. Click **"Deploy Now"**

### 2. Add Environment Variables

After deployment starts, click on your service, then click **"Variables"** tab.

Add these 7 variables (click "+ New Variable" for each):

```
ANTHROPIC_API_KEY=sk-ant-api03-iW6m9crzp_n5RFj7v8OjAK6h4x1C8Xt7Th3Vdgo54o1YN9tIq6Cd3NxqD6_V3A6RbS1aJ8QhOXj3jJ7uc8kXcQ-s3mXfgAA

PERPLEXITY_API_KEY=pplx-9c1f1ae4a0eebdda8d1f1ccb08c3ba67e6c9d3c59bf8bc4bbe4f9b5b9b3a59da

KV_REST_API_READ_ONLY_TOKEN=AqP1ASQgNDE5ZTFhY2QtZjI3MC00YWU2LTkzNDAtYTc0MjE0YjNiMDliZDZjNzljMzMwYmE2NGE3NDkyNjhjNWU0MjYzYzYyNjI=

KV_REST_API_TOKEN=AqP1ASQgNDE5ZTFhY2QtZjI3MC00YWU2LTkzNDAtYTc0MjE0YjNiMDliZDZjNzljMzMwYmE2NGE3NDkyNjhjNWU0MjYzYzYyNjI=

KV_REST_API_URL=https://romantic-polecat-30166.upstash.io

KV_URL=redis://default:AqP1ASQgNDE5ZTFhY2QtZjI3MC00YWU2LTkzNDAtYTc0MjE0YjNiMDliZDZjNzljMzMwYmE2NGE3NDkyNjhjNWU0MjYzYzYyNjI=@romantic-polecat-30166.upstash.io:6379

LLAMAPARSE_API_KEY=llx-T1oOqpA2KLnSBbwpFy5jDSsUiBHvs2dqzVEv7G0oT8dh
```

### 3. Trigger Redeploy

After adding all environment variables:
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** button

### 4. Watch Build Logs

The build should complete successfully with:
- ✓ Compiled successfully
- ✓ Generating static pages (8/8)

### 5. Common Issues & Solutions

**Issue: Build fails with "File is not defined"**
- Solution: Railway is using cached Docker layers
- Fix: Go to Settings → Danger Zone → "Clear Build Cache" → Redeploy

**Issue: Environment variables not working**
- Solution: Make sure all 7 variables are added with EXACT names
- Fix: Double-check spelling of variable names (case-sensitive!)

**Issue: Redis/KV errors during build**
- Solution: These warnings during build are normal and can be ignored
- The KV variables are only needed at runtime, not build time

### 6. Verify Deployment

Once deployed successfully:
1. Railway will give you a public URL (e.g., `your-app.railway.app`)
2. Visit the URL to test the application
3. Try generating a petition to verify everything works

### 7. Key Benefits of Railway

- ✅ **No timeout limits** - Petition generation can take 30+ minutes
- ✅ **Long-running processes** - Perfect for AI document generation
- ✅ **Automatic GitHub deployments** - Push to master = auto-deploy
- ✅ **Built-in monitoring** - View logs and resource usage

## Troubleshooting

If deployment still fails after following all steps:

1. **Delete the project** in Railway
2. **Start completely fresh** with Step 1
3. Make sure you're deploying from the **`master`** branch
4. Verify the repository is **`IGTA-Tech/working-petition-generator`**

## Support

The code has been verified to build successfully locally. If issues persist:
- Check Railway status page: https://railway.statuspage.io/
- Contact Railway support: https://railway.app/help
