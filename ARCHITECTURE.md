# Application Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISA PETITION GENERATOR                      │
│                     Next.js 14 Application                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐
│                 │      │                 │      │              │
│   USER FORM     │─────▶│   API ROUTES    │─────▶│  CLAUDE AI   │
│  (Multi-Step)   │      │  (Generation)   │      │  (Documents) │
│                 │      │                 │      │              │
└─────────────────┘      └─────────────────┘      └──────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐
│                 │      │                 │      │              │
│  PROGRESS UI    │◀─────│   PROGRESS      │      │  SENDGRID    │
│  (Real-time)    │      │   TRACKING      │      │  (Email)     │
│                 │      │                 │      │              │
└─────────────────┘      └─────────────────┘      └──────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐
│                 │      │                 │      │              │
│   DOWNLOADS     │      │  FILE SYSTEM    │      │  USER EMAIL  │
│  (4 Documents)  │      │  (Storage)      │      │  (Delivery)  │
│                 │      │                 │      │              │
└─────────────────┘      └─────────────────┘      └──────────────┘
```

## 📊 Data Flow

### 1. User Input Flow
```
User fills form → Validation → Submit → Generate case ID → Start background job
```

### 2. Document Generation Flow
```
Read Knowledge Base
    ↓
Fetch & Analyze URLs
    ↓
Generate Document 1 (Comprehensive Analysis)
    ↓
Generate Document 2 (Publication Analysis) [uses Document 1]
    ↓
Generate Document 3 (URL Reference) [uses Documents 1 & 2]
    ↓
Generate Document 4 (Legal Brief) [uses Documents 1, 2, 3]
    ↓
Save to File System
    ↓
Send Email with Attachments
    ↓
Complete ✓
```

### 3. Progress Tracking Flow
```
Client polls /api/progress/{caseId} every 2 seconds
    ↓
Server returns current stage, progress %, message
    ↓
UI updates in real-time
    ↓
Completion: Show download links
```

## 🗂️ Component Architecture

### Frontend Components

```
app/page.tsx
├── Multi-step form (4 steps)
├── Input validation
├── State management
└── Form submission

app/components/GenerationProgress.tsx
├── Progress bar
├── Stage checklist
├── Status updates
├── Download interface
└── Email confirmation
```

### Backend API Routes

```
app/api/generate/route.ts
├── POST: Start generation
├── Validate input
├── Create case ID
├── Start async generation
└── Return case ID

app/api/progress/[caseId]/route.ts
├── GET: Get progress
├── Lookup case
└── Return status

app/api/download/[caseId]/[docIndex]/route.ts
├── GET: Download document
├── Lookup document
└── Stream file
```

### Core Libraries

```
app/lib/knowledge-base.ts
├── Load knowledge files by visa type
├── Extract relevant sections
├── Build context for AI
└── Optimize reading order

app/lib/url-fetcher.ts
├── Fetch URL content
├── Parse HTML with Cheerio
├── Analyze publication quality
├── Extract key information
└── Handle errors gracefully

app/lib/document-generator.ts
├── Main generation orchestration
├── Document 1: Comprehensive Analysis
├── Document 2: Publication Analysis
├── Document 3: URL Reference
├── Document 4: Legal Brief
└── Progress callbacks

app/lib/email-service.ts
├── SendGrid integration
├── HTML email template
├── Attach documents
└── Send to recipient
```

## 🔐 Security & Data

### Environment Variables
```
ANTHROPIC_API_KEY    → Claude AI access
SENDGRID_API_KEY     → Email delivery
SENDGRID_FROM_EMAIL  → Sender address
```

### Data Storage
```
In-Memory (Development):
- cases: Map<caseId, PetitionCase>
- progress: Map<caseId, ProgressData>

File System:
- public/outputs/{caseId}/Document_*.md

