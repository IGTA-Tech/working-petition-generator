/**
 * Archive.org (Wayback Machine) Integration
 *
 * Saves URLs to Archive.org for permanent preservation
 * Returns archived URL for verification and permanent evidence
 */

import axios from 'axios';

export interface ArchiveResult {
  originalUrl: string;
  archivedUrl: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * Archive a URL to Archive.org Wayback Machine
 *
 * @param url - The URL to archive
 * @returns Archive result with archived URL
 */
export async function archiveUrl(url: string): Promise<ArchiveResult> {
  try {
    // Archive.org Save Page Now API
    const archiveApiUrl = `https://web.archive.org/save/${url}`;

    const response = await axios.get(archiveApiUrl, {
      timeout: 60000, // 60 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept any status < 500
    });

    // Extract archived URL from response headers or Location
    const archivedUrl = response.headers['content-location'] ||
                        response.headers['location'] ||
                        `https://web.archive.org/web/*/${url}`;

    // Extract timestamp from archived URL
    const timestampMatch = archivedUrl.match(/\/web\/(\d+)\//);
    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

    return {
      originalUrl: url,
      archivedUrl: archivedUrl,
      timestamp: timestamp,
      success: true,
    };
  } catch (error: any) {
    console.error(`Failed to archive URL ${url}:`, error.message);

    // Return best-effort archived URL even if save failed
    return {
      originalUrl: url,
      archivedUrl: `https://web.archive.org/web/*/${url}`,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
    };
  }
}

/**
 * Archive multiple URLs in parallel with rate limiting
 *
 * @param urls - Array of URLs to archive
 * @param onProgress - Optional progress callback
 * @returns Array of archive results
 */
export async function archiveUrls(
  urls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<ArchiveResult[]> {
  const results: ArchiveResult[] = [];
  const batchSize = 5; // Process 5 at a time to avoid rate limiting

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => archiveUrl(url))
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, urls.length);
    }

    // Small delay between batches to be respectful to Archive.org
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * Check if a URL has been archived before
 *
 * @param url - The URL to check
 * @returns Most recent archived URL or null
 */
export async function getArchivedUrl(url: string): Promise<string | null> {
  try {
    const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const response = await axios.get(checkUrl, { timeout: 10000 });

    if (response.data?.archived_snapshots?.closest?.url) {
      return response.data.archived_snapshots.closest.url;
    }

    return null;
  } catch (error) {
    console.error(`Failed to check archived URL:`, error);
    return null;
  }
}
