# COST ANALYSIS: Visa Petition Generator
## Per-Run Cost Breakdown with Perplexity Integration

**Last Updated:** November 25, 2025

---

## CURRENT COSTS (WITHOUT PERPLEXITY)

### Claude API Pricing (Anthropic)
**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

- **Input:** $3.00 per million tokens
- **Output:** $15.00 per million tokens

---

### Current System: 4-Document Generation Pipeline

#### **Document 1: Comprehensive Analysis**
- **Max Tokens:** 8,192 output
- **Input Tokens (Estimated):** ~15,000-20,000
  - Knowledge base: ~5,000 tokens
  - User-provided URLs (avg 5): ~8,000 tokens
  - Beneficiary info + prompts: ~2,000 tokens
- **Output Tokens:** ~8,000 (actual: 2,500-3,500 words)

**Cost Calculation:**
- Input: 20,000 tokens × $3.00 / 1M = **$0.06**
- Output: 8,000 tokens × $15.00 / 1M = **$0.12**
- **Document 1 Total: $0.18**

---

#### **Document 2: Publication Analysis (Exhibit-by-Exhibit)**
- **Max Tokens:** 20,480 output
- **Input Tokens (Estimated):** ~25,000-30,000
  - All URL content processed: ~15,000 tokens
  - Quality analysis system prompts: ~3,000 tokens
  - Document 1 summary: ~5,000 tokens
  - Prompts: ~2,000 tokens
- **Output Tokens:** ~18,000 (actual: 12,000-16,000 words)

**Cost Calculation:**
- Input: 30,000 tokens × $3.00 / 1M = **$0.09**
- Output: 18,000 tokens × $15.00 / 1M = **$0.27**
- **Document 2 Total: $0.36**

---

#### **Document 3: URL Reference List**
- **Max Tokens:** 10,240 output
- **Input Tokens (Estimated):** ~12,000-15,000
  - All URLs with metadata: ~8,000 tokens
  - Prompts: ~2,000 tokens
- **Output Tokens:** ~6,000 (actual: 4,000-6,000 words)

**Cost Calculation:**
- Input: 15,000 tokens × $3.00 / 1M = **$0.045**
- Output: 6,000 tokens × $15.00 / 1M = **$0.09**
- **Document 3 Total: $0.135**

---

#### **Document 4: Legal Brief (Multi-Step Generation)**
- **Max Tokens:** 20,480 output **per step**
- **Steps:** 3-4 steps (sections generated separately to avoid truncation)
- **Input Tokens Per Step (Estimated):** ~18,000-22,000
  - All prior documents: ~10,000 tokens
  - Knowledge base: ~5,000 tokens
  - URL evidence: ~3,000 tokens
  - Prompts: ~2,000 tokens
- **Output Tokens Per Step:** ~18,000

**Cost Calculation (Per Step):**
- Input: 20,000 tokens × $3.00 / 1M = **$0.06**
- Output: 18,000 tokens × $15.00 / 1M = **$0.27**
- **Per Step: $0.33**

**Total for 3.5 steps (average):**
- **Document 4 Total: $1.155** (3.5 × $0.33)

---

### **CURRENT TOTAL COST PER RUN (No Perplexity)**

| Document | Input Cost | Output Cost | Total |
|----------|-----------|-------------|-------|
| Document 1: Comprehensive Analysis | $0.06 | $0.12 | $0.18 |
| Document 2: Publication Analysis | $0.09 | $0.27 | $0.36 |
| Document 3: URL Reference | $0.045 | $0.09 | $0.135 |
| Document 4: Legal Brief (3.5 steps) | $0.21 | $0.945 | $1.155 |
| **TOTAL** | **$0.405** | **$1.425** | **$1.83** |

---

## PROPOSED COSTS (WITH PERPLEXITY INTEGRATION)

### Perplexity API Pricing
**Model:** `sonar` (recommended for research)

- **Input:** $1.00 per million tokens
- **Output:** $1.00 per million tokens
- **Requests:** Unlimited (no per-request fee)

**Alternative Model:** `sonar-pro`
- **Input:** $3.00 per million tokens
- **Output:** $3.00 per million tokens
- **Better for:** Complex research requiring deeper analysis

