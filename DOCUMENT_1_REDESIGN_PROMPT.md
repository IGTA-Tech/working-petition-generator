# 📝 DOCUMENT 1 REDESIGN - Instructions for Claude Code

Copy and paste this entire prompt into Claude Code to redesign Document 1:

---

## TASK: Redesign Document 1 (Comprehensive Analysis)

**Current Problem:** Document 1 is too long and too heavy on legal analysis. It should be a concise research summary.

**New Goal:** Create a focused, research-organized document that shows:
1. What research was done (total sources found)
2. How sources map to each criterion
3. Strength assessment per criterion
4. Overall case strength
5. What's missing (gaps)

**Key Principle:** This is a RESEARCH SUMMARY, not a legal brief. Be concise and organized, not drawn out.

---

## NEW DOCUMENT 1 STRUCTURE

Document 1 should be **2,500-3,500 words** and follow this EXACT structure:

```markdown
# RESEARCH SUMMARY & CASE ASSESSMENT
## [Visa Type] Petition - [Beneficiary Name]

**Date:** [Date]
**Visa Classification:** [O-1A / O-1B / P-1A / EB-1A]
**Field:** [Field of profession]

---

## EXECUTIVE SUMMARY

**Total Sources Researched:** [Count] ([X] user-provided + [Y] AI-discovered)

**Overall Case Strength:** [Strong ✅ / Moderate ⚠️ / Weak ❌]

**Approval Probability:** [High 75-90% / Moderate 50-75% / Low <50%]

**Key Strengths:**
- [Top 3-4 strongest evidence points in bullet form]

**Critical Gaps:**
- [Top 2-3 missing evidence types in bullet form]

**Recommendation:** [Proceed with petition / Need more research / Not advisable]

---

## REGULATORY FRAMEWORK (BRIEF)

**[Visa Type] Standard:** [One sentence on the legal standard]

**Criteria Required:** Must meet [X] of [Y] criteria

**Criteria List:**
1. [Criterion name] - [5-10 word description]
2. [Criterion name] - [5-10 word description]
[Continue for all criteria]

---

## RESEARCH RESULTS BY CRITERION

### CRITERION 1: [Regulatory Name]

**Regulatory Requirement (Brief):** [1-2 sentences maximum]

**Evidence Found:**

**Tier 1 Sources (Major Media/Official):** [Count]
- [Source 1 name] - [What it proves in 5-10 words]
- [Source 2 name] - [What it proves in 5-10 words]
[List all Tier 1 sources for this criterion]

**Tier 2 Sources (Industry/Regional):** [Count]
- [Source 1 name] - [What it proves in 5-10 words]
- [Source 2 name] - [What it proves in 5-10 words]
[List all Tier 2 sources]

**Tier 3 Sources (General/Local):** [Count]
- [Brief mention if relevant, or "See full list in Document 3"]

**Strength Assessment:** [Strong ✅ / Moderate ⚠️ / Weak ❌]

**Why:** [2-3 sentences explaining strength level]

**Gap Analysis:** [What's missing for this criterion - 1-2 sentences]

**Next Steps:** [Specific research needed - 1-2 bullet points with search queries]

---

[REPEAT STRUCTURE FOR ALL APPLICABLE CRITERIA]

---

## SOURCE QUALITY OVERVIEW

**Tier 1 Sources:** [Count] - [List domains: NYT, ESPN, BBC, etc.]
**Tier 2 Sources:** [Count] - [List domains]
**Tier 3 Sources:** [Count] - [List domains]

**Geographic Reach:**
- International coverage: [Count] sources
- National coverage: [Count] sources
- Regional coverage: [Count] sources

**Source Diversity:**
- Major media: [Count]
- Industry publications: [Count]
- Official/Government: [Count]
- Academic: [Count]
- Databases: [Count]

**Temporal Distribution:**
- Last 6 months: [Count]
- Last year: [Count]
- Last 3 years: [Count]
- Older: [Count]

---

## CRITERION COVERAGE MATRIX

| Criterion | Sources | Tier 1 | Tier 2 | Tier 3 | Strength | Status |
|-----------|---------|--------|--------|--------|----------|--------|
| 1: [Name] | [#] | [#] | [#] | [#] | [●●●○○] | ✅ Strong |
| 2: [Name] | [#] | [#] | [#] | [#] | [●●○○○] | ⚠️ Moderate |
| 3: [Name] | [#] | [#] | [#] | [#] | [●○○○○] | ❌ Weak |
[Continue for all criteria]

**Legend:**
- ✅ Strong: 3+ quality sources, including Tier 1
- ⚠️ Moderate: 2-3 sources, may lack Tier 1
- ❌ Weak: <2 sources or poor quality

---

## EVIDENCE GAPS & PRIORITIES

### HIGH PRIORITY GAPS
1. **[Criterion Name]:** Missing [specific evidence type]
   - **Impact:** [How this weakens case - 1 sentence]
   - **Action:** Search for: "[exact query]"
   - **Target:** [What you hope to find]

2. **[Another criterion]:** [Same format]

[List 3-5 high priority gaps]

### MEDIUM PRIORITY GAPS
[List 3-5 medium priority gaps in same format]

### RECOMMENDED RESEARCH STRATEGY
1. **Phase 1:** [Search for X, Y, Z] - [Why]
2. **Phase 2:** [Search for A, B, C] - [Why]
3. **Phase 3:** [Search for D, E, F] - [Why]

---

## COMPARABLE EVIDENCE CONSIDERATIONS

[ONLY if O-1A/O-1B/EB-1A - P-1A skip this section]

**Criteria That May Need Comparable Evidence:**
- [Criterion X]: [Why standard evidence may not apply - 1 sentence]
- [Criterion Y]: [Same]

**Comparable Evidence Strategy:**
[Brief 2-3 sentence explanation of approach if needed]

---

## FINAL ASSESSMENT

**Criteria Met (Strong):** [Count] - [List them]
**Criteria Met (Moderate):** [Count] - [List them]
**Criteria Not Met (Weak):** [Count] - [List them]

**Minimum Required:** [X] criteria
**Currently Satisfied:** [Y] criteria (Strong) + [Z] criteria (Moderate)

**Case Status:**
- ✅ **Petition-Ready:** [Y] strong criteria meet minimum requirement
- ⚠️ **Needs More Research:** Close to requirement but needs strengthening
- ❌ **Not Ready:** Below minimum requirement

**Confidence Level:** [High / Moderate / Low]

**Recommended Next Steps:**
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

---

## APPENDIX: RESEARCH METHODOLOGY

**Total URLs Analyzed:** [Count]
- User-provided: [Count]
- AI-discovered (if applicable): [Count]

**Research Phases Completed:**
- ✅ Identity & achievement discovery
- ✅ Industry database research
- ✅ Media coverage research
- ✅ Regional/comparative research

**Sources Excluded:** [Count]
**Reason for Exclusion:** [Self-published, paywalled, low quality, etc.]

---

**END OF DOCUMENT 1**
```

