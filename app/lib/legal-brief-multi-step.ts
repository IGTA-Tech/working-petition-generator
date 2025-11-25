// Multi-Step Legal Brief Generator
// Splits generation into 3 API calls to prevent truncation and enforce DIY template structure

import Anthropic from '@anthropic-ai/sdk';
import { BeneficiaryInfo } from '../types';
import { FetchedUrlData } from './url-fetcher';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Smart filtering function for 40+ sources
function filterBestEvidence(urls: FetchedUrlData[], briefMode: 'standard' | 'comprehensive' = 'comprehensive'): FetchedUrlData[] {
  const totalSources = urls.length;

  // Determine target count based on brief mode
  const targetCounts = {
    standard: 15,        // Standard: Top 15 best sources
    comprehensive: 20    // Comprehensive: Top 20 best sources
  };

  const targetCount = targetCounts[briefMode];

  // If we're under the threshold, return all
  if (totalSources <= targetCount) {
    console.log(`📊 Evidence Filtering: ${totalSources} sources (under threshold, using all)`);
    return urls;
  }

  // If we have 40+ sources, apply smart filtering
  if (totalSources >= 40) {
    console.log(`📊 Evidence Filtering: ${totalSources} sources detected (40+ threshold triggered)`);
    console.log(`   🎯 Target: Top ${targetCount} sources for ${briefMode} mode`);

    // Score each URL based on tier and quality
    const scoredUrls = urls.map(url => {
      let score = 0;

      // Tier-based scoring (from Document 2 tier analysis)
      const domain = url.domain.toLowerCase();

      // Tier 1 sources (Gold standard) - 100 points
      const tier1Domains = ['bbc.co.uk', 'bbc.com', 'espn.com', 'cnn.com', 'reuters.com', 'ap.org',
                           'nytimes.com', 'wsj.com', 'washingtonpost.com', 'usatoday.com'];
      if (tier1Domains.some(t1 => domain.includes(t1))) {
        score += 100;
      }

      // Tier 2 sources (Strong) - 70 points
      const tier2Keywords = ['official', 'gov', 'edu', 'org', 'sports', 'olympics', 'fifa', 'uefa',
                            'agency', 'talent', 'verified', 'profile'];
      if (tier2Keywords.some(keyword => domain.includes(keyword) || url.title.toLowerCase().includes(keyword))) {
        score += 70;
      }

      // Title quality indicators - up to 30 points
      const titleLower = url.title.toLowerCase();
      if (titleLower.includes('national team')) score += 30;
      if (titleLower.includes('champion') || titleLower.includes('winner')) score += 20;
      if (titleLower.includes('award') || titleLower.includes('prize')) score += 20;
      if (titleLower.includes('official') || titleLower.includes('profile')) score += 15;
      if (titleLower.includes('ranking')) score += 15;

      // Content length (longer = more detailed) - up to 20 points
      const contentLength = url.content.length;
      if (contentLength > 5000) score += 20;
      else if (contentLength > 2000) score += 10;
      else if (contentLength > 500) score += 5;

      return { url, score };
    });

    // Sort by score (highest first) and take top N
    const filtered = scoredUrls
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .map(item => item.url);

    console.log(`   ✅ Filtered to top ${filtered.length} highest-quality sources`);
    console.log(`   📊 Score range: ${scoredUrls[0].score} (best) to ${scoredUrls[scoredUrls.length - 1].score} (lowest)`);

    return filtered;
  }

  // Between target and 40: return all
  console.log(`📊 Evidence Filtering: ${totalSources} sources (under 40, using all)`);
  return urls;
}

interface VisaInfo {
  count: number;
  minimum: number;
  hasComparableEvidence: boolean;
}

// Helper functions
function getVisaCriteria(visaType: string): VisaInfo {
  switch(visaType) {
    case 'O-1A': return { count: 8, minimum: 3, hasComparableEvidence: true };
    case 'O-1B': return { count: 6, minimum: 3, hasComparableEvidence: true };
    case 'P-1A': return { count: 7, minimum: 2, hasComparableEvidence: false };
    case 'EB-1A': return { count: 10, minimum: 3, hasComparableEvidence: true };
    default: return { count: 8, minimum: 3, hasComparableEvidence: true };
  }
}

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

