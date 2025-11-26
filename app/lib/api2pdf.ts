/**
 * API2PDF Integration
 *
 * Converts URLs to PDF using API2PDF service
 * https://www.api2pdf.com/documentation/
 */

import axios from 'axios';

export interface PdfConversionResult {
  success: boolean;
  pdf?: Buffer;
  fileUrl?: string;
  error?: string;
  mbOut?: number;
  cost?: number;
}

/**
 * Convert a URL to PDF using API2PDF
 *
 * @param url - The URL to convert to PDF
 * @param apiKey - API2PDF API key (optional, defaults to env var)
 * @returns PDF conversion result with buffer
 */
export async function convertUrlToPdf(
  url: string,
  apiKey?: string
): Promise<PdfConversionResult> {
  try {
    const key = apiKey || process.env.API2PDF_API_KEY;

    if (!key) {
      return {
        success: false,
        error: 'API2PDF API key not configured',
      };
    }

    // API2PDF headless Chrome endpoint
    const endpoint = 'https://v2.api2pdf.com/chrome/url';

    const response = await axios.post(
      endpoint,
      {
        url: url,
        inlinePdf: false, // Get file URL to download
        fileName: `exhibit_${Date.now()}.pdf`,
        options: {
          displayHeaderFooter: false,
          printBackground: true,
          landscape: false,
          preferCSSPageSize: false,
          marginTop: 0.4,
          marginBottom: 0.4,
          marginLeft: 0.4,
          marginRight: 0.4,
        },
      },
      {
        headers: {
          'Authorization': key,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minute timeout
      }
    );

    if (!response.data.success) {
      return {
        success: false,
        error: response.data.error || 'PDF conversion failed',
      };
    }

    // Download the PDF from the returned URL
    const pdfUrl = response.data.pdf;
    const pdfResponse = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const pdfBuffer = Buffer.from(pdfResponse.data);

    return {
      success: true,
      pdf: pdfBuffer,
      fileUrl: pdfUrl,
      mbOut: response.data.mbOut,
      cost: response.data.cost,
    };
  } catch (error: any) {
    console.error(`Failed to convert URL ${url} to PDF:`, error.message);
    return {
      success: false,
      error: error.message || 'Unknown error during PDF conversion',
    };
  }
}

/**
 * Convert multiple URLs to PDFs with progress tracking
 *
 * @param urls - Array of URLs to convert
 * @param apiKey - API2PDF API key (optional)
 * @param onProgress - Progress callback
 * @returns Array of PDF conversion results
 */
export async function convertUrlsToPdfs(
  urls: string[],
  apiKey?: string,
  onProgress?: (completed: number, total: number, currentUrl: string) => void
): Promise<PdfConversionResult[]> {
  const results: PdfConversionResult[] = [];
  const batchSize = 3; // Convert 3 at a time to avoid rate limiting

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        if (onProgress) {
          onProgress(i + 1, urls.length, url);
        }
        return convertUrlToPdf(url, apiKey);
      })
    );

    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Estimate cost for converting URLs
 *
 * @param urlCount - Number of URLs to convert
 * @returns Estimated cost in USD
 */
export function estimateCost(urlCount: number): number {
  // Based on API2PDF pricing:
  // $1.00 base fee per month
  // $0.001 per MB output
  // $0.00019551 per second of conversion

  // Average estimates:
  // - 2 MB per PDF
  // - 3 seconds per conversion

  const avgMbPerPdf = 2;
  const avgSecondsPerPdf = 3;

  const mbCost = urlCount * avgMbPerPdf * 0.001;
  const timeCost = urlCount * avgSecondsPerPdf * 0.00019551;

  return mbCost + timeCost;
}
