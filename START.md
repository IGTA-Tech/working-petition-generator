# 🚀 Quick Start Guide

## Start the Application

### Option 1: Standard Start
```bash
cd /home/innovativeautomations/visa-petition-generator
npm run dev
```

Then open: **http://localhost:3000**

### Option 2: Background Mode
```bash
cd /home/innovativeautomations/visa-petition-generator
npm run dev > server.log 2>&1 &
```

Check logs: `tail -f server.log`

---

## ✅ Pre-configured Settings

Your application is **ready to use** with:

✅ **Claude API Key**: Configured
✅ **SendGrid API Key**: Configured
✅ **Knowledge Base**: 17 files loaded
✅ **Dependencies**: All installed

---

## 📝 How to Use

1. **Start the server** (see above)
2. **Open browser** → http://localhost:3000
3. **Fill out the form**:
   - Step 1: Name, visa type, profession
   - Step 2: Career background (100+ chars)
   - Step 3: Evidence URLs (3+ recommended)
   - Step 4: Email address + review
4. **Click "Generate Documents"**
5. **Wait 15-30 minutes** (real-time progress shown)
6. **Receive 4 documents**:
   - Via email (automatic)
   - Via download (manual option)

---

## 📄 What You Get

### Document 1: Comprehensive Analysis (75+ pages)
Complete criterion-by-criterion evaluation with scoring, strengths, weaknesses, and recommendations.

### Document 2: Publication Significance Analysis (40+ pages)
Detailed assessment of every media mention with reach metrics and significance scoring.

### Document 3: URL Reference Document
All evidence URLs organized by criterion for easy exhibit preparation.

### Document 4: Legal Brief (30+ pages)
Professional USCIS-ready petition brief with legal arguments and exhibit list.

---

## 🎯 Supported Visa Types

- **O-1A** - Extraordinary Ability (Sciences, Business, Education, Athletics)
- **O-1B** - Extraordinary Ability (Arts, Motion Picture, TV)
- **P-1A** - Internationally Recognized Athlete
- **EB-1A** - Extraordinary Ability (Green Card)

---

## ⚡ Quick Test

Want to test the system? Use these sample inputs:

**Name**: John Smith
**Visa Type**: O-1A
**Profession**: Professional Mixed Martial Arts
**Background**: Professional MMA fighter with 15-2 record. Competed in UFC, Bellator. Won regional championships. Trained at Jackson Wink MMA Academy. Featured in ESPN, MMA Fighting, Sherdog. Ranked top 15 in division.
**URLs**:
- https://www.espn.com/mma/
- https://www.sherdog.com/
- https://www.ufc.com/

**Email**: your-email@example.com

---

## 🔧 Troubleshooting

**Port 3000 already in use?**
```bash
PORT=3001 npm run dev
```

**Need to stop the server?**
- Press `Ctrl+C` in terminal
- Or: `pkill -f "next dev"`

**Clear cache and restart?**
```bash
rm -rf .next
npm run dev
```

**Check if running?**
```bash
curl http://localhost:3000
```

---

## 📊 Expected Generation Times

- Reading Knowledge Base: 30 seconds
- Analyzing URLs: 1-2 minutes
- Document 1 (Comprehensive): 5-10 minutes
- Document 2 (Publication): 5-8 minutes
- Document 3 (URL Reference): 2-3 minutes
- Document 4 (Legal Brief): 5-10 minutes
- Sending Email: 10 seconds

**Total**: 15-30 minutes depending on complexity

---

## 💾 Output Location

Generated documents are saved to:
```
/home/innovativeautomations/visa-petition-generator/public/outputs/{caseId}/
```

Each case gets a unique folder with all 4 documents.

---

## 🌐 Production Deployment

### Deploy to Netlify
```bash
npm run build
netlify deploy --prod
```

### Deploy to Vercel
```bash
vercel
```

Don't forget to add environment variables in your hosting dashboard!

---

## ⚠️ Important Notes

1. **Attorney Review Required**: Always have a qualified immigration attorney review documents before USCIS submission
2. **AI Disclaimer**: These are AI-generated drafts, not legal advice
3. **Evidence Collection**: Use Document 3 as your guide to organize physical evidence
4. **Approval Probability**: Document 1 includes an estimate, but actual approval depends on many factors
5. **Keep Window Open**: Don't close browser during generation - progress will be lost

---

## 🎓 Tips for Best Results

1. **Detailed Background**: More info = better analysis
2. **Quality URLs**: Use reputable sources (ESPN, Forbes, etc.)
3. **Multiple URLs**: 10-20 URLs provide comprehensive coverage
4. **Recent Evidence**: Current achievements strengthen the case
5. **Specific Numbers**: Include rankings, statistics, dates, awards
6. **Complete Forms**: Fill all fields thoroughly

---

## 📞 Need Help?

1. Check README.md for full documentation
2. Review knowledge base files in `/knowledge-base/`
3. Check server logs: `tail -f server.log`
4. Test API keys are valid
5. Ensure URLs are accessible

---

## 🎉 You're Ready!

The application is fully configured and ready to generate visa petition documents.

**Start now**: `npm run dev`
**Access at**: http://localhost:3000

Good luck with your visa petitions! 🏆
