# Working Visa Petition Generator

**Stable Version from November 20, 2025**

This is the working version of the visa petition generator before PDF and timeout changes were added.

## 🎯 What This Version Does

- ✅ Generates comprehensive visa petition documents
- ✅ Supports O-1A, O-1B, P-1A, and EB-1A visas
- ✅ Processes URLs and uploaded files
- ✅ Creates 8 detailed markdown documents (200+ pages)
- ✅ Sends documents via email
- ✅ Real-time progress tracking
- ✅ File upload support (PDF, DOCX, images)

## 📂 Locations

**Local Directory**: `/home/innovativeautomations/working-petition-generator`  
**GitHub Repository**: https://github.com/IGTA-Tech/working-petition-generator

## 🚀 Quick Start

### Install Dependencies
```bash
cd /home/innovativeautomations/working-petition-generator
npm install
```

### Set Environment Variables
Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=your_email@domain.com
SENDGRID_REPLY_TO_EMAIL=your_reply_email@domain.com
```

### Run Locally
```bash
npm run dev
```
Visit: http://localhost:3000

### Deploy to Vercel
```bash
npx vercel
```

## 📋 Features

### Document Generation
- Document 1: Comprehensive Analysis (75+ pages)
- Document 2: Publication Significance Analysis (40+ pages)
- Document 3: URL Reference Document
- Document 4: Legal Brief (30+ pages)
- Document 5: Evidence Gap Analysis (25-30 pages)
- Document 6: USCIS Cover Letter (2-3 pages)
- Document 7: Visa Checklist (1-2 pages)
- Document 8: Exhibit Assembly Guide (15-20 pages)

### Output Format
- Markdown (.md) files
- Sent via email as attachments
- Downloadable from web interface

## ⚙️ Configuration

### Timeout Settings (Current)
- Anthropic API: 5 minutes
- Vercel Functions: 10 seconds (free tier)
- URL Fetcher: 15 seconds

**Note**: For production use, upgrade to Vercel Pro plan for 300-second functions.

## 🔗 Related Repositories

- **Main (with PDF)**: https://github.com/IGTA-Tech/visa-petition-generator
- **Working (stable)**: https://github.com/IGTA-Tech/working-petition-generator

## 📝 Notes

- This version outputs markdown files only (no PDF)
- Tested and stable as of November 20, 2025
- All core functionality working
- No recent experimental changes

## 🛠 Troubleshooting

### Documents Not Generating?
- Check API keys are set in environment variables
- Verify SendGrid sender email is verified
- Check Vercel function logs for errors

### Email Not Sending?
- Verify SendGrid sender email
- Check SendGrid API key is valid
- Look in spam folder

### Timeout Errors?
- Upgrade to Vercel Pro plan ($20/month)
- Or reduce amount of URL analysis

## 📞 Support

For issues with this version, check the original working commit: `74cedc5`

---

**Status**: 🟢 Stable Working Version  
**Last Updated**: November 20, 2025  
**Restored**: November 25, 2025
# Trigger Railway deployment