---

## KEY CHANGES FROM CURRENT VERSION

### REMOVE:
- ❌ Long legal analysis of each criterion
- ❌ Detailed regulatory discussion
- ❌ Drawn-out explanations
- ❌ Repetitive content
- ❌ Attorney-level legal reasoning (save for Document 4)

### ADD:
- ✅ Clear criterion-by-criterion evidence mapping
- ✅ Tier ratings for each source
- ✅ Strength assessment per criterion
- ✅ Visual coverage matrix
- ✅ Prioritized gap analysis
- ✅ Specific search recommendations
- ✅ Concise, organized structure

### KEEP:
- ✅ Executive summary
- ✅ Overall strength assessment
- ✅ What's applicable to this case
- ✅ Recommendation

---

## IMPLEMENTATION INSTRUCTIONS FOR CLAUDE CODE

1. **Locate the function:** Find `generateComprehensiveAnalysis()` in `/app/lib/document-generator.ts` (around line 207)

2. **Update the prompt** (lines 220-303) with the NEW STRUCTURE above

3. **Change token allocation:**
   - OLD: `max_tokens: 16384`
   - NEW: `max_tokens: 8192` (sufficient for 2,500-3,500 words)

4. **Update prompt instructions to emphasize:**
   ```typescript
   MANDATORY REQUIREMENTS:
   - **LENGTH:** 2,500-3,500 words (concise and organized)
   - **FOCUS:** Research findings and evidence organization
   - **TONE:** Summary report, not legal brief
   - **FORMAT:** Bullet points and tables, not paragraphs
   - **DETAIL LEVEL:** Brief explanations (1-2 sentences max per point)
   - **NO LEGAL ANALYSIS:** Save detailed legal reasoning for Document 4
   ```

