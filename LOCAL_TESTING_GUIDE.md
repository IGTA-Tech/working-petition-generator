# 🧪 Local Testing Guide - Working Petition Generator

## ✅ Server is Running!

**Local URL**: http://localhost:3000
**Status**: 🟢 Ready
**Directory**: `/home/innovativeautomations/working-petition-generator`

**Latest Fix Applied**: Claude model updated to `claude-sonnet-4-5-20250929` (November 25, 2025)

---

## 🎯 Quick Test Steps

### Step 1: Open the Application
Visit in your browser: **http://localhost:3000**

You should see:
- Visa Petition Generator form
- Blue gradient background
- 5-step progress bar at top

---

### Step 2: Fill Out Test Form

**Basic Info (Step 1):**
- Full Name: `John Test User`
- Visa Type: `O-1A - Extraordinary Ability`
- Profession: `Software Engineering`

Click **Next** →

**Background (Step 2):**
```
I am a professional software engineer with 10 years of experience in AI and machine learning.
I have published multiple papers on deep learning and worked with Fortune 500 companies.
My expertise includes Python, TensorFlow, and distributed systems architecture.
```
(Minimum 100 characters)

Click **Next** →

**URLs (Step 3):**
Add at least 3 test URLs:
```
https://github.com/test-user
https://linkedin.com/in/test-user
https://medium.com/@test-user/my-article
```

Click **Next** →

**Documents (Step 4):**
- Upload files (optional) - you can skip this
- Supports: PDF, DOCX, DOC, JPG, PNG, TXT

Click **Next** →

**Review & Email (Step 5):**
- Additional Info: (optional - can leave blank)
- Email: `YOUR_EMAIL@domain.com` ← **Use your real email!**

Click **Generate Documents** →

---

### Step 3: Watch Generation Progress

You'll see:
- Progress bar showing completion %
- Current stage (e.g., "Analyzing URLs", "Generating Document 1")
- Estimated time: 5-7 minutes

**Don't close the browser!** Keep the window open while generating.

---

### Step 4: Check Results

**On Completion:**
✅ You'll see "Documents Ready!" screen  
✅ List of 8 generated documents  
✅ Download buttons for each document  
✅ "Email Sent!" confirmation  

**Check Your Email:**
📧 Look for email from: `applications@innovativeautomations.dev`  
📄 Should have **8 markdown (.md) attachments**  
📋 Email subject: "Your O-1A Visa Petition Documents - John Test User"

---

## 📁 Generated Documents

You'll receive 8 documents:

1. **Document_1_Comprehensive_Analysis** (75+ pages)
2. **Document_2_Publication_Analysis** (40+ pages)
3. **Document_3_URL_Reference**
4. **Document_4_Legal_Brief** (30+ pages)
5. **Document_5_Evidence_Gap_Analysis** (25-30 pages)
6. **Document_6_USCIS_Cover_Letter** (2-3 pages)
7. **Document_7_Visa_Checklist** (1-2 pages)
8. **Document_8_Exhibit_Guide** (15-20 pages)

**Format**: Markdown (.md) files  
**Total**: ~200+ pages

---

## 🔍 What to Test

### ✅ Functionality Checklist

- [ ] Form loads without errors
- [ ] Can navigate through all 5 steps
- [ ] Form validation works (try submitting empty fields)
- [ ] URL paste (bulk) works
- [ ] File upload works (if testing)
- [ ] Generate button starts process
- [ ] Progress updates in real-time
- [ ] Generation completes (5-7 minutes)
- [ ] Documents appear on completion screen
- [ ] Download buttons work
- [ ] Email is received
- [ ] All 8 documents are attached
- [ ] Documents open and are readable

---

## 🛑 Stopping the Server

When done testing:

```bash
# Find and kill the process
pkill -f "next dev"

# Or manually:
ps aux | grep "next dev"
kill <process_id>
```

---

## 🐛 Troubleshooting

### Server Won't Start?
```bash
cd /home/innovativeautomations/working-petition-generator
PORT=3001 npm run dev  # Try different port
```

### Port 3000 Already in Use?
```bash
# Kill existing process
pkill -f "next dev"
# Restart
npm run dev
```

### Documents Not Generating?
- Check browser console for errors (F12)
- Verify `.env.local` file exists with API keys
- Check terminal for error messages
- Ensure internet connection is working

### Email Not Received?
- Check spam folder
- Verify SendGrid sender email is verified
- Check email address was entered correctly
- Look in terminal for "Email sent" message

### Form Errors?
- Ensure all required fields are filled
- Background must be at least 100 characters
- Need at least 3 URLs
- Email must be valid format

---

## 📊 Server Logs

**View real-time logs:**
```bash
# If server is running in background
tail -f /home/innovativeautomations/working-petition-generator/.next/*.log

# Or just watch the terminal where you ran npm run dev
```

**Look for:**
- ✅ "Ready in XXXms" - Server started
- ✅ "Starting document generation" - Process began
- ✅ "Sending email" - Email being sent
- ❌ Any error messages

---

## 🎯 Expected Timeline

| Stage | Duration |
|-------|----------|
| Form filling | 2-3 minutes |
| URL analysis | 1-2 minutes |
| Document 1 generation | 2-3 minutes |
| Document 2 generation | 1-2 minutes |
| Documents 3-8 generation | 2-3 minutes |
| Email sending | 10-30 seconds |
| **Total** | **5-7 minutes** |

---

## 💡 Tips

1. **Use Real Email**: Test with your actual email to verify delivery
2. **Keep Window Open**: Don't close browser during generation
3. **Watch Terminal**: Server logs show progress
4. **Test Downloads**: Try downloading a document to verify
5. **Check Markdown**: Open .md files in text editor or Markdown viewer

---

## ✅ Success Criteria

Your test is successful if:

✅ Form loads and works smoothly  
✅ Generation starts without errors  
✅ Progress updates continuously  
✅ Generation completes in 5-7 minutes  
✅ Email arrives with 8 attachments  
✅ Documents are readable markdown files  
✅ Download buttons work  
✅ No console errors  

---

## 🔗 Quick Links

**Local App**: http://localhost:3000  
**Directory**: `/home/innovativeautomations/working-petition-generator`  
**GitHub**: https://github.com/IGTA-Tech/working-petition-generator  
**Logs**: Check terminal where npm run dev is running

---

## 📞 Need Help?

If something's not working:
1. Check this guide's troubleshooting section
2. Look at server logs in terminal
3. Check browser console (F12 → Console tab)
4. Verify environment variables are set

---

**Happy Testing!** 🚀

The server is running at: **http://localhost:3000**