// Main function that orchestrates 3-step generation
export async function generateLegalBriefMultiStep(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string,
  urlsAnalyzed?: FetchedUrlData[]
): Promise<string> {

  const visaInfo = getVisaCriteria(beneficiaryInfo.visaType);
  const cfrSection = getCFRSection(beneficiaryInfo.visaType);
  const isOorP = ['O-1A', 'O-1B', 'P-1A'].includes(beneficiaryInfo.visaType);
  const isEB1A = beneficiaryInfo.visaType === 'EB-1A';
  const briefMode = beneficiaryInfo.briefMode || 'comprehensive';

  console.log(`\n🔧 Multi-Step Generation: ${beneficiaryInfo.visaType} Legal Brief`);
  console.log(`   Criteria: ${visaInfo.count} total, need ${visaInfo.minimum} minimum`);
  console.log(`   Comparable Evidence: ${visaInfo.hasComparableEvidence ? 'YES' : 'NO'}`);
  console.log(`   Structure: ${isOorP ? 'O/P visa format' : 'EB-1A format'}`);
  console.log(`   Brief Mode: ${briefMode.toUpperCase()}`);

  // Apply smart filtering if we have URLs and 40+ sources
  let filteredUrls = urlsAnalyzed;
  if (urlsAnalyzed && urlsAnalyzed.length > 0) {
    filteredUrls = filterBestEvidence(urlsAnalyzed, briefMode);
    console.log(`   📊 Sources: ${urlsAnalyzed.length} total → ${filteredUrls.length} selected for analysis`);
  }

  // Adjust max_tokens based on brief mode
  const maxTokensMultiplier = briefMode === 'standard' ? 0.6 : 1.0; // Standard uses 60% of tokens
  console.log(`   📝 Token allocation: ${briefMode === 'standard' ? '60%' : '100%'} (${briefMode} mode)`);

  // STEP 1: Header + Sections 1-7 (Everything up to criteria analysis)
  console.log(`\n📄 Step 1/3: Generating header, petitioner info, and beneficiary background...`);
  const part1 = await generatePart1(beneficiaryInfo, knowledgeBase, doc1, doc2, doc3, visaInfo, cfrSection, isOorP, isEB1A);
  console.log(`   ✅ Part 1 complete: ~${part1.split(' ').length} words`);

  // STEP 2: Section 8 - ALL Criteria Analysis (The heavy lifting)
  console.log(`\n⚖️  Step 2/3: Generating ALL ${visaInfo.count} criteria with detailed analysis...`);
  const part2 = await generatePart2(beneficiaryInfo, doc1, doc2, doc3, visaInfo, cfrSection, isOorP, isEB1A);
  console.log(`   ✅ Part 2 complete: ~${part2.split(' ').length} words`);

  // STEP 3: Conclusion + Exhibit List + Kazarian (if EB-1A)
  console.log(`\n✅ Step 3/3: Generating conclusion and exhibit list...`);
  const part3 = await generatePart3(beneficiaryInfo, doc2, doc3, visaInfo, cfrSection, isOorP, isEB1A);
  console.log(`   ✅ Part 3 complete: ~${part3.split(' ').length} words`);

  // Combine all parts
  const fullBrief = `${part1}\n\n---\n\n${part2}\n\n---\n\n${part3}`;
  const totalWords = fullBrief.split(' ').length;
  console.log(`\n✅ Legal Brief Generation COMPLETE!`);
  console.log(`   Total: ~${totalWords} words across 3 parts`);
  console.log(`   Target was 18,000-20,000 words - ${totalWords >= 18000 ? '✅ TARGET MET' : '⚠️ May need adjustment'}`);

  return fullBrief;
}