---

### Perplexity Research Phase (NEW)

Based on the **COMPREHENSIVE_RESEARCH_METHODOLOGY_TRAINING.md** 4-phase approach:

#### **Phase 1: Identity Confirmation (2-3 queries)**

**Query 1:** "Who is [Name]? Comprehensive background..."
- Input: ~500 tokens (query + system instructions snippet)
- Output: ~800 tokens (biographical summary)

**Query 2:** "[Name] [Field] career history OR rankings OR statistics"
- Input: ~400 tokens
- Output: ~900 tokens

**Query 3:** "[Name] Wikipedia external links OR references"
- Input: ~350 tokens
- Output: ~600 tokens

**Phase 1 Total:**
- Input: 1,250 tokens
- Output: 2,300 tokens

---

#### **Phase 2: Criterion-Specific Deep Dives (8-12 queries)**

**Per Criterion Search (e.g., "Rankings Research"):**
- Input: ~600 tokens (includes research methodology context)
- Output: ~1,200 tokens (results with URLs and analysis)

**Example Queries:**
1. National team verification
2. Rankings (multiple systems)
3. Media coverage search
4. Tournament/competition history
5. Awards and recognition
6. Published material
7. Membership organizations
8. Expert commentary

**Estimated for 10 criterion-specific queries:**
- Input: 6,000 tokens
- Output: 12,000 tokens

---

#### **Phase 3: Source Verification (5-8 queries)**

**Per Source Verification:**
- Input: ~400 tokens
- Output: ~600 tokens

**Example Queries:**
1. Ranking organization credibility
2. Publication circulation/reach
3. Award selectivity
4. Federation verification
5. Media outlet editorial standards

**Estimated for 6 verification queries:**
- Input: 2,400 tokens
- Output: 3,600 tokens

---

#### **Phase 4: Gap-Filling Targeted Searches (3-6 queries)**

**Per Gap-Filling Query:**
- Input: ~450 tokens
- Output: ~800 tokens

**Example Queries:**
1. Missing media coverage expanded search
2. Alternative rankings if primary not found
3. Comparable evidence discovery
4. Expert identification for letters

**Estimated for 4 gap-filling queries:**
- Input: 1,800 tokens
- Output: 3,200 tokens

---

### **PERPLEXITY TOTAL COST PER RESEARCH PHASE**

**Model: `sonar` (Standard)**

| Phase | Queries | Input Tokens | Output Tokens | Cost |
|-------|---------|--------------|---------------|------|
| Phase 1: Identity | 3 | 1,250 | 2,300 | $0.00355 |
| Phase 2: Criterion Search | 10 | 6,000 | 12,000 | $0.018 |
| Phase 3: Verification | 6 | 2,400 | 3,600 | $0.006 |
| Phase 4: Gap Filling | 4 | 1,800 | 3,200 | $0.005 |
| **TOTAL** | **23** | **11,450** | **21,100** | **$0.03255** |

**With `sonar` model: ~$0.03 per research phase**

---

**Model: `sonar-pro` (Premium)**

| Phase | Queries | Input Tokens | Output Tokens | Cost |
|-------|---------|--------------|---------------|------|
| Phase 1: Identity | 3 | 1,250 | 2,300 | $0.01065 |
| Phase 2: Criterion Search | 10 | 6,000 | 12,000 | $0.054 |
| Phase 3: Verification | 6 | 2,400 | 3,600 | $0.018 |
| Phase 4: Gap Filling | 4 | 1,800 | 3,200 | $0.015 |
| **TOTAL** | **23** | **11,450** | **21,100** | **$0.09765** |

**With `sonar-pro` model: ~$0.10 per research phase**

---

### Impact on Claude Document Generation

**Additional Input Tokens from Perplexity Research:**

Perplexity will discover approximately **15-25 additional URLs** per case.

**Processing discovered URLs:**
- 20 additional URLs × 10,000 chars truncated = ~15,000 additional tokens
- This adds to Claude's input for Documents 1-4

**Estimated Additional Claude Input Costs:**
- Document 1: +10,000 tokens = **+$0.03**
- Document 2: +15,000 tokens = **+$0.045**
- Document 3: +5,000 tokens = **+$0.015**
- Document 4: +8,000 tokens per step × 3.5 steps = **+$0.084**

