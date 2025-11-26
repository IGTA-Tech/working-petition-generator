/**
 * Exhibit List Generator
 *
 * Generates a comprehensive exhibit list that explains how each piece of evidence
 * correlates to specific criteria and why it's relevant
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ExhibitEntry {
  exhibitNumber: string; // e.g., "A", "B", "C"
  criterionNumber?: string; // e.g., "1", "2", "3"
  title: string;
  url: string;
  archivedUrl?: string;
  relevance: string; // Explanation of why this evidence supports the criterion
  pageCount?: number;
}

export interface CriterionGroup {
  criterionNumber: string;
  criterionName: string;
  description: string;
  exhibits: ExhibitEntry[];
}

/**
 * Generate exhibit list PDF with criteria correlation explanations
 */
export async function generateExhibitList(
  beneficiaryName: string,
  visaType: string,
  criterionGroups: CriterionGroup[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Colors
  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const blue = rgb(0, 0, 0.8);

  let currentPage = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = currentPage.getSize();
  const margin = 72; // 1 inch
  const lineHeight = 14;
  let yPosition = height - margin;

  // Helper function to add new page if needed
  const checkPageSpace = (requiredSpace: number) => {
    if (yPosition - requiredSpace < margin) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      return true;
    }
    return false;
  };

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number, fontSize: number, font: any): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Title
  currentPage.drawText('EXHIBIT LIST', {
    x: width / 2 - boldFont.widthOfTextAtSize('EXHIBIT LIST', 20) / 2,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: black,
  });
  yPosition -= lineHeight * 2.5;

  // Case information
  currentPage.drawText(`Beneficiary: ${beneficiaryName}`, {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: black,
  });
  yPosition -= lineHeight * 1.2;

  currentPage.drawText(`Visa Classification: ${visaType}`, {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: black,
  });
  yPosition -= lineHeight * 1.2;

  currentPage.drawText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: darkGray,
  });
  yPosition -= lineHeight * 2.5;

  // Horizontal line
  currentPage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 1,
    color: black,
  });
  yPosition -= lineHeight * 2;

  // Process each criterion group
  for (const group of criterionGroups) {
    checkPageSpace(lineHeight * 6);

    // Criterion header
    currentPage.drawText(`CRITERION ${group.criterionNumber}: ${group.criterionName}`, {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: black,
    });
    yPosition -= lineHeight * 1.5;

    // Criterion description
    const descLines = wrapText(group.description, width - (margin * 2), 10, regularFont);
    for (const line of descLines) {
      checkPageSpace(lineHeight);
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: 10,
        font: italicFont,
        color: darkGray,
      });
      yPosition -= lineHeight;
    }
    yPosition -= lineHeight * 0.5;

    // Exhibits for this criterion
    for (const exhibit of group.exhibits) {
      checkPageSpace(lineHeight * 8);

      // Exhibit number
      const exhibitLabel = `Exhibit ${group.criterionNumber}-${exhibit.exhibitNumber}`;
      currentPage.drawText(exhibitLabel, {
        x: margin + 20,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: black,
      });
      yPosition -= lineHeight * 1.2;

      // Title
      const titleLines = wrapText(exhibit.title, width - (margin * 2) - 40, 10, regularFont);
      for (const line of titleLines) {
        checkPageSpace(lineHeight);
        currentPage.drawText(line, {
          x: margin + 40,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: darkGray,
        });
        yPosition -= lineHeight;
      }

      // Relevance explanation
      currentPage.drawText('Relevance:', {
        x: margin + 40,
        y: yPosition,
        size: 9,
        font: boldFont,
        color: black,
      });
      yPosition -= lineHeight;

      const relevanceLines = wrapText(exhibit.relevance, width - (margin * 2) - 60, 9, regularFont);
      for (const line of relevanceLines) {
        checkPageSpace(lineHeight);
        currentPage.drawText(line, {
          x: margin + 60,
          y: yPosition,
          size: 9,
          font: regularFont,
          color: darkGray,
        });
        yPosition -= lineHeight * 0.9;
      }

      // URL
      currentPage.drawText('Source:', {
        x: margin + 40,
        y: yPosition,
        size: 8,
        font: boldFont,
        color: black,
      });
      yPosition -= lineHeight * 0.8;

      const urlLines = wrapText(exhibit.url, width - (margin * 2) - 60, 7, regularFont);
      for (const line of urlLines) {
        checkPageSpace(lineHeight);
        currentPage.drawText(line, {
          x: margin + 60,
          y: yPosition,
          size: 7,
          font: regularFont,
          color: blue,
        });
        yPosition -= lineHeight * 0.7;
      }

      if (exhibit.pageCount) {
        currentPage.drawText(`Pages: ${exhibit.pageCount}`, {
          x: margin + 40,
          y: yPosition,
          size: 8,
          font: regularFont,
          color: darkGray,
        });
        yPosition -= lineHeight;
      }

      yPosition -= lineHeight * 1.5; // Space between exhibits
    }

    yPosition -= lineHeight; // Space between criteria
  }

  // Add page numbers
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNumber = `Page ${i + 1} of ${pages.length}`;
    page.drawText(pageNumber, {
      x: width / 2 - regularFont.widthOfTextAtSize(pageNumber, 9) / 2,
      y: 30,
      size: 9,
      font: regularFont,
      color: darkGray,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