// PART 1: Header through Regulatory Requirements
async function generatePart1(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string,
  visaInfo: VisaInfo,
  cfrSection: string,
  isOorP: boolean,
  isEB1A: boolean
): Promise<string> {

  const prompt = `You are an expert immigration attorney drafting PART 1 (Header and Background) of a ${beneficiaryInfo.visaType} petition brief that EXACTLY matches the DIY template structure.

**THIS IS PART 1 OF 3** - You are generating ONLY the header and background sections. The criteria analysis will come in Part 2.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field: ${beneficiaryInfo.fieldOfProfession}
- Background: ${beneficiaryInfo.background}
${beneficiaryInfo.petitionerName ? `- Petitioner: ${beneficiaryInfo.petitionerName}` : ''}
${beneficiaryInfo.itinerary ? `- Itinerary/Work Schedule: ${beneficiaryInfo.itinerary}` : ''}

DOCUMENT CONTEXT:
**Document 1 Analysis (Key Points)**: ${doc1.substring(0, 8000)}
**Document 2 Publications (Key Sources)**: ${doc2.substring(0, 5000)}

---

GENERATE THE FOLLOWING SECTIONS EXACTLY AS SHOWN:

# ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}

USCIS Service Center
Attn: ${isEB1A ? 'I-140' : 'I-129 ' + (beneficiaryInfo.visaType.startsWith('P') ? 'P' : 'O')}

**Re: ${isEB1A ? 'I-140' : 'I-129'} Petition | Request for ${beneficiaryInfo.visaType} Classification**
**Petitioner:** ${beneficiaryInfo.petitionerName || 'Innovative Global Talent Agency'}
**Beneficiary:** ${beneficiaryInfo.fullName}
**Position:** ${beneficiaryInfo.fieldOfProfession} Professional
**Field of Expertise:** ${beneficiaryInfo.fieldOfProfession}

Dear Immigration Examiner:

This letter is in connection with ${isEB1A ? 'an' : 'a'} ${beneficiaryInfo.visaType} visa petition in which the Petitioner is acting as Direct Employer for the Beneficiary.

---

## SECTION 1: PETITIONER EMPLOYMENT STRUCTURE

The Petitioner is serving in the following role(s) as indicated by an "X" below:

☒ **Direct Employer**
The Petitioner directly employs the Beneficiary under a traditional employer-employee relationship.

☐ **U.S. Agent Functioning as Employer**
☐ **U.S. Agent for Foreign Employer**
☐ **U.S. Agent for Multiple Employers**
☐ **U.S. Agent for Self-Employed Foreign Employer**

**Petitioner Obligations:**

1. **Representation**: Represent the Beneficiary for intended U.S. activities
2. **Service of Process**: Accept service of process on behalf of the Beneficiary
3. **Travel Support**: Provide travel support if visa terminated early
4. **Certification**: Certify accuracy of petition contents

**Duration of Agreement:** 3 years from date of approval

---

## SECTION 2: PRIOR APPROVAL DEFERENCE

This is the Beneficiary's initial petition for ${beneficiaryInfo.visaType} classification. No prior approval exists.

---

## SECTION 3: ABOUT THE PETITIONER

In compliance with **${cfrSection}**, the Petitioner is a U.S. entity authorized to file this petition and serve as Direct Employer for the Beneficiary.

---

## SECTION 4: ABOUT THE BENEFICIARY

### 1. Professional Overview

[Write 3-4 detailed paragraphs about ${beneficiaryInfo.fullName}'s career using the background information provided. Include timeline, key achievements, and current standing.]

### 2. ${isEB1A ? 'Extraordinary Ability' : (beneficiaryInfo.visaType === 'O-1B' ? 'Distinction in the Arts' : 'International Recognition')}

[Write 3-4 paragraphs demonstrating how the beneficiary meets the legal standard for ${beneficiaryInfo.visaType}, using specific achievements from Document 1.]

### 3. Contribution to the United States

[Write 2-3 paragraphs about planned U.S. activities and how they benefit the United States.]

---

${isOorP ? `## SECTION 5: THIRD PARTY EMPLOYERS

If applicable, agreements with foreign or third-party employers are included as required by **${cfrSection}**.

---

## SECTION 6: CONSULTATION LETTER

After exhaustive search as required under **${cfrSection}**, no appropriate labor organization exists to provide a consultation letter for ${beneficiaryInfo.fieldOfProfession}.

Alternative evidence demonstrating extraordinary ability is included via expert letters and achievement documentation.

---

${beneficiaryInfo.itinerary ? `## SECTION 7: ITINERARY / WORK SCHEDULE

The Beneficiary's planned U.S. activities are as follows:

${beneficiaryInfo.itinerary}

This itinerary demonstrates the Beneficiary's intended work in ${beneficiaryInfo.fieldOfProfession} and the temporary nature of the ${beneficiaryInfo.visaType} classification.

---

## SECTION 8: REGULATORY REQUIREMENTS` : `## SECTION 7: REGULATORY REQUIREMENTS`}` : ''}## SECTION ${isOorP ? (beneficiaryInfo.itinerary ? '8' : '7') : '5'}: REGULATORY REQUIREMENTS

**REGULATORY REQUIREMENTS FOR ${beneficiaryInfo.visaType} PETITION**

${getVisaSpecificRegulations(beneficiaryInfo.visaType)}

---

**END OF PART 1** - The criteria analysis will follow in Part 2.

CRITICAL INSTRUCTIONS:
1. Use the EXACT section structure shown above with checkboxes (☒ ☐)
2. Write detailed, attorney-quality paragraphs for Section 4
3. Target 5,000-7,000 words total for Part 1
4. Professional legal tone throughout
5. Reference specific achievements from the background and Document 1
6. DO NOT start analyzing criteria - that's Part 2

Generate Part 1 now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000, // Plenty for Part 1
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// PART 2: All Criteria Analysis (The bulk of the document)
async function generatePart2(
  beneficiaryInfo: BeneficiaryInfo,
  doc1: string,
  doc2: string,
  doc3: string,
  visaInfo: VisaInfo,
  cfrSection: string,
  isOorP: boolean,
  isEB1A: boolean
): Promise<string> {

  const prompt = `You are an expert immigration attorney drafting PART 2 (Criteria Analysis) of a ${beneficiaryInfo.visaType} petition brief.

**THIS IS PART 2 OF 3** - You are generating ONLY the criteria analysis section. Part 1 (header/background) is already done.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}
CRITERIA TO ANALYZE: ${visaInfo.count} total (must show at least ${visaInfo.minimum})
COMPARABLE EVIDENCE: ${visaInfo.hasComparableEvidence ? 'YES - Include for each criterion' : 'NO - P-1A does not allow this'}

