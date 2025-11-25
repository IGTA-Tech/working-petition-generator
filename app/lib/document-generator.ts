import Anthropic from '@anthropic-ai/sdk';
import { BeneficiaryInfo, VisaType, UploadedFileData } from '../types';
import { getKnowledgeBaseFiles, buildKnowledgeBaseContext } from './knowledge-base';
import { fetchMultipleUrls, FetchedUrlData, analyzePublicationQuality } from './url-fetcher';
import { processFile, generateFileEvidenceSummary } from './file-processor';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerationResult {
  document1: string; // Comprehensive Analysis
  document2: string; // Publication Analysis
  document3: string; // URL Reference
  document4: string; // Legal Brief
  urlsAnalyzed: FetchedUrlData[];
  filesProcessed: number;
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
  // Stage 1: Read Knowledge Base (10%)
  onProgress?.('Reading Knowledge Base', 10, 'Loading visa petition knowledge base files...');
  const knowledgeBaseFiles = await getKnowledgeBaseFiles(beneficiaryInfo.visaType);
  const knowledgeBaseContext = buildKnowledgeBaseContext(knowledgeBaseFiles, beneficiaryInfo.visaType);

  // Stage 2: Process Uploaded Files (15%)
  onProgress?.('Processing Uploaded Files', 15, 'Extracting text from uploaded documents...');
  const fileEvidence = await processUploadedFiles(beneficiaryInfo.uploadedFiles || []);

  // Stage 3: Fetch URLs (20%)
  onProgress?.('Analyzing URLs', 20, 'Fetching and analyzing evidence URLs...');
  const urlsAnalyzed = await fetchMultipleUrls(beneficiaryInfo.primaryUrls);

  // Stage 3: Generate Document 1 - Comprehensive Analysis (40%)
  onProgress?.('Generating Comprehensive Analysis', 30, 'Creating 75+ page comprehensive analysis...');
  const document1 = await generateComprehensiveAnalysis(
    beneficiaryInfo,
    knowledgeBaseContext,
    urlsAnalyzed,
    fileEvidence
  );

  // Stage 4: Generate Document 2 - Publication Analysis (60%)
  onProgress?.('Generating Publication Analysis', 55, 'Creating 40+ page publication significance analysis...');
  const document2 = await generatePublicationAnalysis(
    beneficiaryInfo,
    knowledgeBaseContext,
    urlsAnalyzed,
    document1
  );

  // Stage 5: Generate Document 3 - URL Reference (75%)
  onProgress?.('Generating URL Reference', 75, 'Creating organized URL reference document...');
  const document3 = await generateUrlReference(
    beneficiaryInfo,
    urlsAnalyzed,
    document1,
    document2
  );

  // Stage 6: Generate Document 4 - Legal Brief (90%)
  onProgress?.('Generating Legal Brief', 85, 'Creating 30+ page professional legal brief...');
  const document4 = await generateLegalBrief(
    beneficiaryInfo,
    knowledgeBaseContext,
    document1,
    document2,
    document3
  );

  onProgress?.('Finalizing', 95, 'All documents generated successfully!');

  return {
    document1,
    document2,
    document3,
    document4,
    urlsAnalyzed,
    filesProcessed: beneficiaryInfo.uploadedFiles?.length || 0,
  };
}

