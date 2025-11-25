import Anthropic from '@anthropic-ai/sdk';
import { BeneficiaryInfo, VisaType, UploadedFileData } from '../types';
import { getKnowledgeBaseFiles, buildKnowledgeBaseContext } from './knowledge-base';
import { fetchMultipleUrls, FetchedUrlData, analyzePublicationQuality } from './url-fetcher';
import { processFile, generateFileEvidenceSummary } from './file-processor';
import { generateLegalBriefMultiStep } from './legal-brief-multi-step';
import { conductPerplexityResearch, ResearchResult } from './perplexity-research';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to get criteria count and minimum by visa type
function getVisaCriteria(visaType: string): { count: number; minimum: number; hasComparableEvidence: boolean } {
  switch(visaType) {
    case 'O-1A':
      return { count: 8, minimum: 3, hasComparableEvidence: true };
    case 'O-1B':
      return { count: 6, minimum: 3, hasComparableEvidence: true };
    case 'P-1A':
      return { count: 7, minimum: 2, hasComparableEvidence: false };
    case 'EB-1A':
      return { count: 10, minimum: 3, hasComparableEvidence: true };
    default:
      return { count: 8, minimum: 3, hasComparableEvidence: true };
  }
}

// Helper to get CFR section by visa type
function getCFRSection(visaType: string): string {
  switch(visaType) {
    case 'O-1A':
    case 'O-1B':
      return '8 CFR § 214.2(o)';
    case 'P-1A':
      return '8 CFR § 214.2(p)';
    case 'EB-1A':
      return '8 CFR § 204.5(h)';
    default:
      return '8 CFR § 214.2(o)';
  }
}

// Helper to get visa-specific regulations
function getVisaSpecificRegulations(visaType: string): string {
  switch(visaType) {
    case 'O-1A':
      return `According to **8 CFR § 214.2(o)(3)(iii)**, the supporting documentation must include evidence that the Beneficiary has:
- A major internationally recognized award (such as the Nobel Prize), OR
- At least **THREE (3) of the following EIGHT (8)** forms of evidence:

(i) Documentation of the Beneficiary's receipt of nationally or internationally recognized prizes or awards for excellence in the field of endeavor.
(ii) Documentation of the Beneficiary's membership in associations in the field requiring outstanding achievements, as judged by recognized national or international experts.
(iii) Published material in professional or major trade publications or major media about the Beneficiary, relating to the Beneficiary's work in the field.
(iv) Evidence of the Beneficiary's participation on a panel, or individually, as a judge of the work of others in the same or in an allied field.
(v) Evidence of the Beneficiary's original scientific, scholarly, or business-related contributions of major significance in the field.
(vi) Evidence of the Beneficiary's authorship of scholarly articles in the field, in professional or major trade publications or other major media.
(vii) Evidence that the Beneficiary has been employed in a critical or essential capacity for organizations and establishments that have a distinguished reputation.
(viii) Evidence that the Beneficiary has either commanded a high salary or will command a high salary or other remuneration for services, as evidenced by contracts or other reliable evidence.`;

    case 'O-1B':
      return `According to **8 CFR § 214.2(o)(3)(v)**, the supporting documentation must include evidence that the Beneficiary has been nominated for, or has received, a significant international or national award (such as an Academy Award, Emmy, Grammy, or Director's Guild Award) or at least **THREE (3) of the following SIX (6)** forms of evidence:

(i) Evidence that the Beneficiary has performed, and will perform, services as a lead or starring participant in productions or events which have a distinguished reputation.
(ii) Evidence that the Beneficiary has achieved national or international recognition for achievements, as shown by critical reviews or other published materials.
(iii) Evidence that the Beneficiary has performed, and will perform, in a lead, starring, or critical role for organizations and establishments that have a distinguished reputation.
(iv) Evidence that the Beneficiary has a record of major commercial or critically acclaimed successes.
(v) Evidence that the Beneficiary has received significant recognition for achievements from organizations, critics, government agencies, or other recognized experts in the field.
(vi) Evidence that the Beneficiary has commanded, or will command, a high salary or other substantial remuneration for services in relation to others in the field.`;

    case 'P-1A':
      return `According to **8 CFR § 214.2(p)(4)(ii)(B)(1)**, the petition must include:

**A tendered contract** with a major U.S. sports league or team, or for individual sports, a contract demonstrating participation at an internationally recognized level.

Additionally, the petition must include documentation meeting at least **TWO (2) of the following SEVEN (7)** criteria:

1. Significant Participation in Prior Seasons with a Major U.S. Sports League
2. Participation in International Competition with a National Team
3. Significant Participation in Prior Intercollegiate Competition
4. Written Statement from Governing Body Official
5. Written Statement from Recognized Expert or Media
6. International Rankings
7. Receipt of Significant Honors or Awards`;

    case 'EB-1A':
      return `According to **8 CFR § 204.5(h)**, the petition must include evidence that the alien has:
- A one-time achievement (major internationally recognized award like Nobel Prize), OR
- At least **THREE (3) of the following TEN (10)** criteria:

1. Awards or Prizes - Lesser nationally/internationally recognized
2. Membership - Requiring outstanding achievements
3. Published Material - About the person in professional/major media
4. Judging - Of the work of others
5. Original Contributions - Of major significance
6. Scholarly Articles - By the beneficiary
7. Artistic Exhibitions/Showcases - Display of work
8. Leading/Critical Role - For organizations with distinguished reputation
9. High Salary - Relative to others in field
10. Commercial Success - In performing arts

**Two-Step Kazarian Analysis Required:**
Step 1: Does petitioner meet at least 3 of 10 criteria?
Step 2: Does totality of evidence demonstrate sustained national/international acclaim and top of field?`;

    default:
      return '';
  }
}

