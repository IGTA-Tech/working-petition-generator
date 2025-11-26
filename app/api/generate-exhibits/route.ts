import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import { archiveUrls } from '@/app/lib/archive-org';
import { convertUrlsToPdfs } from '@/app/lib/api2pdf';
import { generateCoverSheet, ExhibitInfo } from '@/app/lib/exhibit-cover-sheet';
import { mergePdfs, getPdfPageCount } from '@/app/lib/pdf-merger';
import { generateExhibitList, CriterionGroup, ExhibitEntry } from '@/app/lib/exhibit-list-generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for serverless function

interface ExhibitRequest {
  urls: string[];
  uploadedDocuments?: UploadedDocument[];
  beneficiaryName: string;
  visaType: string;
  fieldOfProfession: string;
  caseId: string; // To organize exhibits by case
}

interface UploadedDocument {
  fileName: string;
  fileType: string;
  blobUrl: string;
  summary: string;
  pageCount?: number;
}

// Visa criteria definitions
const VISA_CRITERIA: Record<string, { name: string; description: string }[]> = {
  'EB-1A': [
    { name: 'Awards', description: 'Evidence of receipt of lesser nationally or internationally recognized prizes or awards for excellence' },
    { name: 'Membership', description: 'Evidence of membership in associations that require outstanding achievements' },
    { name: 'Published Material', description: 'Published material about the beneficiary in professional or major trade publications' },
    { name: 'Judging', description: 'Evidence of participation as a judge of the work of others' },
    { name: 'Original Contributions', description: 'Evidence of original scientific, scholarly, artistic, athletic, or business-related contributions of major significance' },
    { name: 'Scholarly Articles', description: 'Evidence of authorship of scholarly articles in professional or major trade publications' },
    { name: 'Artistic Exhibition', description: 'Evidence of display of work at artistic exhibitions or showcases' },
    { name: 'Leading Role', description: 'Evidence of performance in a leading or critical role for organizations with distinguished reputation' },
    { name: 'High Remuneration', description: 'Evidence of commanding a high salary or substantially high remuneration' },
    { name: 'Commercial Success', description: 'Evidence of commercial successes in the performing arts' },
  ],
  'O-1A': [
    { name: 'Awards', description: 'Receipt of nationally or internationally recognized prizes or awards for excellence' },
    { name: 'Membership', description: 'Membership in associations requiring outstanding achievements' },
    { name: 'Published Material', description: 'Published material in professional or major trade publications or media about the beneficiary' },
    { name: 'Judging', description: 'Participation as a judge of the work of others in the field' },
    { name: 'Original Contributions', description: 'Original scientific, scholarly, or business-related contributions of major significance' },
    { name: 'Scholarly Articles', description: 'Authorship of scholarly articles in the field' },
  ],
  'O-1B': [
    { name: 'Awards', description: 'Receipt of significant national or international awards or prizes' },
    { name: 'Leading Role', description: 'Performance in a leading or starring role in productions with distinguished reputation' },
    { name: 'Critical Reviews', description: 'Published critical reviews or other published materials about the beneficiary' },
    { name: 'Major Organizations', description: 'Work for organizations with distinguished reputations' },
    { name: 'Recognition', description: 'Recognition for achievements by organizations, critics, government agencies, or experts' },
    { name: 'High Remuneration', description: 'Commanding a high salary or remuneration in relation to others' },
  ],
};

/**
 * Use Claude to analyze URLs and determine which criterion each supports
 */