async function generateComprehensiveAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  fileEvidence: string
): Promise<string> {
  const urlContext = urls
    .map(
      (url, i) =>
        `URL ${i + 1}: ${url.url}\nTitle: ${url.title}\nContent: ${url.content.substring(0, 2000)}...\n`
    )
    .join('\n\n');

  const prompt = `You are an expert immigration law analyst specializing in ${beneficiaryInfo.visaType} visa petitions.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field/Profession: ${beneficiaryInfo.fieldOfProfession}
- Background: ${beneficiaryInfo.background}
- Additional Info: ${beneficiaryInfo.additionalInfo || 'None provided'}

UPLOADED DOCUMENT EVIDENCE:
${fileEvidence || 'No documents uploaded'}

EVIDENCE URLS ANALYZED:
${urlContext}

KNOWLEDGE BASE:
${knowledgeBase.substring(0, 50000)}

YOUR TASK:
Generate a comprehensive 75+ page VISA PETITION ANALYSIS document following this EXACT structure:

# COMPREHENSIVE VISA PETITION ANALYSIS
## ${beneficiaryInfo.visaType} CLASSIFICATION - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[3-4 paragraphs with key findings and recommendation]

### PART 1: VISA TYPE DETERMINATION
[Explain why ${beneficiaryInfo.visaType} is appropriate for this beneficiary]

### PART 2: REGULATORY FRAMEWORK
[Legal standards for ${beneficiaryInfo.visaType} - use EXACT regulatory language from knowledge base]

### PART 3: CRITERION-BY-CRITERION ANALYSIS

For EACH criterion applicable to ${beneficiaryInfo.visaType}:

#### Criterion [Number]: [Name]
**Regulatory Language**: [Exact text from regulations]
**Scoring**: [Points awarded] / [Max points]
**Assessment**: [Detailed 2-3 paragraph analysis]
**Evidence Provided**:
- [List ALL relevant evidence with quality assessment]
**Strengths**: [What's strong about this criterion]
**Weaknesses**: [What's lacking or could be improved]

[Repeat for ALL applicable criteria - minimum 8 criteria for O-1A/EB-1A, 6 for O-1B, 5 for P-1A]

### PART 4: EVIDENCE MAPPING
[Create a table mapping all evidence to specific criteria]

### PART 5: SCORING SUMMARY
- Total Points: [X]
- Threshold for Approval: [Y]
- Classification: [Strong Approval / Likely Approval / Borderline / Likely Denial]
- Confidence Level: [X%]
- Approval Probability: [X%]

### PART 6: STRENGTHS ANALYSIS
[Detailed 3-5 paragraph analysis of strongest aspects]

### PART 7: WEAKNESSES & GAPS
[Detailed analysis of what's missing or weak, with specific recommendations]

### PART 8: APPROVAL PROBABILITY ASSESSMENT
[Statistical analysis and prediction with reasoning]

### PART 9: RECOMMENDATIONS
[Minimum 10 specific, actionable recommendations to strengthen the case]

### PART 10: CONCLUSION
[3-4 paragraph summary and final recommendation]

CRITICAL REQUIREMENTS:
- **LENGTH**: This MUST be a COMPREHENSIVE 75+ PAGE document (~40,000+ words)
- **DETAIL LEVEL**: Each criterion analysis should be 3-5 pages with extensive detail
- Write in COMPLETE, DETAILED paragraphs - not bullet points
- Include ALL criteria (8 for O-1A/EB-1A, 6 for O-1B, 5 for P-1A)
- Use exact regulatory language from knowledge base with full citations
- Apply proper evidence weighting with detailed scoring explanations
- Provide extensive statistical analysis and comparisons
- Include 10+ specific, detailed recommendations (1-2 paragraphs each)
- Be objective - highlight both strengths AND weaknesses extensively
- Reference specific URLs throughout with detailed analysis

**OUTPUT FORMAT**: Generate the FULL, UNABBREVIATED document. Do NOT summarize or shorten. Write as if this is the complete final document that will be given to an attorney.

Generate the COMPLETE comprehensive analysis now (aim for maximum detail and length):`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 20480, // Increased by 25% from 16384 to prevent timeout truncation
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];

  // If response was truncated, note this
  let fullContent = content.type === 'text' ? content.text : '';

  if (response.stop_reason === 'max_tokens') {
    fullContent += '\n\n[Note: This document was truncated due to token limits. For a complete analysis, consider breaking down the evaluation or requesting specific sections.]';
  }

  return fullContent;
}

