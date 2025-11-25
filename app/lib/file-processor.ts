import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

export interface ProcessedFile {
  fileName: string;
  fileType: string;
  extractedText: string;
  pageCount?: number;
  wordCount: number;
  summary: string;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return {
      text: result.text,
      pageCount: result.total,
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return { text: '', pageCount: 0 };
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error('Error extracting image text:', error);
    return '';
  }
}

/**
 * Process a single file and extract text based on type
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = '';
  let pageCount: number | undefined;

  // Extract text based on file type
  if (file.type === 'application/pdf') {
    const result = await extractTextFromPDF(buffer);
    extractedText = result.text;
    pageCount = result.pageCount;
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    extractedText = await extractTextFromDOCX(buffer);
  } else if (file.type.startsWith('image/')) {
    extractedText = await extractTextFromImage(buffer);
  } else if (file.type === 'text/plain') {
    extractedText = await file.text();
  }

  // Clean up extracted text
  extractedText = extractedText
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Calculate word count
  const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

  // Generate summary (first 500 characters)
  const summary = extractedText.length > 500
    ? extractedText.substring(0, 500) + '...'
    : extractedText;

  return {
    fileName: file.name,
    fileType: file.type,
    extractedText,
    pageCount,
    wordCount,
    summary,
  };
}

/**
 * Process multiple files
 */
export async function processFiles(files: File[]): Promise<ProcessedFile[]> {
  const processPromises = files.map(file => processFile(file));
  return Promise.all(processPromises);
}

/**
 * Categorize files by evidence type
 */
export function categorizeFiles(processedFiles: ProcessedFile[]): {
  resumes: ProcessedFile[];
  awards: ProcessedFile[];
  publications: ProcessedFile[];
  media: ProcessedFile[];
  letters: ProcessedFile[];
  other: ProcessedFile[];
} {
  const categories = {
    resumes: [] as ProcessedFile[],
    awards: [] as ProcessedFile[],
    publications: [] as ProcessedFile[],
    media: [] as ProcessedFile[],
    letters: [] as ProcessedFile[],
    other: [] as ProcessedFile[],
  };

  processedFiles.forEach(file => {
    const text = file.extractedText.toLowerCase();
    const fileName = file.fileName.toLowerCase();

    if (fileName.includes('cv') || fileName.includes('resume') || text.includes('curriculum vitae')) {
      categories.resumes.push(file);
    } else if (
      fileName.includes('award') ||
      fileName.includes('certificate') ||
      text.includes('award') ||
      text.includes('certificate of')
    ) {
      categories.awards.push(file);
    } else if (
      fileName.includes('publication') ||
      fileName.includes('paper') ||
      fileName.includes('article') ||
      text.includes('published in') ||
      text.includes('journal of')
    ) {
      categories.publications.push(file);
    } else if (
      fileName.includes('media') ||
      fileName.includes('press') ||
      fileName.includes('news') ||
      text.includes('published:') ||
      text.includes('news article')
    ) {
      categories.media.push(file);
    } else if (
      fileName.includes('letter') ||
      fileName.includes('recommendation') ||
      text.includes('to whom it may concern') ||
      text.includes('i am writing to recommend')
    ) {
      categories.letters.push(file);
    } else {
      categories.other.push(file);
    }
  });

  return categories;
}

/**
 * Generate file evidence summary for AI analysis
 */
export function generateFileEvidenceSummary(processedFiles: ProcessedFile[]): string {
  const categories = categorizeFiles(processedFiles);

  let summary = '# UPLOADED DOCUMENT EVIDENCE\n\n';
  summary += `Total documents uploaded: ${processedFiles.length}\n`;
  summary += `Total words extracted: ${processedFiles.reduce((sum, f) => sum + f.wordCount, 0)}\n\n`;

  // Add categorized summaries
  if (categories.resumes.length > 0) {
    summary += '## RESUMES/CVs\n\n';
    categories.resumes.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.awards.length > 0) {
    summary += '## AWARDS & CERTIFICATES\n\n';
    categories.awards.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.publications.length > 0) {
    summary += '## PUBLICATIONS & PAPERS\n\n';
    categories.publications.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}${file.pageCount ? `, Pages: ${file.pageCount}` : ''}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.media.length > 0) {
    summary += '## MEDIA COVERAGE\n\n';
    categories.media.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.letters.length > 0) {
    summary += '## LETTERS OF RECOMMENDATION\n\n';
    categories.letters.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.other.length > 0) {
    summary += '## OTHER EVIDENCE\n\n';
    categories.other.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  // Add full text for detailed analysis
  summary += '\n---\n\n# FULL EXTRACTED TEXT (for detailed analysis)\n\n';
  processedFiles.forEach(file => {
    summary += `## ${file.fileName}\n\n`;
    summary += file.extractedText + '\n\n---\n\n';
  });

  return summary;
}