Production Recommendation:
- Use PostgreSQL or MongoDB
- Store case metadata
- Reference file paths
- Enable case history
```

## 🧠 AI Integration

### Claude API Usage

**Model**: claude-3-5-sonnet-20241022

**Document 1 - Comprehensive Analysis**:
- Input: Beneficiary info + Knowledge base + URLs
- Output: 75+ pages, ~16,000 tokens
- Temperature: 0.3 (structured, consistent)

**Document 2 - Publication Analysis**:
- Input: URLs + Context from Doc 1
- Output: 40+ pages, ~16,000 tokens
- Temperature: 0.3

**Document 3 - URL Reference**:
- Input: URLs + Context from Docs 1 & 2
- Output: Variable, ~8,000 tokens
- Temperature: 0.2 (factual)

**Document 4 - Legal Brief**:
- Input: All previous documents + Knowledge base
- Output: 30+ pages, ~16,000 tokens
- Temperature: 0.3 (professional)

**Total Tokens**: ~56,000 tokens output
**Cost per Case**: $5-15 (depending on input size)

## 📦 Knowledge Base Integration

### File Organization by Visa Type

**O-1A** (8 files, priority order):
1. O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md (Section 3)
2. O-1a knowledge base.md
3. O-1a visa complete guide.md
4. O-1A Evlaution Rag.md
5. DIY O1A RAG.md
6. Master mega prompt Visa making.md
7. policy memeos visas EB1a and O-1.md
8. policy memeos visas.md

**O-1B** (5 files)
**P-1A** (5 files)
**EB-1A** (6 files including gold standard example)

### Context Building
```
1. Load files in priority order
2. Extract visa-specific sections
3. Truncate to prevent token overflow
4. Build unified context string
5. Pass to Claude for generation
```

## 🌐 External Services

### Anthropic Claude
- **Purpose**: AI document generation
- **Endpoint**: https://api.anthropic.com/v1/messages
- **Rate Limits**: Per account tier
- **Error Handling**: Retry on 429, fail on 400/500

### SendGrid
- **Purpose**: Email delivery
- **Endpoint**: https://api.sendgrid.com/v3/mail/send
- **Rate Limits**: 100/day (free tier)
- **Error Handling**: Log failure, allow manual download

### Web Scraping (Axios + Cheerio)
- **Purpose**: URL content extraction
- **Timeout**: 15 seconds per URL
- **User-Agent**: Spoofed browser
- **Error Handling**: Mark as failed, continue generation

## 📈 Performance Considerations

### Optimization Strategies

1. **Token Management**:
   - Truncate long content
   - Extract relevant sections only
   - Limit knowledge base to 50,000 chars per prompt

2. **Parallel Processing**:
   - Fetch all URLs concurrently
   - Sequential document generation (dependency chain)

3. **Caching** (Future):
   - Cache knowledge base in memory
   - Cache publication quality data
   - Reuse URL analyses

4. **Progress Updates**:
   - Polling every 2 seconds
   - Minimal data transfer
   - Client-side state management

## 🚀 Deployment Architecture

### Development
```
localhost:3000
├── Hot reload
├── Source maps
├── .env.local
└── File system storage
```

### Production (Recommended)
```
Vercel / Netlify
├── Serverless functions
├── Edge CDN
├── Environment variables
├── Database (PostgreSQL)
├── Object storage (S3)
└── Monitoring (Sentry)
```

## 🔄 Future Enhancements

### Phase 2 Features
- [ ] User authentication
- [ ] Case history dashboard
- [ ] Document editing interface
- [ ] PDF export
- [ ] Multi-language support
- [ ] Attorney collaboration tools

### Performance Improvements
- [ ] Background job queue (Bull/Redis)
- [ ] Document caching
- [ ] Incremental generation
- [ ] Streaming responses

### Advanced Features
- [ ] Evidence upload (images, PDFs)
- [ ] OCR for document scanning
- [ ] Petition comparison tool
- [ ] Success probability calculator
- [ ] Attorney marketplace integration

## 📊 Monitoring & Logging

### Key Metrics
- Generation success rate
- Average generation time
- API error rates
- Email delivery rate
- User satisfaction (feedback)

### Logging Points
- Case creation
- Each document generation start/complete
- URL fetch success/failure
- Email send success/failure
- Download events

---

**Current Status**: ✅ Fully functional MVP
**Next Steps**: Deploy to production, gather user feedback, iterate