**Total Additional Claude Cost:** **+$0.174**

---

## FINAL COST COMPARISON

### **Option A: Current System (No Perplexity)**

| Component | Cost |
|-----------|------|
| Claude Document Generation (4 docs) | $1.83 |
| **TOTAL PER RUN** | **$1.83** |

**Estimated URLs processed:** 5-10 (user-provided only)

---

### **Option B: With Perplexity Research (sonar model)**

| Component | Cost |
|-----------|------|
| Perplexity Research (23 queries) | $0.03 |
| Claude Document Generation (4 docs) | $1.83 |
| Additional Claude Input (discovered URLs) | $0.17 |
| **TOTAL PER RUN** | **$2.03** |

**Estimated URLs processed:** 25-35 (user + discovered)

**Cost Increase:** +$0.20 per run (+10.9%)

---

### **Option C: With Perplexity Research (sonar-pro model)**

| Component | Cost |
|-----------|------|
| Perplexity Research (23 queries) | $0.10 |
| Claude Document Generation (4 docs) | $1.83 |
| Additional Claude Input (discovered URLs) | $0.17 |
| **TOTAL PER RUN** | **$2.10** |

**Estimated URLs processed:** 25-35 (user + discovered)

**Cost Increase:** +$0.27 per run (+14.8%)

---

## COST PER VOLUME

### Monthly Volume Scenarios

#### **50 Cases/Month**

| System | Cost per Run | Monthly Cost | Annual Cost |
|--------|--------------|--------------|-------------|
| Current (No Perplexity) | $1.83 | $91.50 | $1,098 |
| With Perplexity (sonar) | $2.03 | $101.50 | $1,218 |
| With Perplexity (sonar-pro) | $2.10 | $105.00 | $1,260 |

**Monthly Increase:** +$10 to +$13.50

---

#### **100 Cases/Month**

| System | Cost per Run | Monthly Cost | Annual Cost |
|--------|--------------|--------------|-------------|
| Current (No Perplexity) | $1.83 | $183.00 | $2,196 |
| With Perplexity (sonar) | $2.03 | $203.00 | $2,436 |
| With Perplexity (sonar-pro) | $2.10 | $210.00 | $2,520 |

**Monthly Increase:** +$20 to +$27

---

#### **250 Cases/Month**

| System | Cost per Run | Monthly Cost | Annual Cost |
|--------|--------------|--------------|-------------|
| Current (No Perplexity) | $1.83 | $457.50 | $5,490 |
| With Perplexity (sonar) | $2.03 | $507.50 | $6,090 |
| With Perplexity (sonar-pro) | $2.10 | $525.00 | $6,300 |

**Monthly Increase:** +$50 to +$67.50

---

## VALUE ANALYSIS

### What You Gain with Perplexity Integration

**For +$0.20 per case (sonar) or +$0.27 per case (sonar-pro):**

1. **15-25 additional URLs discovered** autonomously
2. **Source quality verification** for all URLs
3. **Evidence gap identification** before submission
4. **Criterion-by-criterion research** following attorney methodology
5. **4-tier source quality assessment** automated
6. **Field-specific research strategies** applied systematically
7. **National team verification** for athletes
8. **Rankings from multiple systems** for sports
9. **Media coverage discovery** from Tier 1-2 sources
10. **Comparable evidence research** for non-traditional fields

### ROI Calculation

**Without Perplexity:**
- Paralegal research time: 2-3 hours @ $40-60/hr = **$80-180 per case**
- Risk of missing critical evidence: **High**
- Source quality consistency: **Variable**

**With Perplexity ($2.03 per case):**
- Automated research: **$2.03**
- Paralegal review time: 30-45 min @ $40-60/hr = **$20-45**
- Risk of missing evidence: **Low**
- Source quality: **Consistent (4-tier system)**

**Net Savings:** **$58-133 per case**

**Break-even:** After discovering **1 additional Tier 1 source** that would take paralegal 15+ minutes to find

---

## OPTIMIZATION RECOMMENDATIONS

### Cost Reduction Strategies