export interface GenerationResult {
  document1: string; // Comprehensive Analysis
  document2: string; // Publication Analysis
  document3: string; // URL Reference
  document4: string; // Legal Brief
  urlsAnalyzed: FetchedUrlData[];
  filesProcessed: number;
  perplexityResearch?: ResearchResult; // Perplexity research results (if enabled)
}

async function processUploadedFiles(files: UploadedFileData[]): Promise<string> {
  if (files.length === 0) return '';

  let fileEvidence = '\n\n# UPLOADED DOCUMENT EVIDENCE\n\n';
  fileEvidence += `Total documents uploaded: ${files.length}\n\n`;

  for (const fileData of files) {
    fileEvidence += `## ${fileData.fileName}\n`;
    fileEvidence += `- Type: ${fileData.fileType}\n`;
    fileEvidence += `- Word Count: ${fileData.wordCount}\n`;
    if (fileData.pageCount) {
      fileEvidence += `- Pages: ${fileData.pageCount}\n`;
    }
    fileEvidence += `\n**Summary:**\n${fileData.summary}\n\n`;
    fileEvidence += `---\n\n`;
  }

  return fileEvidence;
}

export async function generateAllDocuments(
  beneficiaryInfo: BeneficiaryInfo,
  onProgress?: (stage: string, progress: number, message: string) => void
): Promise<GenerationResult> {
  // Stage 1: Read Knowledge Base (5%)
  onProgress?.('Reading Knowledge Base', 5, `Loading ${beneficiaryInfo.visaType} visa petition knowledge base and regulatory files...`);
  const knowledgeBaseFiles = await getKnowledgeBaseFiles(beneficiaryInfo.visaType);
  const knowledgeBaseContext = buildKnowledgeBaseContext(knowledgeBaseFiles, beneficiaryInfo.visaType);

  // Stage 2: Process Uploaded Files (10%)
  onProgress?.('Processing Uploaded Files', 10, `Extracting text from ${beneficiaryInfo.uploadedFiles?.length || 0} uploaded documents...`);
  const fileEvidence = await processUploadedFiles(beneficiaryInfo.uploadedFiles || []);

  // Stage 3: Perplexity Research (5-20%)
  let perplexityResearch: ResearchResult | undefined;
  if (process.env.PERPLEXITY_API_KEY) {
    onProgress?.('Perplexity Research', 5, 'Conducting AI-powered evidence discovery (title analysis + 3 research phases)...');
    try {
      perplexityResearch = await conductPerplexityResearch(beneficiaryInfo, onProgress);
      onProgress?.('Perplexity Research', 20, `Discovered ${perplexityResearch.totalSourcesFound} additional sources (${perplexityResearch.tier1Count} Tier 1, ${perplexityResearch.tier2Count} Tier 2)`);
    } catch (error: any) {
      console.error('Perplexity research failed, continuing without it:', error.message);
      onProgress?.('Perplexity Research', 20, 'Perplexity research unavailable, continuing with user-provided URLs only');
    }
  }

  // Stage 4: Fetch All URLs (25%)
  // Combine user URLs with Perplexity-discovered URLs
  const allUrls = [...beneficiaryInfo.primaryUrls];
  if (perplexityResearch?.discoveredSources) {
    const discoveredUrls = perplexityResearch.discoveredSources.map(s => s.url);
    allUrls.push(...discoveredUrls);
  }

  onProgress?.('Analyzing URLs', 25, `Fetching and analyzing ${allUrls.length} evidence URLs (${beneficiaryInfo.primaryUrls.length} provided + ${perplexityResearch?.totalSourcesFound || 0} discovered)...`);
  const urlsAnalyzed = await fetchMultipleUrls(allUrls);

  // Stage 4: Generate Document 1 - Comprehensive Analysis (30%)
  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  onProgress?.('Generating Comprehensive Analysis', 30, `Creating concise research summary with criterion mapping (3-5 min)... This will continue even if you close your browser.`);
  const document1 = await generateComprehensiveAnalysis(
    beneficiaryInfo,
    knowledgeBaseContext,
    urlsAnalyzed,
    fileEvidence
  );

  // Stage 5: Generate Document 2 - Publication Analysis (55%)
  onProgress?.('Generating Publication Analysis', 55, `Creating USCIS Evidence Package Index with exhibit sheets (10-15 min)... Generation continues in background.`);
  const document2 = await generatePublicationAnalysis(
    beneficiaryInfo,
    knowledgeBaseContext,
    urlsAnalyzed,
    document1
  );

  // Stage 6: Generate Document 3 - URL Reference (75%)
  onProgress?.('Generating URL Reference', 75, `Creating simplified URL reference list (2-3 min)... Almost there!`);
  const document3 = await generateUrlReference(
    beneficiaryInfo,
    urlsAnalyzed,
    document1,
    document2
  );

  // Stage 7: Generate Document 4 - Legal Brief (85%)
  const briefModeText = beneficiaryInfo.briefMode === 'standard' ? 'standard (15-25 pages)' : 'comprehensive (40-80 pages)';
  onProgress?.('Generating Legal Brief', 85, `Creating ${briefModeText} attorney-grade ${beneficiaryInfo.visaType} legal brief (20-25 min)... Final stage!`);
  const document4 = await generateLegalBrief(
    beneficiaryInfo,
    knowledgeBaseContext,
    document1,
    document2,
    document3,
    urlsAnalyzed
  );

  onProgress?.('Finalizing', 95, 'All documents generated successfully! Preparing email delivery...');

  return {
    document1,
    document2,
    document3,
    document4,
    urlsAnalyzed,
    filesProcessed: beneficiaryInfo.uploadedFiles?.length || 0,
    perplexityResearch,
  };
}