DOCUMENT CONTEXT FOR EVIDENCE:
**Document 1 (Strengths Analysis)**: ${doc1.substring(0, 12000)}
**Document 2 (Source Quality)**: ${doc2.substring(0, 8000)}
**Document 3 (URL References)**: ${doc3.substring(0, 6000)}

---

GENERATE THIS SECTION EXACTLY:

## SECTION ${isOorP ? '8' : '6'}: EVIDENCE OF EXTRAORDINARY ABILITY

You must analyze ALL ${visaInfo.count} criteria for ${beneficiaryInfo.visaType}. For EACH criterion, use this EXACT format:

### Criterion [1-${visaInfo.count}]: [Full Regulatory Name]

☒ **The Beneficiary MEETS this criterion**

**Regulatory Standard:**
[Quote the exact CFR language for this criterion]

**Evidence Presented:**

- **Exhibit [Letter]-1**: [Description] - Tier [1/2/3] Source - [URL from Doc 3 if available]
- **Exhibit [Letter]-2**: [Description] - Tier [1/2/3] Source - [URL from Doc 3 if available]
- **Exhibit [Letter]-3**: [Description] - Tier [1/2/3] Source - [URL from Doc 3 if available]
[List 5-10 exhibits per criterion, referencing sources from Document 2 and URLs from Document 3]

**Analysis:**

[Write 600-900 words (2-3 pages) of detailed legal analysis including:
- Opening paragraph establishing criterion's importance
- Detailed discussion of each piece of evidence
- How evidence exceeds regulatory requirements
- Source credibility from Document 2 (Tier ratings)
- Statistical comparisons where applicable from Document 1
- Case law or policy guidance citations
- Comparative analysis to industry standards]

${visaInfo.hasComparableEvidence ? `
**Comparable Evidence Consideration:**

☒ In the alternative, if USCIS determines the above evidence does not satisfy the regulatory criterion, the Petitioner submits comparable evidence under **${cfrSection === '8 CFR § 214.2(o)' ? '8 CFR § 214.2(o)(3)(iii)' : (cfrSection === '8 CFR § 214.2(p)' ? '8 CFR § 214.2(p)(4)(ii)(C)' : '8 CFR § 204.5(h)(4)')}**.

[Write 200-300 words explaining:
- Why standard criterion may not readily apply
- What comparable evidence is submitted instead
- How it demonstrates equivalent or greater achievement
- Regulatory authority for accepting comparable evidence]
` : ''}

**Conclusion:** The Beneficiary clearly satisfies this criterion based on the preponderance of evidence.

---

[REPEAT THE ABOVE STRUCTURE FOR ALL ${visaInfo.count} CRITERIA]

**END OF PART 2** - Conclusion and exhibits will follow in Part 3.

CRITICAL INSTRUCTIONS:
1. Generate analysis for ALL ${visaInfo.count} criteria - do not skip any
2. Use checkboxes: ☒ for claimed criteria, ☐ for criteria not claimed (claim at least ${visaInfo.minimum})
3. Each criterion analysis should be 600-900 words
4. ${visaInfo.hasComparableEvidence ? 'INCLUDE comparable evidence section for EACH criterion' : 'DO NOT include comparable evidence - not allowed for P-1A'}
5. Reference specific URLs from Document 3
6. Use Tier ratings from Document 2 (Tier 1/2/3)
7. Target 12,000-15,000 words total for Part 2 (all ${visaInfo.count} criteria)
8. Professional legal writing with proper citations
9. DO NOT write conclusion yet - that's Part 3