async function generatePublicationAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  comprehensiveAnalysis: string
): Promise<string> {
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

  const prompt = `You are an expert at evaluating publication significance for ${beneficiaryInfo.visaType} visa petitions.

BENEFICIARY: ${beneficiaryInfo.fullName}
FIELD: ${beneficiaryInfo.fieldOfProfession}

PUBLICATIONS/MEDIA TO ANALYZE:
${urlDetails}

CONTEXT FROM COMPREHENSIVE ANALYSIS:
${comprehensiveAnalysis.substring(0, 5000)}

YOUR TASK:
Generate a 40+ page PUBLICATION SIGNIFICANCE ANALYSIS following this EXACT structure:

# PUBLICATION SIGNIFICANCE ANALYSIS
## MEDIA COVERAGE ASSESSMENT - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[Overview of media coverage quality and reach]

### PART 1: METHODOLOGY
[Explain how publications were evaluated - circulation data, editorial standards, etc.]

### PART 2: PUBLICATION-BY-PUBLICATION ANALYSIS

For EACH URL provided:

#### Publication #[N]: [Publication Name]
**URL**: [Full URL]
**Publication Type**: [Major media / Trade publication / Online media]

**Reach Metrics**:
- Circulation/Monthly Visitors: [Specific numbers with sources if available]
- Geographic Reach: [Local / Regional / National / International]
- Audience Demographics: [Description]

**Editorial Standards**:
- Editorial Process: [Description]
- Journalist Credentials: [If known]
- Publication Prestige: [Assessment]

**Industry Significance**:
- Standing in Field: [Analysis]
- Comparable Publications: [List similar publications]
- Impact Factor: [If applicable]

**Content Analysis**:
- Article Title: [Full title]
- Publication Date: [If determinable]
- Length: [Estimate]
- Focus on Beneficiary: [Primary subject / Secondary mention / Brief mention]
- Tone: [Positive / Neutral / Critical]
- Key Points Mentioned: [Paraphrase major points about beneficiary]
- Context: [Why this coverage matters for the petition]

**Significance Score**: [1-10]
**Quality Assessment**: [High / Medium / Low]

### PART 3: AGGREGATE ANALYSIS
**Total Combined Reach**: [Sum of all circulation/viewership]
**Geographic Distribution**: [Breakdown]
**Timeline of Coverage**: [Pattern over time if dates available]
**Coverage Quality Distribution**: [How many high/medium/low quality]

### PART 4: COMPARATIVE ANALYSIS
[Compare beneficiary's media coverage to typical coverage in their field]

### PART 5: USCIS STANDARDS ANALYSIS
[How this coverage meets USCIS requirements for ${beneficiaryInfo.visaType}]

### PART 6: CONCLUSIONS
[Overall assessment of media presence and its strength for the petition]

CRITICAL REQUIREMENTS:
- **LENGTH**: This MUST be a COMPREHENSIVE 40+ PAGE document (~20,000+ words)
- **DETAIL LEVEL**: Each publication analysis should be 2-4 pages with extensive detail
- Write in COMPLETE, DETAILED paragraphs with thorough analysis
- Analyze EVERY single URL in exhaustive detail (not brief summaries)
- Research actual circulation/traffic data - be specific with numbers
- Provide detailed publication quality assessments with justification
- Calculate precise aggregate reach with methodology
- Include extensive comparative analysis to field norms
- Each publication deserves 2-3 pages of detailed assessment

**OUTPUT FORMAT**: Generate the FULL, UNABBREVIATED document. Do NOT summarize. Write as if this is the complete final document for attorney review.

Generate the COMPLETE publication analysis now (aim for maximum detail and length):`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 20480, // Increased by 25% from 16384 to prevent timeout truncation
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];

  // If response was truncated, note this
  let fullContent = content.type === 'text' ? content.text : '';

  if (response.stop_reason === 'max_tokens') {
    fullContent += '\n\n[Note: This document was truncated due to token limits. For a complete analysis, consider breaking down the evaluation or requesting specific sections.]';
  }

  return fullContent;
}

