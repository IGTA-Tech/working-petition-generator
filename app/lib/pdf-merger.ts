/**
 * PDF Merger Utility
 *
 * Combines cover sheets with exhibit PDFs and creates organized ZIP files
 */

import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';
import { Readable } from 'stream';

export interface ExhibitPdf {
  exhibitNumber: string;
  criterionNumber?: string;
  coverSheet: Buffer;
  contentPdf: Buffer;
}

/**
 * Merge cover sheet with content PDF
 *
 * @param coverSheet - Cover sheet PDF buffer
 * @param contentPdf - Content PDF buffer
 * @returns Combined PDF buffer
 */
export async function mergePdfs(
  coverSheet: Buffer,
  contentPdf: Buffer
): Promise<Buffer> {
  try {
    // Create new PDF document
    const mergedPdf = await PDFDocument.create();

    // Load cover sheet
    const coverDoc = await PDFDocument.load(coverSheet);
    const coverPages = await mergedPdf.copyPages(coverDoc, coverDoc.getPageIndices());
    coverPages.forEach((page) => mergedPdf.addPage(page));

    // Load content PDF
    const contentDoc = await PDFDocument.load(contentPdf);
    const contentPages = await mergedPdf.copyPages(contentDoc, contentDoc.getPageIndices());
    contentPages.forEach((page) => mergedPdf.addPage(page));

    // Save merged PDF
    const mergedBytes = await mergedPdf.save();
    return Buffer.from(mergedBytes);
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
}

/**
 * Get page count from a PDF buffer
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 0;
  }
}

/**
 * Create a ZIP file containing all exhibit PDFs organized by criterion
 *
 * @param exhibits - Array of exhibit PDFs
 * @param beneficiaryName - Beneficiary name for folder naming
 * @returns ZIP file buffer
 */
export async function createExhibitsZip(
  exhibits: ExhibitPdf[],
  beneficiaryName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));

    // Group exhibits by criterion
    const byCriterion = new Map<string, ExhibitPdf[]>();

    for (const exhibit of exhibits) {
      const criterion = exhibit.criterionNumber || 'General';
      if (!byCriterion.has(criterion)) {
        byCriterion.set(criterion, []);
      }
      byCriterion.get(criterion)!.push(exhibit);
    }

    // Add exhibits to ZIP organized by criterion
    for (const [criterion, criterionExhibits] of byCriterion) {
      for (const exhibit of criterionExhibits) {
        const fileName = exhibit.criterionNumber
          ? `Criterion_${exhibit.criterionNumber}/Exhibit_${exhibit.criterionNumber}-${exhibit.exhibitNumber}.pdf`
          : `Exhibits/Exhibit_${exhibit.exhibitNumber}.pdf`;

        // Merge cover sheet with content
        mergePdfs(exhibit.coverSheet, exhibit.contentPdf)
          .then((mergedPdf) => {
            archive.append(mergedPdf, { name: fileName });
          })
          .catch((err) => {
            console.error(`Error merging exhibit ${exhibit.exhibitNumber}:`, err);
          });
      }
    }

    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Merge all exhibits into a single combined PDF (alternative to ZIP)
 *
 * @param exhibits - Array of exhibit PDFs
 * @returns Single combined PDF buffer
 */
export async function mergeAllExhibits(exhibits: ExhibitPdf[]): Promise<Buffer> {
  try {
    const combinedPdf = await PDFDocument.create();

    // Sort exhibits by criterion then by letter
    const sortedExhibits = [...exhibits].sort((a, b) => {
      if (a.criterionNumber !== b.criterionNumber) {
        return (a.criterionNumber || '').localeCompare(b.criterionNumber || '');
      }
      return a.exhibitNumber.localeCompare(b.exhibitNumber);
    });

    for (const exhibit of sortedExhibits) {
      // Add cover sheet
      const coverDoc = await PDFDocument.load(exhibit.coverSheet);
      const coverPages = await combinedPdf.copyPages(coverDoc, coverDoc.getPageIndices());
      coverPages.forEach((page) => combinedPdf.addPage(page));

      // Add content
      const contentDoc = await PDFDocument.load(exhibit.contentPdf);
      const contentPages = await combinedPdf.copyPages(contentDoc, contentDoc.getPageIndices());
      contentPages.forEach((page) => combinedPdf.addPage(page));
    }

    const combinedBytes = await combinedPdf.save();
    return Buffer.from(combinedBytes);
  } catch (error) {
    console.error('Error merging all exhibits:', error);
    throw error;
  }
}