Generate ALL ${visaInfo.count} criteria analyses now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 30000, // Maximum tokens for the heavy lifting
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// PART 3: Conclusion, Kazarian (if EB-1A), and Exhibit List
async function generatePart3(
  beneficiaryInfo: BeneficiaryInfo,
  doc2: string,
  doc3: string,
  visaInfo: VisaInfo,
  cfrSection: string,
  isOorP: boolean,
  isEB1A: boolean
): Promise<string> {

  const prompt = `You are an expert immigration attorney drafting PART 3 (Conclusion and Exhibits) of a ${beneficiaryInfo.visaType} petition brief.

**THIS IS PART 3 OF 3** - You are generating ONLY the conclusion and exhibit list. Parts 1-2 (background and criteria) are already complete.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}

DOCUMENT CONTEXT:
**Document 2 (Source Quality)**: ${doc2.substring(0, 5000)}
**Document 3 (URL References)**: ${doc3.substring(0, 8000)}

---

GENERATE THE FOLLOWING SECTIONS:

${isEB1A ? `## SECTION 7: FINAL MERITS DETERMINATION (KAZARIAN STEP 2)

Having established that ${beneficiaryInfo.fullName} meets at least three (3) criteria under Kazarian Step 1, we now address Step 2: whether the totality of evidence demonstrates sustained national or international acclaim and placement among the small percentage at the top of the field.

### A. Sustained National or International Acclaim

[Write 4-5 paragraphs demonstrating sustained acclaim over time, geographic reach, and continued recognition]

### B. Small Percentage at Top of Field

[Write 4-5 paragraphs with statistical analysis showing the beneficiary is in the top tier of their field]

### C. Continued Work in Area of Expertise

[Write 2-3 paragraphs about planned U.S. work in the area of extraordinary ability]

**Conclusion:** The totality of evidence demonstrates that ${beneficiaryInfo.fullName} possesses extraordinary ability in ${beneficiaryInfo.fieldOfProfession}, has achieved sustained national and international acclaim, and is among the small percentage at the very top of the field, as required under **8 CFR § 204.5(h)** and established in **Kazarian v. USCIS, 596 F.3d 1115 (9th Cir. 2010)**.

---

` : ''}## SECTION ${isOorP ? (isEB1A ? '8' : '9') : (isEB1A ? '8' : '7')}: CONCLUSION

For the foregoing reasons, ${beneficiaryInfo.fullName} clearly qualifies for ${beneficiaryInfo.visaType} classification.

[Write 4-5 compelling paragraphs that:
- Recap the strongest ${visaInfo.minimum}+ criteria met
- Emphasize source quality and credibility from Document 2
- Reference sustained pattern of exceptional achievement
- Address any potential weaknesses proactively
- Make clear and forceful case for approval]

This petition should be **APPROVED**.

Respectfully submitted,

Innovative Global Talent Agency
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

---

## SECTION ${isOorP ? (isEB1A ? '9' : '10') : (isEB1A ? '9' : '8')}: EXHIBIT LIST

[Organize ALL evidence by criterion, using Document 3 URLs and Document 2 tier ratings]

### EXHIBIT A: BIOGRAPHICAL DOCUMENTATION
- **A-1**: Passport and Travel Documents
- **A-2**: Curriculum Vitae
- **A-3**: Educational Credentials

### EXHIBIT B: CRITERION 1 - [Name from regulations]
[List all evidence for this criterion with:]
- **B-1**: [Description] - **Tier [X] Source** - [URL from Document 3]
- **B-2**: [Description] - **Tier [X] Source** - [URL from Document 3]
[Continue for all exhibits supporting Criterion 1]

### EXHIBIT C: CRITERION 2 - [Name from regulations]
[Same format]

[CONTINUE FOR ALL ${visaInfo.count} CRITERIA]

**TOTAL EXHIBITS**: [Count all exhibits listed]

---

**END OF PETITION BRIEF**

CRITICAL INSTRUCTIONS:
1. ${isEB1A ? 'MUST include Kazarian Step 2 analysis' : 'No Kazarian analysis needed'}
2. Conclusion should be 1,000-1,500 words
3. Exhibit list must reference actual URLs from Document 3
4. Include Tier ratings (1/2/3) from Document 2 for each exhibit
5. Professional and persuasive tone
6. Target 5,000-6,000 words total for Part 3
7. This is the final section - make it compelling!

Generate Part 3 now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000, // Adequate for conclusion and exhibits
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
