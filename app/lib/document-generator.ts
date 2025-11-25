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
Generate a SOURCE-FOCUSED VISA PETITION ANALYSIS document following this structure:

# COMPREHENSIVE VISA PETITION ANALYSIS
## ${beneficiaryInfo.visaType} CLASSIFICATION - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[2-3 paragraphs: Key findings, source quality assessment, recommendation]

### PART 1: SOURCE QUALITY OVERVIEW
**Total Sources Analyzed**: [Number]
**Source Breakdown by Type**:
- Tier 1 (Major Media/Official): [X sources]
- Tier 2 (Industry/Regional): [Y sources]
- Tier 3 (General/Local): [Z sources]

**Credibility Assessment**:
[Rate each source's credibility and explain WHY it matters]

### PART 2: REGULATORY FRAMEWORK
[Brief overview of ${beneficiaryInfo.visaType} standards with key regulatory citations]

### PART 3: CRITERION-BY-CRITERION SOURCE MAPPING

For EACH criterion applicable to ${beneficiaryInfo.visaType}:

#### Criterion [Number]: [Name]
**Regulatory Standard**: [Key requirement]
**Sources Supporting This Criterion**:
1. [URL] - [Source Name] - **Tier [X]** - [Why this source is credible and how it proves the criterion]
2. [URL] - [Source Name] - **Tier [X]** - [Explanation]
[List all relevant sources]

**Source Quality Analysis**: [Are sources strong enough? What's missing?]
**Additional Sources Needed**: [Suggest specific types of sources to find]

### PART 4: EVIDENCE GAPS & SOURCE RECOMMENDATIONS
**Current Evidence Strength**: [Strong/Moderate/Weak per criterion]
**Missing Source Types**:
- [Type of source needed] - Why it would strengthen the case
- [Suggested search queries to find more sources]
**Recommended Additional URLs**: [Specific suggestions for where to look]

### PART 5: SOURCE VERIFICATION & CREDIBILITY
[Analyze each major source's credibility, reach, and reputation]

### PART 6: APPROVAL ASSESSMENT
- Evidence Quality Score: [X/10]
- Source Diversity Score: [X/10]
- Overall Strength: [Strong/Moderate/Weak]
- Approval Probability: [X%] based on source quality

### PART 7: ACTIONABLE RECOMMENDATIONS
[10 specific recommendations for finding better sources and strengthening evidence]

CRITICAL REQUIREMENTS:
- **FOCUS ON SOURCES**: Emphasize source quality, credibility, and categorization over word count
- **TARGET LENGTH**: 10,000-15,000 words (concise but thorough)
- **CITE EVERY SOURCE**: Reference specific URLs with credibility assessments
- **IDENTIFY GAPS**: Clearly state what sources are missing
- **SUGGEST SEARCHES**: Recommend specific search queries to find additional evidence
- **TIER RATINGS**: Clearly rate each source's credibility (Tier 1/2/3)
- **BE SPECIFIC**: Don't just say "need more evidence" - say exactly what type of source would help
- **CONTEXT MATTERS**: Explain WHY each source matters for USCIS evaluation

Generate the analysis now with strong focus on source quality and discovery:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000, // Optimized for source-focused analysis (10K-15K words)
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
Generate a SOURCE CREDIBILITY & MEDIA SIGNIFICANCE ANALYSIS:

# PUBLICATION SIGNIFICANCE ANALYSIS
## MEDIA COVERAGE ASSESSMENT - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[Overview: Total sources, credibility breakdown, overall media presence strength]

### PART 1: SOURCE-BY-SOURCE CREDIBILITY ANALYSIS

For EACH URL provided, assess:

#### Source #[N]: [Publication/Platform Name]
**URL**: [Full URL]
**Tier Rating**: [1/2/3] **Credibility**: [High/Medium/Low]

**Why This Source Matters**:
- Platform Type: [Major media/Industry publication/Social platform/Official site]
- Reach: [Specific visitor numbers or circulation if known, or "estimated X"]
- Reputation: [Why USCIS would find this credible]
- Geographic Scope: [Local/Regional/National/International]

**What This Source Proves**:
- Key criterion it supports: [Specific O-1B criterion]
- Specific evidence provided: [What facts it establishes]
- Strength: [Strong proof / Supporting evidence / Weak mention]

**Content Quality**:
- Focus on beneficiary: [Primary/Secondary/Brief]
- Key achievements mentioned: [List]
- Tone: [Positive/Neutral]

**Score**: [1-10]

### PART 2: AGGREGATE SOURCE ANALYSIS
**Tier Breakdown**:
- Tier 1 Sources (Major/Official): [X] - [List them]
- Tier 2 Sources (Industry/Regional): [Y] - [List them]
- Tier 3 Sources (General/Local): [Z] - [List them]

**Total Combined Reach**: [Calculate total audience]
**Geographic Distribution**: [Where coverage appears]
**Platform Diversity**: [Mix of media types]

### PART 3: SOURCE GAPS & RECOMMENDATIONS
**Current Strengths**: [Which criteria have strong source support]
**Weak Areas**: [Which criteria need better sources]

**Recommended Additional Sources to Find**:
1. [Specific type] - Search for: "[suggested query]" - Would prove: [criterion]
2. [Specific type] - Search for: "[suggested query]" - Would prove: [criterion]
[Continue with 5-10 specific recommendations]

### PART 4: USCIS EVALUATION PERSPECTIVE
[How would USCIS view this source collection? What's missing?]

### PART 5: FINAL ASSESSMENT
- Source Quality Score: [X/10]
- Source Diversity Score: [X/10]
- Overall Media Presence: [Strong/Moderate/Weak]

CRITICAL REQUIREMENTS:
- **FOCUS**: Source credibility and how each proves visa criteria
- **TARGET LENGTH**: 8,000-12,000 words (concise but thorough)
- **BE SPECIFIC**: Rate each source's credibility with clear reasoning
- **IDENTIFY GAPS**: State exactly what sources are missing
- **ACTIONABLE**: Provide specific search queries for finding more sources
- **TIER EVERY SOURCE**: Clear Tier 1/2/3 ratings
- **MAP TO CRITERIA**: Show which sources prove which visa requirements

Generate the source-focused publication analysis now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10000, // Optimized for source credibility analysis (8K-12K words)
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
    max_tokens: 6000, // Optimized for URL categorization
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
- **TARGET LENGTH**: 15,000-20,000 words (professional but focused)
- **DETAIL LEVEL**: Each criterion argument should be 1-2 pages of strong legal analysis
- Professional legal writing with formal tone throughout
- Proper citations to INA sections, CFR regulations
- Cross-reference exhibits to URLs from Document 3
- Statement of Facts should be 2-3 pages of detailed narrative
- Each criterion gets thorough legal argument with source citations
- USCIS-ready format with proper structure
- Persuasive but objective tone with strong legal arguments
- Include detailed exhibit list organized by criterion with source credibility notes

**OUTPUT FORMAT**: Generate a complete USCIS-ready legal brief. Professional and persuasive.

Generate the legal brief now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000, // Optimized for focused legal brief (15K-20K words)
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