async function analyzeUrlRelevance(
  urls: string[],
  beneficiaryName: string,
  fieldOfProfession: string,
  visaType: string
): Promise<Map<string, { criterionNumber: string; title: string; relevance: string }>> {
  const criteria = VISA_CRITERIA[visaType] || VISA_CRITERIA['O-1A'];

  const prompt = `You are analyzing evidence URLs for a ${visaType} visa petition for ${beneficiaryName}, a professional in ${fieldOfProfession}.

**Available Criteria:**
${criteria.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join('\n')}

**URLs to analyze:**
${urls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

For each URL, determine:
1. Which criterion (1-${criteria.length}) it best supports
2. A clear, specific title describing what the evidence shows
3. A 2-3 sentence explanation of WHY this evidence supports that criterion and how it demonstrates the beneficiary's qualifications

Return ONLY a JSON array with this exact structure:
[
  {
    "url": "the full URL",
    "criterionNumber": "1",
    "title": "Specific description of evidence",
    "relevance": "Detailed explanation of why this supports the criterion"
  }
]

Be specific about what the evidence shows and how it relates to the criterion. Focus on the substantive value of the evidence.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Claude response:', responseText);
    throw new Error('Failed to parse URL analysis response - no JSON array found');
  }

  let analysis;
  try {
    analysis = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Attempted to parse:', jsonMatch[0]);
    throw new Error('Failed to parse URL analysis JSON');
  }

  // Validate response is array
  if (!Array.isArray(analysis)) {
    throw new Error('URL analysis response must be an array');
  }

  // Create map of URL -> metadata with validation
  const urlMap = new Map<string, { criterionNumber: string; title: string; relevance: string }>();
  const criteriaCount = criteria.length;

  for (const item of analysis) {
    // Validate required fields
    if (!item.url || !item.criterionNumber || !item.title || !item.relevance) {
      console.warn('Skipping invalid analysis item:', item);
      continue;
    }

    // Validate criterion number is in valid range
    const criterionNum = parseInt(item.criterionNumber);
    if (isNaN(criterionNum) || criterionNum < 1 || criterionNum > criteriaCount) {
      console.warn(`Invalid criterion number ${item.criterionNumber} for URL ${item.url}. Must be 1-${criteriaCount}.`);
      continue;
    }

    urlMap.set(item.url, {
      criterionNumber: item.criterionNumber,
      title: item.title,
      relevance: item.relevance,
    });
  }

  if (urlMap.size === 0) {
    throw new Error('No valid URL analysis results were returned');
  }

  return urlMap;
}

/**
 * Analyze uploaded documents to determine which criterion each supports
 */
async function analyzeDocumentRelevance(
  documents: UploadedDocument[],
  beneficiaryName: string,
  fieldOfProfession: string,
  visaType: string
): Promise<Map<string, { criterionNumber: string; title: string; relevance: string }>> {
  const criteria = VISA_CRITERIA[visaType] || VISA_CRITERIA['O-1A'];

  const prompt = `You are analyzing documentary evidence for a ${visaType} visa petition for ${beneficiaryName}, a professional in ${fieldOfProfession}.

**Available Criteria:**
${criteria.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join('\n')}

**Documents to analyze:**
${documents.map((doc, i) => `${i + 1}. File: ${doc.fileName}\nType: ${doc.fileType}\nSummary: ${doc.summary}`).join('\n\n')}

For each document, determine:
1. Which criterion (1-${criteria.length}) it best supports
2. A clear, specific title describing what the document shows
3. A 2-3 sentence explanation of WHY this document supports that criterion

Return ONLY a JSON array with this exact structure:
[
  {
    "fileName": "exact file name",
    "criterionNumber": "1",
    "title": "Specific description of evidence",
    "relevance": "Detailed explanation of why this supports the criterion"
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Claude response:', responseText);
    throw new Error('Failed to parse document analysis response - no JSON array found');
  }

  let analysis;
  try {
    analysis = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Attempted to parse:', jsonMatch[0]);
    throw new Error('Failed to parse document analysis JSON');
  }

  if (!Array.isArray(analysis)) {
    throw new Error('Document analysis response must be an array');
  }

  const docMap = new Map<string, { criterionNumber: string; title: string; relevance: string }>();
  const criteriaCount = criteria.length;

  for (const item of analysis) {
    // Validate required fields
    if (!item.fileName || !item.criterionNumber || !item.title || !item.relevance) {
      console.warn('Skipping invalid document analysis item:', item);
      continue;
    }

    // Validate criterion number
    const criterionNum = parseInt(item.criterionNumber);
    if (isNaN(criterionNum) || criterionNum < 1 || criterionNum > criteriaCount) {
      console.warn(`Invalid criterion number ${item.criterionNumber} for document ${item.fileName}. Must be 1-${criteriaCount}.`);
      continue;
    }

    docMap.set(item.fileName, {
      criterionNumber: item.criterionNumber,
      title: item.title,
      relevance: item.relevance,
    });
  }

  if (docMap.size === 0) {
    throw new Error('No valid document analysis results were returned');
  }

  return docMap;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExhibitRequest = await request.json();
    const { urls, uploadedDocuments, beneficiaryName, visaType, fieldOfProfession, caseId } = body;

    const hasUrls = urls && urls.length > 0;
    const hasDocs = uploadedDocuments && uploadedDocuments.length > 0;

    if (!hasUrls && !hasDocs) {
      return NextResponse.json(
        { error: 'No URLs or documents provided' },
        { status: 400 }
      );
    }

    if (!beneficiaryName || !caseId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate API keys
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'ANTHROPIC_API_KEY not configured',
          details: 'Claude API key is required for evidence analysis',
        },
        { status: 503 }
      );
    }

    if (hasUrls && !process.env.API2PDF_API_KEY) {
      return NextResponse.json(
        {
          error: 'API2PDF_API_KEY not configured',
          details: 'API2PDF API key is required for URL-to-PDF conversion',
        },
        { status: 503 }
      );
    }

    const totalUrls = urls?.length || 0;
    const totalDocs = uploadedDocuments?.length || 0;
    console.log(`Processing ${totalUrls} URLs and ${totalDocs} documents for exhibits...`);

    // Step 1: Analyze ALL evidence (URLs + documents) with Claude in ONE call for efficiency
    let urlAnalysis = new Map<string, { criterionNumber: string; title: string; relevance: string }>();
    let docAnalysis = new Map<string, { criterionNumber: string; title: string; relevance: string }>();
    let archiveResults: any[] = [];
    let conversionResults: any[] = [];

    // If we have both URLs and documents, combine the analysis
    if (hasUrls && hasDocs) {
      console.log('Analyzing URLs and documents together with Claude (optimized)...');
      const criteria = VISA_CRITERIA[visaType] || VISA_CRITERIA['O-1A'];

      const combinedPrompt = `You are analyzing evidence for a ${visaType} visa petition for ${beneficiaryName}, a professional in ${fieldOfProfession}.

**Available Criteria:**
${criteria.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join('\n')}

**URLs to analyze:**
${urls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

**Documents to analyze:**
${uploadedDocuments.map((doc, i) => `${i + 1}. File: ${doc.fileName}\nType: ${doc.fileType}\nSummary: ${doc.summary}`).join('\n\n')}

For each URL and document, determine:
1. Which criterion (1-${criteria.length}) it best supports
2. A clear, specific title describing what the evidence shows
3. A 2-3 sentence explanation of WHY this evidence supports that criterion

Return ONLY a JSON object with this exact structure:
{
  "urls": [
    {
      "url": "the full URL",
      "criterionNumber": "1",
      "title": "Specific description of evidence",
      "relevance": "Detailed explanation of why this supports the criterion"
    }
  ],
  "documents": [
    {
      "fileName": "exact file name",
      "criterionNumber": "1",
      "title": "Specific description of evidence",
      "relevance": "Detailed explanation of why this supports the criterion"
    }
  ]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        temperature: 0.3,
        messages: [{ role: 'user', content: combinedPrompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const combined = JSON.parse(jsonMatch[0]);

          // Process URLs
          if (Array.isArray(combined.urls)) {
            for (const item of combined.urls) {
              if (item.url && item.criterionNumber && item.title && item.relevance) {
                const criterionNum = parseInt(item.criterionNumber);
                if (!isNaN(criterionNum) && criterionNum >= 1 && criterionNum <= criteria.length) {
                  urlAnalysis.set(item.url, {
                    criterionNumber: item.criterionNumber,
                    title: item.title,
                    relevance: item.relevance,
                  });
                }
              }
            }
          }

          // Process documents
          if (Array.isArray(combined.documents)) {
            for (const item of combined.documents) {
              if (item.fileName && item.criterionNumber && item.title && item.relevance) {
                const criterionNum = parseInt(item.criterionNumber);
                if (!isNaN(criterionNum) && criterionNum >= 1 && criterionNum <= criteria.length) {
                  docAnalysis.set(item.fileName, {
                    criterionNumber: item.criterionNumber,
                    title: item.title,
                    relevance: item.relevance,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing combined analysis:', error);
          // Fall back to separate calls
          console.log('Falling back to separate analysis calls...');
          urlAnalysis = await analyzeUrlRelevance(urls, beneficiaryName, fieldOfProfession, visaType);
          docAnalysis = await analyzeDocumentRelevance(uploadedDocuments, beneficiaryName, fieldOfProfession, visaType);
        }
      }
    } else if (hasUrls) {
      console.log('Analyzing URL relevance with Claude...');
      urlAnalysis = await analyzeUrlRelevance(urls, beneficiaryName, fieldOfProfession, visaType);
    } else if (hasDocs) {
      console.log('Analyzing document relevance with Claude...');
      docAnalysis = await analyzeDocumentRelevance(uploadedDocuments, beneficiaryName, fieldOfProfession, visaType);
    }

    // Step 2: Archive all URLs to Wayback Machine
    if (hasUrls) {
      console.log('Archiving URLs to Wayback Machine...');
      archiveResults = await archiveUrls(urls);

      // Step 3: Convert URLs to PDFs using API2PDF
      console.log('Converting URLs to PDFs...');
      conversionResults = await convertUrlsToPdfs(urls);
    }

    // Calculate cost
    const totalCost = conversionResults.reduce((sum, r) => sum + (r.cost || 0), 0);

    // Step 4: Process exhibits and organize by criterion
    console.log('Generating cover sheets and organizing exhibits...');
    const criterionGroups: Map<string, CriterionGroup> = new Map();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const exhibitsByCriterion: Map<string, number> = new Map();

    const uploadedExhibits: any[] = [];

    // Process URL exhibits
    for (let i = 0; i < totalUrls; i++) {
      const url = urls[i];
      const archiveResult = archiveResults[i];
      const conversionResult = conversionResults[i];

      if (!conversionResult.success || !conversionResult.pdf) {
        console.error(`Failed to convert URL ${url}`);
        continue;
      }

      // Get analysis for this URL
      const analysis = urlAnalysis.get(url);
      if (!analysis) {
        console.error(`No analysis found for URL ${url}`);
        continue;
      }

      const { criterionNumber, title, relevance } = analysis;

      // Get exhibit letter for this criterion
      const criterionCount = exhibitsByCriterion.get(criterionNumber) || 0;
      const exhibitLetter = alphabet[criterionCount];
      exhibitsByCriterion.set(criterionNumber, criterionCount + 1);

      // Get page count
      const pageCount = await getPdfPageCount(conversionResult.pdf);

      // Create exhibit info
      const exhibitInfo: ExhibitInfo = {
        exhibitNumber: exhibitLetter,
        criterionNumber,
        title,
        description: relevance,
        url,
        archivedUrl: archiveResult.success ? archiveResult.archivedUrl : undefined,
        pageCount,
        dateGenerated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      // Generate cover sheet
      const coverSheet = await generateCoverSheet(exhibitInfo);

      // Merge cover sheet with PDF
      const mergedPdf = await mergePdfs(coverSheet, conversionResult.pdf);

      // Add to criterion group
      if (!criterionGroups.has(criterionNumber)) {
        const criteria = VISA_CRITERIA[visaType] || VISA_CRITERIA['O-1A'];
        const criterion = criteria[parseInt(criterionNumber) - 1];
        criterionGroups.set(criterionNumber, {
          criterionNumber,
          criterionName: criterion.name,
          description: criterion.description,
          exhibits: [],
        });
      }

      const group = criterionGroups.get(criterionNumber)!;
      group.exhibits.push({
        exhibitNumber: exhibitLetter,
        criterionNumber,
        title,
        url,
        archivedUrl: archiveResult.archivedUrl,
        relevance,
        pageCount,
      });

      uploadedExhibits.push({
        exhibitNumber: `${criterionNumber}-${exhibitLetter}`,
        title,
        pdfBuffer: mergedPdf, // Store the PDF buffer for combining later
        pageCount,
        criterionNumber,
      });
    }

    // Process uploaded documents
    if (hasDocs) {
      console.log('Processing uploaded documents...');
      const axios = (await import('axios')).default;

      for (const doc of uploadedDocuments) {
        try {
          // Get analysis for this document
          const analysis = docAnalysis.get(doc.fileName);
          if (!analysis) {
            console.error(`No analysis found for document ${doc.fileName}`);
            continue;
          }

          const { criterionNumber, title, relevance } = analysis;

          // Get exhibit letter for this criterion
          const criterionCount = exhibitsByCriterion.get(criterionNumber) || 0;
          const exhibitLetter = alphabet[criterionCount];
          exhibitsByCriterion.set(criterionNumber, criterionCount + 1);

          // Download the document from Blob storage with timeout and size limit
          const response = await axios.get(doc.blobUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            maxBodyLength: 50 * 1024 * 1024
          });

          if (!response.data) {
            console.error(`No data received for ${doc.fileName}`);
            continue;
          }

          const documentBuffer = Buffer.from(response.data);

          // Only process PDF documents for exhibits
          if (doc.fileType !== 'application/pdf') {
            console.warn(`Document ${doc.fileName} is not a PDF (${doc.fileType}). Only PDF documents can be included in exhibits. File will be skipped.`);
            continue;
          }

          // Get page count
          const pageCount = await getPdfPageCount(documentBuffer);
          const pdfBuffer = documentBuffer;

          // Create exhibit info for cover sheet
          const exhibitInfo: ExhibitInfo = {
            exhibitNumber: exhibitLetter,
            criterionNumber,
            title,
            description: relevance,
            url: `Uploaded Document: ${doc.fileName}`, // Clearly label as uploaded document
            archivedUrl: undefined, // No archival for uploaded documents
            pageCount,
            dateGenerated: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          };

          // Generate cover sheet
          const coverSheet = await generateCoverSheet(exhibitInfo);

          // Merge cover sheet with document PDF
          const mergedPdf = await mergePdfs(coverSheet, pdfBuffer);

          // Add to criterion group
          if (!criterionGroups.has(criterionNumber)) {
            const criteria = VISA_CRITERIA[visaType] || VISA_CRITERIA['O-1A'];
            const criterion = criteria[parseInt(criterionNumber) - 1];
            criterionGroups.set(criterionNumber, {
              criterionNumber,
              criterionName: criterion.name,
              description: criterion.description,
              exhibits: [],
            });
          }

          const group = criterionGroups.get(criterionNumber)!;
          group.exhibits.push({
            exhibitNumber: exhibitLetter,
            criterionNumber,
            title,
            url: `Uploaded Document: ${doc.fileName}`,
            archivedUrl: undefined,
            relevance,
            pageCount,
          });

          uploadedExhibits.push({
            exhibitNumber: `${criterionNumber}-${exhibitLetter}`,
            title,
            pdfBuffer: mergedPdf,
            pageCount,
            criterionNumber,
          });

          console.log(`Processed document ${doc.fileName} as Exhibit ${criterionNumber}-${exhibitLetter}`);
        } catch (error) {
          console.error(`Error processing document ${doc.fileName}:`, error);
        }
      }
    }

    // Step 5: Generate exhibit list PDF
    console.log('Generating exhibit list...');
    const sortedGroups = Array.from(criterionGroups.values()).sort(
      (a, b) => parseInt(a.criterionNumber) - parseInt(b.criterionNumber)
    );

    const exhibitListPdf = await generateExhibitList(beneficiaryName, visaType, sortedGroups);

    // Step 6: Create ONE combined PDF with exhibit list + all exhibits organized by criterion
    console.log('Creating combined PDF with all exhibits...');
    const { PDFDocument } = await import('pdf-lib');
    const combinedPdf = await PDFDocument.create();

    // Add exhibit list first
    const listDoc = await PDFDocument.load(exhibitListPdf);
    const listPages = await combinedPdf.copyPages(listDoc, listDoc.getPageIndices());
    listPages.forEach((page) => combinedPdf.addPage(page));

    // Add exhibits organized by criterion
    for (const group of sortedGroups) {
      // Find all exhibits for this criterion
      const criterionExhibits = uploadedExhibits.filter(
        e => e.criterionNumber === group.criterionNumber
      );

      // Add each exhibit PDF
      for (const exhibit of criterionExhibits) {
        const exhibitPdf = exhibit.pdfBuffer; // We'll store this
        const exhibitDoc = await PDFDocument.load(exhibitPdf);
        const exhibitPages = await combinedPdf.copyPages(exhibitDoc, exhibitDoc.getPageIndices());
        exhibitPages.forEach((page) => combinedPdf.addPage(page));
      }
    }

    // Save combined PDF
    const combinedPdfBytes = await combinedPdf.save();
    const combinedBuffer = Buffer.from(combinedPdfBytes);

    // Cleanup temporary uploaded documents BEFORE uploading combined PDF
    if (hasDocs) {
      try {
        console.log('Cleaning up temporary uploaded documents...');
        const { del: deleteBlob } = await import('@vercel/blob');

        // Delete each uploaded document by its blobUrl
        const deletePromises = uploadedDocuments.map(doc => {
          console.log(`Deleting: ${doc.blobUrl}`);
          return deleteBlob(doc.blobUrl).catch(err => {
            console.error(`Failed to delete ${doc.fileName}:`, err);
            // Continue even if one delete fails
          });
        });

        await Promise.all(deletePromises);
        console.log(`Cleaned up ${uploadedDocuments.length} temporary files`);
      } catch (cleanupError) {
        console.error('Error during cleanup (non-fatal):', cleanupError);
        // Don't fail the request if cleanup fails
      }
    }

    // Upload combined PDF AFTER cleanup
    const combinedBlob = await put(`${caseId}/Complete_Exhibits.pdf`, combinedBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${uploadedExhibits.length} exhibits (${totalUrls} URLs + ${totalDocs} documents) in one combined PDF`,
      results: {
        totalUrls,
        totalDocuments: totalDocs,
        converted: uploadedExhibits.length,
        failed: (totalUrls + totalDocs) - uploadedExhibits.length,
        estimatedCost: totalCost,
        combinedPdfUrl: combinedBlob.url,
        criterionGroups: sortedGroups.map(g => ({
          criterionNumber: g.criterionNumber,
          criterionName: g.criterionName,
          exhibitCount: g.exhibits.length,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error generating exhibits:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate exhibits',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