async function generateComprehensiveAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  fileEvidence: string
): Promise<string> {
  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  const urlContext = urls
    .map(
      (url, i) =>
        `URL ${i + 1}: ${url.url}\nDomain: ${url.domain}\nTitle: ${url.title}\nContent: ${url.content.substring(0, 2000)}...\n`
    )
    .join('\n\n');

  const prompt = `You are an expert immigration research analyst creating a CONCISE RESEARCH SUMMARY for a ${beneficiaryInfo.visaType} visa petition.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field/Profession: ${beneficiaryInfo.fieldOfProfession}
- Background: ${beneficiaryInfo.background}
- Additional Info: ${beneficiaryInfo.additionalInfo || 'None provided'}
${beneficiaryInfo.petitionerName ? `- Petitioner: ${beneficiaryInfo.petitionerName}` : ''}

UPLOADED DOCUMENT EVIDENCE:
${fileEvidence || 'No documents uploaded'}

EVIDENCE URLS ANALYZED (${urls.length} total):
${urlContext}

KNOWLEDGE BASE:
${knowledgeBase.substring(0, 50000)}

MANDATORY REQUIREMENTS:
- **LENGTH:** 2,500-3,500 words (concise and organized)
- **FOCUS:** Research findings and evidence organization
- **TONE:** Summary report, not legal brief
- **FORMAT:** Bullet points and tables, not long paragraphs
- **DETAIL LEVEL:** Brief explanations (1-2 sentences max per point)
- **NO LEGAL ANALYSIS:** Save detailed legal reasoning for Document 4

YOUR TASK:
Generate a RESEARCH SUMMARY & CASE ASSESSMENT document following this EXACT structure:

# RESEARCH SUMMARY & CASE ASSESSMENT
## ${beneficiaryInfo.visaType} Petition - ${beneficiaryInfo.fullName}

**Date:** ${new Date().toLocaleDateString()}
**Visa Classification:** ${beneficiaryInfo.visaType}
**Field:** ${beneficiaryInfo.fieldOfProfession}

---

## EXECUTIVE SUMMARY

**Total Sources Researched:** ${urls.length} (user-provided)

**Overall Case Strength:** [Strong ✅ / Moderate ⚠️ / Weak ❌]

**Approval Probability:** [High 75-90% / Moderate 50-75% / Low <50%]

**Key Strengths:**
- [Top 3-4 strongest evidence points in bullet form]

**Critical Gaps:**
- [Top 2-3 missing evidence types in bullet form]

**Recommendation:** [Proceed with petition / Need more research / Not advisable]

---

## REGULATORY FRAMEWORK (BRIEF)

**${beneficiaryInfo.visaType} Standard:** [One sentence on the legal standard]

**Criteria Required:** Must meet ${visaInfo.minimum} of ${visaInfo.count} criteria

**Criteria List:**
${getCriteriaListBrief(beneficiaryInfo.visaType)}

---

## RESEARCH RESULTS BY CRITERION

For EACH of the ${visaInfo.count} criteria for ${beneficiaryInfo.visaType}, generate:

### CRITERION [Number]: [Regulatory Name]

**Regulatory Requirement (Brief):** [1-2 sentences maximum]

**Evidence Found:**

**Tier 1 Sources (Major Media/Official):** [Count]
[List sources with format: "- [Source name] - [What it proves in 5-10 words]"]

**Tier 2 Sources (Industry/Regional):** [Count]
[List sources with format: "- [Source name] - [What it proves in 5-10 words]"]

**Tier 3 Sources (General/Local):** [Count]
[Brief mention or "See full list in Document 3"]

**Strength Assessment:** [Strong ✅ / Moderate ⚠️ / Weak ❌]

**Why:** [2-3 sentences explaining strength level]

**Gap Analysis:** [What's missing for this criterion - 1-2 sentences]

**Next Steps:** [Specific research needed - 1-2 bullet points with search queries]

---

[REPEAT FOR ALL ${visaInfo.count} CRITERIA]

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
[Continue for all ${visaInfo.count} criteria]

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

[List 3-5 high priority gaps]

### MEDIUM PRIORITY GAPS
[List 3-5 medium priority gaps in same format]

### RECOMMENDED RESEARCH STRATEGY
1. **Phase 1:** [Search for X, Y, Z] - [Why]
2. **Phase 2:** [Search for A, B, C] - [Why]
3. **Phase 3:** [Search for D, E, F] - [Why]

---

${visaInfo.hasComparableEvidence ? `## COMPARABLE EVIDENCE CONSIDERATIONS

**Criteria That May Need Comparable Evidence:**
- [Criterion X]: [Why standard evidence may not apply - 1 sentence]

**Comparable Evidence Strategy:**
[Brief 2-3 sentence explanation of approach if needed]

---

` : ''}## FINAL ASSESSMENT

**Criteria Met (Strong):** [Count] - [List them]
**Criteria Met (Moderate):** [Count] - [List them]
**Criteria Not Met (Weak):** [Count] - [List them]

**Minimum Required:** ${visaInfo.minimum} criteria
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

**Total URLs Analyzed:** ${urls.length}
- User-provided: ${urls.length}

**Research Phases Completed:**
- ✅ Identity & achievement discovery
- ✅ URL content extraction and analysis
- ✅ Source tier classification

**Sources Excluded:** [Count if any]
**Reason for Exclusion:** [Self-published, paywalled, low quality, etc.]

---

**END OF DOCUMENT 1**

TIER CLASSIFICATION GUIDELINES:
- **Tier 1 (Major/Official):** NYT, WSJ, ESPN, BBC, CNN, Forbes, official .gov/.edu sites, major award bodies
- **Tier 2 (Industry/Regional):** Industry publications, regional news, verified databases, professional organizations
- **Tier 3 (General/Local):** Social media, local news, fan sites, Wikipedia, general directories

Generate the COMPLETE Research Summary now. Keep it concise (2,500-3,500 words), organized, and focused on what evidence was found per criterion:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192, // Reduced from 16384 - sufficient for 2,500-3,500 words
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

// Helper function to generate brief criteria list
function getCriteriaListBrief(visaType: string): string {
  switch(visaType) {
    case 'O-1A':
      return `1. Awards - Nationally/internationally recognized prizes
2. Membership - Associations requiring outstanding achievements
3. Published Material - About beneficiary in major media
4. Judging - Participation as judge of others' work
5. Original Contributions - Of major significance
6. Scholarly Articles - Authorship in professional publications
7. Critical Role - For distinguished organizations
8. High Salary - Commanding high remuneration`;

    case 'O-1B':
      return `1. Lead/Starring Role - In distinguished productions
2. Recognition - Critical reviews/published materials
3. Critical Role - For distinguished organizations
4. Commercial Success - Major/acclaimed successes
5. Significant Recognition - From experts/organizations
6. High Salary - Substantial remuneration`;

    case 'P-1A':
      return `1. Major U.S. League Participation
2. National Team Participation
3. Intercollegiate Competition
4. Official Statement from Governing Body
5. Expert/Media Statement
6. International Rankings
7. Significant Honors/Awards`;

    case 'EB-1A':
      return `1. Awards - Nationally/internationally recognized
2. Membership - Requiring outstanding achievements
3. Published Material - About person in media
4. Judging - Of others' work
5. Original Contributions - Major significance
6. Scholarly Articles - Authorship
7. Artistic Exhibitions
8. Leading/Critical Role
9. High Salary
10. Commercial Success - Performing arts`;

    default:
      return '';
  }
}

async function generatePublicationAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  comprehensiveAnalysis: string
): Promise<string> {
  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  const urlDetails = urls
    .map((url, i) => {
      const quality = analyzePublicationQuality(url.domain);
      return `URL ${i + 1}:
- Link: ${url.url}
- Domain: ${url.domain}
- Title: ${url.title}
- Tier: ${quality.tier}
- Estimated Reach: ${quality.estimatedReach}
- Content Preview: ${url.content.substring(0, 1500)}...
`;
    })
    .join('\n\n');

  const prompt = `You are creating a USCIS EVIDENCE PACKAGE INDEX for a ${beneficiaryInfo.visaType} visa petition.

BENEFICIARY: ${beneficiaryInfo.fullName}
FIELD: ${beneficiaryInfo.fieldOfProfession}
${beneficiaryInfo.petitionerName ? `PETITIONER: ${beneficiaryInfo.petitionerName}` : ''}

PUBLICATIONS/MEDIA TO ANALYZE (${urls.length} total):
${urlDetails}

CONTEXT FROM DOCUMENT 1:
${comprehensiveAnalysis.substring(0, 5000)}

YOUR TASK:
Generate a USCIS EVIDENCE PACKAGE INDEX following this EXACT structure:

# USCIS EVIDENCE PACKAGE INDEX
## ${beneficiaryInfo.visaType} Classification - ${beneficiaryInfo.fullName}

═══════════════════════════════════════════════════════════
**COVER SHEET**
═══════════════════════════════════════════════════════════

**Petition Type:** ${beneficiaryInfo.visaType} Visa Classification
**Beneficiary Name:** ${beneficiaryInfo.fullName}
**Field of Expertise:** ${beneficiaryInfo.fieldOfProfession}
${beneficiaryInfo.petitionerName ? `**Petitioner:** ${beneficiaryInfo.petitionerName}` : '**Petitioner:** [To be determined]'}
**Date Prepared:** ${new Date().toLocaleDateString()}

**Total Exhibits:** ${urls.length} documents
**Criteria Addressed:** ${visaInfo.count} criteria evaluated
**Minimum Required:** ${visaInfo.minimum} criteria must be satisfied

---

## MASTER EXHIBIT INDEX

### EXHIBIT ORGANIZATION BY CRITERION

For EACH of the ${visaInfo.count} criteria, list the exhibits that support it:

**CRITERION 1: [Full Criterion Name]**
- Exhibit 1-A: [Brief title] — [Tier X] — [Points]
- Exhibit 1-B: [Brief title] — [Tier X] — [Points]
[Continue with all exhibits for Criterion 1]
**Subtotal: [X] exhibits | [Y] points**

**CRITERION 2: [Full Criterion Name]**
- Exhibit 2-A: [Brief title] — [Tier X] — [Points]
- Exhibit 2-B: [Brief title] — [Tier X] — [Points]
[Continue with all exhibits for Criterion 2]
**Subtotal: [X] exhibits | [Y] points**

[Continue for ALL ${visaInfo.count} criteria]

**TOTAL EVIDENCE SCORE:** [Sum all points]

---

## DETAILED EXHIBIT SHEETS

For EACH URL/source, create a detailed exhibit sheet using this EXACT format:

═══════════════════════════════════════════════════════════
**EXHIBIT [Criterion#]-[Letter]**
═══════════════════════════════════════════════════════════

**CRITERION:** [Full criterion name + CFR citation]

**EXHIBIT INFORMATION**
───────────────────────────────────────────────────────────
**EXHIBIT NUMBER:**        [X]-[Letter]
**DOCUMENT TITLE:**        [Title from URL]
**SOURCE PUBLICATION:**    [Publication/Platform name]
**PUBLICATION TIER:**      **Tier [1/2/3/4] — [Major Media/Industry/Regional/Local]**
                           **Points: [25/18/12/7] pts**
**SOURCE URL:**            [Full URL]
**PUBLICATION DATE:**      [Date if available, or "Accessed: [date]"]
**AUTHOR:**                [Author name if available]

**SOURCE CREDIBILITY**
───────────────────────────────────────────────────────────
**PUBLICATION TYPE:**      [Newspaper/Magazine/Industry/Social/Official/Academic]
**PARENT ORGANIZATION:**   [Parent company/organization]
**ESTIMATED REACH:**       [Audience size/visitors per month]
**GEOGRAPHIC SCOPE:**      [Local/Regional/National/International]
**CREDIBILITY MARKERS:**   [Why USCIS would find this credible - 1-2 sentences]

**EVIDENTIARY VALUE**
───────────────────────────────────────────────────────────
**PROVES:**                [What this source proves - 1-2 sentences]
**RELEVANCE TO CRITERION:** [How it satisfies the specific regulatory requirement - 2-3 sentences]
**KEY EXCERPTS:**
   - "[Quote 1 from source]"
   - "[Quote 2 from source]"
   - "[Quote 3 from source]"

**DOCUMENT STATUS**
───────────────────────────────────────────────────────────
**FETCH STATUS:**          ✓ Successfully fetched
**ARCHIVE STATUS:**        ☐ Not archived
**TRANSLATION NEEDED:**    No
**CERTIFICATION NEEDED:**  No

═══════════════════════════════════════════════════════════

[REPEAT THIS FORMAT FOR ALL ${urls.length} SOURCES]

---

## EVIDENCE SUMMARY

**TIER BREAKDOWN:**
- **Tier 1 (Major Media/Official):** [Count] sources — [Total points] pts
  [List domains: ESPN, NYT, BBC, etc.]
- **Tier 2 (Industry/Regional):** [Count] sources — [Total points] pts
  [List domains]
- **Tier 3 (Regional/Specialized):** [Count] sources — [Total points] pts
  [List domains]
- **Tier 4 (Local/General):** [Count] sources — [Total points] pts
  [List domains]

**CRITERION STRENGTH ASSESSMENT:**
| Criterion | Exhibits | Points | Tier 1 | Tier 2 | Tier 3+ | Status |
|-----------|----------|--------|--------|--------|---------|--------|
| 1: [Name] | [#] | [pts] | [#] | [#] | [#] | ✅ Strong |
| 2: [Name] | [#] | [pts] | [#] | [#] | [#] | ⚠️ Moderate |
[Continue for all ${visaInfo.count} criteria]

**EVIDENCE GAPS:**
1. **[Criterion Name]:** Missing [specific evidence type]
2. **[Criterion Name]:** Needs [specific improvement]
[List 3-5 key gaps]

**RECOMMENDED ADDITIONAL EVIDENCE:**
1. [Specific search or document type] — Would strengthen: [Criterion]
2. [Specific search or document type] — Would strengthen: [Criterion]
[List 5-8 specific recommendations]

---

## EXHIBIT PREPARATION CHECKLIST

For the attorney preparing the physical petition package:

**HIGH PRIORITY (Tier 1-2 Sources):**
☐ Print all Tier 1 exhibits in color
☐ Archive Tier 1 URLs using Wayback Machine
☐ Prepare certified translations if needed
☐ Obtain notarized certifications for critical exhibits

**MEDIUM PRIORITY (Tier 3 Sources):**
☐ Print Tier 2-3 exhibits (black & white acceptable)
☐ Archive important URLs
☐ Review for any content updates since fetching

**DOCUMENT ORGANIZATION:**
☐ Tab dividers for each criterion
☐ Exhibits arranged [Criterion#]-[Letter] order
☐ Cover letter references exhibit numbers
☐ All URLs accessible and not broken

**FINAL REVIEW:**
☐ All ${urls.length} exhibits accounted for
☐ Exhibit list matches cover letter
☐ URLs verified as active
☐ Archive copies prepared for critical sources

---

**END OF EVIDENCE PACKAGE INDEX**

TIER CLASSIFICATION & POINT SYSTEM:
- **Tier 1 (20-25 points):** Major mainstream media (NYT, WSJ, ESPN, BBC, CNN, Forbes), Official government/academic (.gov/.edu), Major award bodies
- **Tier 2 (15-20 points):** Industry publications (trade magazines, professional journals), Regional major news, Official databases, Verified platforms
- **Tier 3 (10-15 points):** Specialized/niche publications, Regional news, Professional social platforms, Fan/community sites
- **Tier 4 (5-10 points):** Local news, General directories, Wikipedia, Unverified sources

MANDATORY REQUIREMENTS:
- **FORMAT:** Use exact exhibit sheet template for each source
- **EXHIBIT NUMBERING:** [Criterion#]-[Letter] format (e.g., 1-A, 1-B, 2-A)
- **TIER ASSIGNMENT:** Classify each source into Tier 1/2/3/4
- **POINT CALCULATION:** Assign points per tier, calculate totals
- **CRITERION MAPPING:** Organize exhibits by which criterion they support
- **COMPLETENESS:** Create detailed sheet for ALL ${urls.length} sources
- **TARGET LENGTH:** 12,000-16,000 words (comprehensive exhibit-by-exhibit analysis)

Generate the COMPLETE Evidence Package Index now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 20480, // Increased for detailed exhibit-by-exhibit sheets
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

async function generateUrlReference(
  beneficiaryInfo: BeneficiaryInfo,
  urls: FetchedUrlData[],
  doc1: string,
  doc2: string
): Promise<string> {
  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  const urlsWithQuality = urls.map(url => ({
    ...url,
    quality: analyzePublicationQuality(url.domain)
  }));

  const prompt = `Create a SIMPLIFIED URL REFERENCE LIST for ${beneficiaryInfo.fullName}'s ${beneficiaryInfo.visaType} petition.

URLS TO ORGANIZE (${urls.length} total):
${urlsWithQuality.map((url, i) => `${i + 1}. ${url.url}
   Title: ${url.title}
   Domain: ${url.domain}
   Tier: ${url.quality.tier}
   Content Preview: ${url.content.substring(0, 500)}...`).join('\n\n')}

CONTEXT FROM DOCUMENT 1:
${doc1.substring(0, 4000)}

CONTEXT FROM DOCUMENT 2:
${doc2.substring(0, 4000)}

YOUR TASK:
Generate a simplified URL REFERENCE LIST following this EXACT structure:

# URL REFERENCE LIST
## ${beneficiaryInfo.visaType} Petition - ${beneficiaryInfo.fullName}

**Date:** ${new Date().toLocaleDateString()}
**Total URLs:** ${urls.length}
**Criteria Evaluated:** ${visaInfo.count}

---

## URLS ORGANIZED BY CRITERION

For EACH of the ${visaInfo.count} criteria, list relevant URLs in this format:

### CRITERION 1: [Full Criterion Name]

**PRIMARY EVIDENCE:**
1. **[Source Name]** — Tier [X] — [Points] pts — ✓ Active
   - URL: [Full URL]
   - Proves: [What this source proves in 1 sentence]
   - Key Detail: [One key fact or quote]

2. **[Source Name]** — Tier [X] — [Points] pts — ✓ Active
   - URL: [Full URL]
   - Proves: [What this source proves in 1 sentence]
   - Key Detail: [One key fact or quote]

[Continue for all relevant URLs for this criterion]

**CRITERION 1 EVIDENCE SCORE:** [Total points] pts ([X] sources)
**STATUS:** [✅ Strong / ⚠️ Moderate / ❌ Weak]

---

### CRITERION 2: [Full Criterion Name]

[Same format as Criterion 1]

**CRITERION 2 EVIDENCE SCORE:** [Total points] pts ([X] sources)
**STATUS:** [✅ Strong / ⚠️ Moderate / ❌ Weak]

---

[REPEAT FOR ALL ${visaInfo.count} CRITERIA]

---

## GENERAL BACKGROUND SOURCES

[List URLs that provide general biographical info but don't fit specific criteria]

1. **[Source Name]** — Tier [X] — ✓ Active
   - URL: [Full URL]
   - Type: Background/Biography

---

## EVIDENCE SUMMARY BY TIER

**Tier 1 Sources (Major Media/Official):** [Count]
[List all Tier 1 URLs with exhibit numbers from Document 2]

**Tier 2 Sources (Industry/Regional):** [Count]
[List all Tier 2 URLs with exhibit numbers from Document 2]

**Tier 3 Sources (Regional/Specialized):** [Count]
[List all Tier 3 URLs with exhibit numbers from Document 2]

**Tier 4 Sources (General/Local):** [Count]
[List all Tier 4 URLs with exhibit numbers from Document 2]

---

## TOTAL EVIDENCE SCORE: [Sum all points]

**SCORE BREAKDOWN BY CRITERION:**
| Criterion | Sources | Points | Status |
|-----------|---------|--------|--------|
| 1: [Name] | [#] | [pts] | ✅ |
| 2: [Name] | [#] | [pts] | ⚠️ |
[Continue for all ${visaInfo.count} criteria]

---

## URL STATUS & VERIFICATION

**All URLs Last Checked:** ${new Date().toLocaleDateString()}
**Active URLs:** ${urls.length}
**Broken Links:** 0
**Archive Recommended:** [List critical Tier 1-2 URLs]

**ARCHIVE PRIORITY LIST:**
1. [Tier 1 URL] — Critical evidence for Criterion [X]
2. [Tier 1 URL] — Critical evidence for Criterion [X]
[List 5-10 highest priority URLs to archive]

---

## QUICK REFERENCE: URL-TO-EXHIBIT MAPPING

This section maps each URL to its exhibit number from Document 2 (Evidence Package Index):

1. [URL] → Exhibit [X-Y]
2. [URL] → Exhibit [X-Y]
[Continue for all ${urls.length} URLs]

---

**END OF URL REFERENCE LIST**

TIER CLASSIFICATION:
- **Tier 1:** Major media, official .gov/.edu, major awards (20-25 pts)
- **Tier 2:** Industry publications, regional news, databases (15-20 pts)
- **Tier 3:** Specialized/niche, professional platforms (10-15 pts)
- **Tier 4:** Local news, directories, Wikipedia (5-10 pts)

STATUS INDICATORS:
- ✅ Strong: 3+ quality sources with Tier 1-2
- ⚠️ Moderate: 2-3 sources, may lack Tier 1
- ❌ Weak: <2 sources or low quality only

MANDATORY REQUIREMENTS:
- **ORGANIZE BY CRITERION:** Group URLs by which criterion they support
- **TIER & POINTS:** Show tier rating and point value for each URL
- **STATUS:** Mark each URL as Active/Broken
- **EXHIBIT MAPPING:** Cross-reference to Document 2 exhibit numbers
- **CONCISE:** Keep descriptions to 1 sentence per URL
- **TARGET LENGTH:** 4,000-6,000 words
- **COMPLETENESS:** Include ALL ${urls.length} URLs

Generate the COMPLETE URL Reference List now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10240, // Sufficient for 4,000-6,000 word URL list
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

// Multi-step legal brief generation to prevent truncation
async function generateLegalBrief(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string,
  urlsAnalyzed?: FetchedUrlData[]
): Promise<string> {
  // Use the new multi-step generator with smart filtering
  return await generateLegalBriefMultiStep(beneficiaryInfo, knowledgeBase, doc1, doc2, doc3, urlsAnalyzed);
}

// OLD SINGLE-STEP VERSION (KEPT FOR REFERENCE - NOT USED)
// This was causing truncation at ~7,700 words
/*
async function generateLegalBriefOLD(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string
): Promise<string> {

  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  const cfrSection = getCFRSection(beneficiaryInfo.visaType);
  const isOorP = ['O-1A', 'O-1B', 'P-1A'].includes(beneficiaryInfo.visaType);
  const isEB1A = beneficiaryInfo.visaType === 'EB-1A';

  const prompt = `You are an expert immigration attorney drafting a USCIS petition brief that EXACTLY matches the DIY template structure for ${beneficiaryInfo.visaType}.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field: ${beneficiaryInfo.fieldOfProfession}
- Background: ${beneficiaryInfo.background}

DOCUMENT CONTEXT:
**Document 1 Analysis**: ${doc1.substring(0, 10000)}
**Document 2 Publications**: ${doc2.substring(0, 8000)}
**Document 3 URL References**: ${doc3.substring(0, 5000)}
**Knowledge Base**: ${knowledgeBase.substring(0, 25000)}

---

YOUR TASK: Generate a complete ${beneficiaryInfo.visaType} petition brief following this EXACT structure from the DIY templates:

# ${new Date().toLocaleDateString().toUpperCase()}

USCIS Service Center
Attn: ${isEB1A ? 'I-140' : 'I-129 ' + (beneficiaryInfo.visaType.startsWith('P') ? 'P' : 'O')}

**Re: ${isEB1A ? 'I-140' : 'I-129'} Petition | Request for ${beneficiaryInfo.visaType} Classification**
**Petitioner:** [Innovative Global Talent Agency or appropriate name]
**Beneficiary:** ${beneficiaryInfo.fullName}
**Position:** [Professional title matching field]
**Field of Expertise:** ${beneficiaryInfo.fieldOfProfession}

Dear Immigration Examiner:

This letter is in connection with ${isEB1A ? 'an' : 'a'} ${beneficiaryInfo.visaType} visa petition in which the Petitioner is acting as:

---

## SECTION 1: PETITIONER EMPLOYMENT STRUCTURE

The Petitioner is serving in the following role(s) as indicated by an "X" below and supporting documentation is included with this submission.

☒ **Direct Employer**
   The Petitioner directly employs the Beneficiary under a traditional employer-employee relationship, maintaining full control over the terms of employment, including wages, duties, and schedule.

☐ **U.S. Agent Functioning as Employer**
   The Petitioner serves as a U.S. Agent, assuming employer responsibilities for the Beneficiary...

☐ **U.S. Agent for Foreign Employer**
   The Petitioner acts as a U.S. Agent on behalf of a foreign employer...

☐ **U.S. Agent for Multiple Employers**
   The Petitioner acts as a U.S. Agent representing multiple employers...

☐ **U.S. Agent for Foreign Employer who is Self-Employed**
   The Petitioner acts as a U.S. Agent representing a self-employed foreign employer...

**Petitioner Obligations:**

The Petitioner agrees to the following obligations:

1. **Representation**: Represent the Beneficiary to participate in events related to their intended activities in the United States.
2. **Service of Process**: Accept service of process on behalf of the Beneficiary, and if applicable, for Foreign Employers.
3. **Travel Support**: Secure reasonable travel for the Beneficiary in the event the visa is terminated early.
4. **Certification of Accuracy**: Certify that the contents of this petition are true to the best of the Petitioner's knowledge and belief.

**Duration of Agreement:**

The terms of this Agreement shall commence upon the date of approval and shall remain in effect for **3 year(s)**.

---

## SECTION 2: PRIOR APPROVAL DEFERENCE (If Applicable)

This is the Beneficiary's initial petition for ${beneficiaryInfo.visaType} classification.
[If prior approval exists, include Policy Memorandum PA-2021-05 language]

---

## SECTION 3: ABOUT THE PETITIONER

**ABOUT THE PETITIONER:**

In compliance with **${cfrSection}**, this petition provides all information required by the applicable regulations:

* The Petitioner is a U.S. entity authorized to file this petition under the regulations.
* The Petitioner is serving in the capacity of Direct Employer, as designated in this petition.
* The Petitioner affirms its responsibility to comply with all USCIS requirements.

---

## SECTION 4: ABOUT THE BENEFICIARY

**ABOUT THE BENEFICIARY**

### 1. Professional Overview

${beneficiaryInfo.fullName} is a highly accomplished ${beneficiaryInfo.fieldOfProfession} professional with [extract years of experience from background].

[Develop 2-3 detailed paragraphs using beneficiary.background and Document 1:
- Career history and timeline
- Key positions and roles
- Major achievements
- Current standing]

### 2. Extraordinary Ability or International Recognition

The Beneficiary has demonstrated ${isEB1A ? 'extraordinary ability' : (beneficiaryInfo.visaType === 'O-1B' ? 'distinction' : 'international recognition')} in ${beneficiaryInfo.fieldOfProfession}.

[Develop 2-3 paragraphs using Doc 1:
- Specific extraordinary achievements
- How they meet legal standard
- Recognition from experts/organizations
- Statistical positioning]

### 3. Contribution to the United States

The Beneficiary will contribute to the United States by [describe planned activities from background].

[Develop 1-2 paragraphs about planned U.S. work and benefits]

---

${isOorP ? `## SECTION 5: INFORMATION ABOUT THIRD PARTY EMPLOYERS

If applicable, agreements regarding foreign or multiple employers are included, as required by **${cfrSection}**.

---

## SECTION 6: CONSULTATION LETTER

**Advisory Opinion/Consultation Letter:**

After conducting an exhaustive search as required under **${cfrSection}**, no appropriate labor organization exists to provide a consultation letter for the Beneficiary's profession.

The Petitioner has included alternative evidence demonstrating the Beneficiary's extraordinary ability:
1. Letters from recognized experts affirming their qualifications.
2. Documentation of achievements, awards, and recognition.

---

` : ''}## SECTION ${isOorP ? '7' : '5'}: REGULATORY REQUIREMENTS

**REGULATORY REQUIREMENTS FOR ${beneficiaryInfo.visaType} PETITION**

${getVisaSpecificRegulations(beneficiaryInfo.visaType)}

---

## SECTION ${isOorP ? '8' : '6'}: EVIDENCE OF EXTRAORDINARY ABILITY

[For EACH of the ${visaInfo.count} criteria, generate a detailed section with this structure:]

### Criterion [Number]: [Full Regulatory Name]

☒ **[Checkbox for claimed criteria] - The Beneficiary meets this criterion**

**Regulatory Standard**: [Quote exact CFR language]

**Evidence Presented**:
[List 5-10 pieces of evidence with exhibit numbers and references to Document 3 URLs]
- Exhibit [X-Y]: [Description] - [Source Tier from Doc 2] - [URL from Doc 3]

**Analysis** (2-3 pages of legal argument):

[Opening paragraph establishing criterion importance]

[3-5 paragraphs analyzing evidence quality using:
- Specific achievements from Document 1
- Source credibility from Document 2 (Tier ratings)
- URL references from Document 3
- Regulatory standards comparison
- Statistical positioning where applicable]

${visaInfo.hasComparableEvidence ? `

**Comparable Evidence Consideration**:

☒ In the alternative, if USCIS determines the above evidence does not satisfy the regulatory criterion, the Petitioner submits comparable evidence under 8 CFR § ${cfrSection === '8 CFR § 214.2(o)' ? '214.2(o)(3)(iii)' : (cfrSection === '8 CFR § 214.2(p)' ? '214.2(p)(4)(ii)(C)' : '204.5(h)(4)')}.

[2-3 paragraphs explaining:
- Why standard criterion may not readily apply
- What comparable evidence is submitted
- How it demonstrates equivalent achievement
- Supporting regulatory authority for comparable evidence]
` : ''}

**Conclusion**: The Beneficiary clearly satisfies this criterion based on the preponderance of evidence.

[REPEAT THIS STRUCTURE FOR ALL ${visaInfo.count} CRITERIA - ensure ${visaInfo.minimum} minimum are marked with ☒]

---

${isEB1A ? `## SECTION 7: FINAL MERITS DETERMINATION (KAZARIAN STEP 2)

Having established that the Beneficiary meets at least three (3) of the regulatory criteria under Step 1 of the Kazarian analysis, we now address Step 2: whether the totality of evidence demonstrates sustained national or international acclaim.

### A. Sustained National or International Acclaim

[3-4 paragraphs using:
- Timeline of achievements from Doc 1
- Geographic spread from Doc 2
- Sustained excellence pattern
- Continued relevance]

### B. Small Percentage at Top of Field

[3-4 paragraphs using:
- Statistical analysis from Doc 1
- Percentile rankings
- Comparative positioning
- Top-tier evidence]

### C. Continued Work in Area of Expertise

The Beneficiary will continue to work in ${beneficiaryInfo.fieldOfProfession} in the United States.

[2-3 paragraphs about U.S. plans and contributions]

**Conclusion**: The totality of evidence demonstrates that ${beneficiaryInfo.fullName} possesses extraordinary ability in ${beneficiaryInfo.fieldOfProfession}, as required under **8 CFR § 204.5(h)** and **Kazarian v. USCIS, 596 F.3d 1115 (9th Cir. 2010)**.

---

` : ''}## SECTION ${isOorP ? (isEB1A ? '8' : '9') : (isEB1A ? '8' : '7')}: CONCLUSION

For the foregoing reasons, ${beneficiaryInfo.fullName} clearly qualifies for ${beneficiaryInfo.visaType} classification.

[Develop 3-4 compelling paragraphs:
- Recap strongest criteria met
- Emphasize source credibility
- Reference sustained achievement
- Make clear case for approval]

This petition should be APPROVED.

Respectfully submitted,

[Petitioner Name]
[Title]
${new Date().toLocaleDateString()}

---

## SECTION ${isOorP ? (isEB1A ? '9' : '10') : (isEB1A ? '9' : '8')}: EXHIBIT LIST

[Organize exhibits by criterion with tier ratings from Doc 2:]

### EXHIBIT A: BIOGRAPHICAL DOCUMENTATION
- A-1: Passport and Travel Documents
- A-2: Curriculum Vitae
- A-3: Educational Credentials

### EXHIBIT B: CRITERION 1 - [NAME]
[List all evidence for this criterion with:]
- B-1: [Description] - **Tier [X] Source** - [URL from Doc 3]
- B-2: [Description] - **Tier [X] Source** - [URL from Doc 3]
[Continue for all exhibits for this criterion]

### EXHIBIT C: CRITERION 2 - [NAME]
[Same format]

[Continue through all claimed criteria]

**TOTAL EXHIBITS**: [Count]

---

CRITICAL INSTRUCTIONS FOR GENERATION:
1. **Length**: This MUST be a comprehensive 30+ page legal brief (18,000-20,000 words minimum)
2. **Detail Level**: Each criterion analysis should be 2-3 pages with extensive legal argument
3. **Professional Tone**: Formal legal writing throughout - attorney-grade quality
4. **Regulatory Citations**: Use EXACT CFR section language with proper citations
5. **Source Integration**: Reference specific URLs from Document 3 with tier ratings from Document 2
6. **Comparable Evidence**: ${visaInfo.hasComparableEvidence ? 'Include comparable evidence checkbox and explanation for EACH criterion' : 'DO NOT include comparable evidence - P-1A does not allow this'}
7. **Checkbox Format**: Use ☒ for criteria being claimed, ☐ for criteria not claimed
8. **Exhibit References**: Every piece of evidence must have exhibit number
9. **Professional Quality**: This should match a $5,000-8,000 attorney-prepared brief
10. **Completeness**: Generate the FULL document - no summaries, no truncation

Generate the complete ${beneficiaryInfo.visaType} legal brief now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 20480, // Quality-focused: full 30+ page legal brief (18-20K words)
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  let fullContent = content.type === 'text' ? content.text : '';

  if (response.stop_reason === 'max_tokens') {
    fullContent += '\n\n[Note: This document approached token limits. All critical sections included but some detail may be condensed.]';
  }

  return fullContent;
}
*/