async function generateUrlReference(
  beneficiaryInfo: BeneficiaryInfo,
  urls: FetchedUrlData[],
  doc1: string,
  doc2: string
): Promise<string> {
  const prompt = `Create a URL REFERENCE DOCUMENT organizing all evidence URLs by criterion for ${beneficiaryInfo.fullName}'s ${beneficiaryInfo.visaType} petition.

URLS TO ORGANIZE:
${urls.map((url, i) => `${i + 1}. ${url.url} - ${url.title}`).join('\n')}

CONTEXT FROM DOCUMENTS:
Comprehensive Analysis (first 3000 chars): ${doc1.substring(0, 3000)}
Publication Analysis (first 3000 chars): ${doc2.substring(0, 3000)}

Generate a URL Reference Document with this EXACT structure:

# URL REFERENCE DOCUMENT
## EVIDENCE SOURCES BY CRITERION - ${beneficiaryInfo.fullName}

---

## CRITERION 1: [Name from ${beneficiaryInfo.visaType} regulations]

### Primary Evidence
- [URL 1]: [Description of what this proves]
  - Source Type: [Media / Official / Social / Competition / Academic]
  - Quality: [High / Medium / Low]
  - Status: [Active]

### Supporting Evidence
[Additional URLs]

---

[Repeat for ALL applicable criteria]

---

## GENERAL BACKGROUND SOURCES
[URLs providing general biographical info]

---

## COMPETITIVE LANDSCAPE SOURCES
[URLs showing beneficiary vs competitors/comparisons]

---

## INDUSTRY CONTEXT SOURCES
[URLs providing field context]

---

## TOTAL URL COUNT: [Number]
## LAST VERIFIED: ${new Date().toLocaleDateString()}

Generate the COMPLETE URL reference document now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10240, // Increased by 25% from 8192 for more comprehensive URL reference
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

async function generateLegalBrief(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string
): Promise<string> {
  const prompt = `You are an expert immigration attorney drafting a professional petition brief for ${beneficiaryInfo.visaType}.

BENEFICIARY: ${beneficiaryInfo.fullName}
FIELD: ${beneficiaryInfo.fieldOfProfession}

KNOWLEDGE BASE (Regulations):
${knowledgeBase.substring(0, 20000)}

ANALYSIS SUMMARY (from Document 1):
${doc1.substring(0, 8000)}

PUBLICATION DATA (from Document 2):
${doc2.substring(0, 5000)}

URL REFERENCES (from Document 3):
${doc3.substring(0, 3000)}

YOUR TASK:
Generate a professional 30+ page PETITION BRIEF in proper legal format:

# PETITION BRIEF IN SUPPORT OF ${beneficiaryInfo.visaType} PETITION
## ${beneficiaryInfo.fullName}

**Petitioner**: [Organization/Self]
**Beneficiary**: ${beneficiaryInfo.fullName}
**Visa Classification**: ${beneficiaryInfo.visaType}
**Field of Endeavor**: ${beneficiaryInfo.fieldOfProfession}
**Date**: ${new Date().toLocaleDateString()}

---

## TABLE OF CONTENTS

I. Executive Summary
II. Introduction and Background
III. Legal Standards
IV. Statement of Facts
V. Argument - Criteria Analysis
${beneficiaryInfo.visaType === 'EB-1A' ? 'VI. Final Merits Determination\n' : ''}VII. Conclusion
VIII. Exhibit List

---

## I. EXECUTIVE SUMMARY

[2-3 compelling paragraphs summarizing the case]

**Criteria Met**: [List all criteria being claimed]
**Recommendation**: This petition should be APPROVED.

---

## II. INTRODUCTION AND BACKGROUND

### A. Beneficiary's Professional Background
[4-6 paragraphs from comprehensive analysis, written professionally]

### B. Current Standing in Field
[Statistical positioning and comparisons]

### C. Purpose of Petition
[Why seeking this visa]

---

## III. LEGAL STANDARDS

### A. Statutory Requirements
[Exact INA section and CFR regulations for ${beneficiaryInfo.visaType}]

### B. Regulatory Criteria
[List all criteria from regulations]

### C. Standard of Proof
[Preponderance of evidence standard]

### D. Applicable USCIS Policy Guidance
[Recent policy memos]

---

## IV. STATEMENT OF FACTS

[Chronological narrative of beneficiary's career - 3-5 pages]

---

## V. ARGUMENT - CRITERIA ANALYSIS

For EACH criterion being claimed:

### A. Criterion [Number]: [Full Name from Regulations]

**Legal Standard**: [Exact regulatory language]

**Evidence Presented**:
[List exhibits with references to Document 3 URLs]

**Analysis**:
[Detailed legal argument - 2-3 pages per criterion using:
- Evidence from Document 1
- Publication significance from Document 2
- URL references from Document 3
- Case law citations where applicable]

**Conclusion**: The beneficiary clearly satisfies this criterion.

[Repeat for ALL criteria]

---

${
  beneficiaryInfo.visaType === 'EB-1A'
    ? `## VI. FINAL MERITS DETERMINATION

### A. Sustained National or International Acclaim
[Kazarian Step 2 analysis using totality of evidence]

### B. Small Percentage at Top of Field
[Statistical and comparative analysis]

### C. Continued Work in Area of Expertise
[Plans for US activities]

**Conclusion**: The totality of evidence demonstrates extraordinary ability.

---
`
    : ''
}
## VII. CONCLUSION

[3-4 powerful paragraphs summarizing why petition should be approved]

For the foregoing reasons, this petition should be APPROVED.

Respectfully submitted,

[Attorney/Representative Name]
[Date]

---

## VIII. EXHIBIT LIST

[Organize all exhibits by criterion, referencing URLs from Document 3]

### EXHIBIT A: BIOGRAPHICAL DOCUMENTATION
- A-1: Passport
- A-2: Curriculum Vitae
[etc.]

### EXHIBIT B: [CRITERION 1 NAME]
- B-1: [Description] - [URL from Doc 3]
- B-2: [Description] - [URL from Doc 3]

[Continue for all exhibits]

**TOTAL EXHIBITS**: [Number]

---

CRITICAL REQUIREMENTS:
- **LENGTH**: This MUST be a COMPREHENSIVE 30-40 PAGE legal brief (~15,000-20,000 words)
- **DETAIL LEVEL**: Each criterion argument should be 2-4 pages of detailed legal analysis
- Professional legal writing with formal tone throughout
- Proper citations to INA sections, CFR regulations, and case law
- Cross-reference exhibits to URLs from Document 3
- Statement of Facts should be 3-5 pages of detailed chronological narrative
- Each criterion gets thorough legal analysis (not brief summaries)
- USCIS-ready format with proper structure
- Persuasive but objective tone with strong legal arguments
- Include detailed exhibit list organized by criterion

**OUTPUT FORMAT**: Generate the FULL, UNABBREVIATED legal brief. This is a formal USCIS petition document. Write as if submitting to immigration officers.

Generate the COMPLETE legal brief now (aim for maximum professional detail and length):`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 20480, // Increased by 25% from 16384 to prevent timeout truncation
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];

  // If response was truncated, note this
  let fullContent = content.type === 'text' ? content.text : '';

  if (response.stop_reason === 'max_tokens') {
    fullContent += '\n\n[Note: This document was truncated due to token limits. For a complete analysis, consider breaking down the evaluation or requesting specific sections.]';
  }

  return fullContent;
}