5. **Update progress message** (around line 152):
   - OLD: "Creating comprehensive source quality analysis..."
   - NEW: "Creating concise research summary with criterion mapping (3-5 min)..."

---

## DOCUMENT 1 PURPOSE STATEMENT

**What Document 1 IS:**
- Research summary showing what evidence was found
- Criterion-by-criterion evidence mapping
- Source quality assessment
- Gap identification
- Quick reference for case strength

**What Document 1 IS NOT:**
- Legal brief (that's Document 4)
- Source-by-source deep analysis (that's Document 2)
- URL reference list (that's Document 3)
- Drawn-out legal reasoning

**Target Audience:** Attorney or petitioner who needs to quickly understand:
1. What evidence exists
2. How it maps to criteria
3. What's missing
4. Whether case is petition-ready

**Reading Time:** 10-15 minutes (not 30-45 minutes)

---

## EXAMPLE OF GOOD vs BAD STYLE

### BAD (Current Style - Too Drawn Out):
```
Criterion 1 requires that the beneficiary demonstrate receipt of nationally
or internationally recognized prizes or awards for excellence in the field.
The regulatory standard, as set forth in 8 CFR § 214.2(o)(3)(iii)(A),
establishes a high threshold requiring that such awards be both recognized
beyond a local level and specifically granted for excellence rather than
mere participation. In analyzing the evidence gathered for Ms. Metcalfe...
[continues for 500 words]
```

### GOOD (New Style - Concise & Organized):
```
### CRITERION 1: Awards & Prizes

**Requirement:** Nationally/internationally recognized awards for excellence

**Evidence Found:**

**Tier 1 Sources:** 0
[No major award announcements found]

**Tier 2 Sources:** 2
- Favikon "Top Creator" recognition - Industry achievement award
- TikTok verification badge - Platform recognition

**Tier 3 Sources:** 3
[See Document 3 for full list]

**Strength Assessment:** ⚠️ Moderate

**Why:** Has industry recognition but lacks major award from established
organization. Verification badge and creator status show achievement but
may not meet "nationally recognized" standard.

**Gap:** Need formal award from industry organization (Shorty Awards,
Streamy Awards, etc.)

**Next Steps:**
- Search: "[Name] + Shorty Awards OR Streamy Awards"
- Check: Platform award announcements from TikTok/Instagram
```

---

## SUCCESS CRITERIA

Document 1 will be successful if:

1. ✅ Reads in 10-15 minutes
2. ✅ Clearly shows evidence found per criterion
3. ✅ Shows source tier breakdown
4. ✅ Identifies gaps with specific recommendations
5. ✅ Provides quick case strength assessment
6. ✅ Is useful as a working reference (not just informative)
7. ✅ Stays focused (2,500-3,500 words)
8. ✅ Avoids drawn-out legal reasoning

---

**NOW:** Use this prompt to update the `generateComprehensiveAnalysis()` function in document-generator.ts!