1. **Use `sonar` for initial research, `sonar-pro` only for complex cases**
   - Athletes with clear national team: `sonar`
   - Emerging fields needing comparable evidence: `sonar-pro`
   - Estimated savings: 30-40%

2. **Implement query caching**
   - Same field/sport queries reused across cases
   - Example: "Cricket national team caps verification" cached
   - Estimated savings: 10-15%

3. **Progressive research depth**
   - Phase 1-2 automatic (always run)
   - Phase 3-4 only if gaps detected
   - Estimated savings: 15-20%

4. **Batch similar cases**
   - Multiple athletes from same sport
   - Research shared sources once
   - Estimated savings: 20-25%

### Recommended Pricing Model for Clients

**Basic Package (No Perplexity):**
- User provides all URLs
- Cost to you: $1.83
- Charge client: **$99-149**
- Margin: $97-147

**Premium Package (With Perplexity):**
- Autonomous research + user URLs
- Cost to you: $2.03
- Charge client: **$199-249**
- Margin: $197-247

**Attorney Service Package:**
- Perplexity research + expert review
- Cost to you: $2.03 + attorney time
- Charge client: **$499-799**
- Margin: $497-797

---

## HIDDEN COSTS TO CONSIDER

### Costs NOT Included in Above Analysis

1. **URL Fetching (Axios requests):**
   - Currently free (direct HTTP)
   - 25-35 URLs × ~2 seconds each = minimal bandwidth cost
   - Estimated: **<$0.01 per run**

2. **SendGrid Email:**
   - Free tier: 100 emails/day
   - After free tier: $0.001 per email
   - Estimated: **$0.001 per run** (if over free tier)

3. **Vercel Blob Storage (if implemented):**
   - Document storage for 30 days
   - ~2-5 MB per case
   - Estimated: **$0.02-0.05 per case**

4. **Database costs (if added):**
   - Progress tracking, case history
   - Supabase free tier or $25/month
   - Estimated: **$0.10-0.50 per case** (if implemented)

---

## FINAL SUMMARY

### **Cost Per Run Breakdown**

| Item | Current | With Perplexity (sonar) | With Perplexity (sonar-pro) |
|------|---------|------------------------|----------------------------|
| **Claude API** | $1.83 | $2.00 | $2.00 |
| **Perplexity API** | $0 | $0.03 | $0.10 |
| **Email (SendGrid)** | $0.001 | $0.001 | $0.001 |
| **URL Fetching** | <$0.01 | <$0.01 | <$0.01 |
| **TOTAL** | **$1.84** | **$2.04** | **$2.11** |

### **Recommended Configuration**

**For Production:** Use Perplexity `sonar` model

**Reasoning:**
- Only **$0.20 more per case** (+10.9%)
- Discovers 15-25 additional quality sources
- Saves 1.5-2.5 hours of paralegal research time
- Consistent 4-tier source quality assessment
- Systematic evidence gap identification
- ROI: **$58-133 saved per case** in labor costs

**Annual Savings at 100 cases/month:**
- Labor cost reduction: **$5,800 - $13,300**
- Perplexity API cost: **-$240**
- **Net Annual Benefit: $5,560 - $13,060**

---

## IMPLEMENTATION COST TRACKING

### How to Monitor Costs in Production

**Create `/app/lib/cost-tracker.ts`:**

```typescript
interface ApiCallCost {
  service: 'anthropic' | 'perplexity';
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

interface CaseCostSummary {
  caseId: string;
  perplexityResearch: number;
  claudeDoc1: number;
  claudeDoc2: number;
  claudeDoc3: number;
  claudeDoc4: number;
  totalCost: number;
  urlsProvided: number;
  urlsDiscovered: number;
  totalUrls: number;
}
```

**Track:**
- Every API call's token usage
- Estimated cost in real-time
- Per-document costs
- Per-case total costs
- Monthly aggregates

**Benefits:**
- Identify cost outliers (unusually expensive cases)
- Optimize prompt sizes
- Monitor Perplexity query efficiency
- Justify pricing to clients with data

---

**End of Cost Analysis**

**Key Takeaway:** Perplexity integration adds **$0.20 per case** but saves **$58-133 in labor costs** - a **29x to 66x ROI**.
