import { createClient } from '@vercel/kv';
import { PetitionCase } from '@/app/types';

// Check if KV is available (will be true in production with KV configured)
const isKVAvailable = () => {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
};

// Create KV client with explicit configuration
const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

// Fallback in-memory storage for local development
const globalForCases = global as unknown as {
  cases?: Map<string, PetitionCase>;
  progress?: Map<string, any>
};
const inMemoryCases = globalForCases.cases ?? new Map<string, PetitionCase>();
const inMemoryProgress = globalForCases.progress ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForCases.cases = inMemoryCases;
  globalForCases.progress = inMemoryProgress;
}

/**
 * Storage abstraction layer
 * Uses Vercel KV in production (when available) for cross-instance persistence
 * Falls back to in-memory Maps for local development
 */
export const storage = {
  /**
   * Store a petition case
   */
  async setCase(caseId: string, petitionCase: PetitionCase): Promise<void> {
    if (isKVAvailable()) {
      await kv.set(`case:${caseId}`, JSON.stringify(petitionCase), {
        ex: 60 * 60 * 24, // 24 hour expiry
      });
    } else {
      inMemoryCases.set(caseId, petitionCase);
    }
  },

  /**
   * Retrieve a petition case
   */
  async getCase(caseId: string): Promise<PetitionCase | null> {
    if (isKVAvailable()) {
      const data = await kv.get<string>(`case:${caseId}`);
      return data ? JSON.parse(data) : null;
    } else {
      return inMemoryCases.get(caseId) || null;
    }
  },

  /**
   * Store progress for a case
   */
  async setProgress(caseId: string, progressData: any): Promise<void> {
    if (isKVAvailable()) {
      await kv.set(`progress:${caseId}`, JSON.stringify(progressData), {
        ex: 60 * 60 * 24, // 24 hour expiry
      });
    } else {
      inMemoryProgress.set(caseId, progressData);
    }
  },

  /**
   * Retrieve progress for a case
   */
  async getProgress(caseId: string): Promise<any | null> {
    if (isKVAvailable()) {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('KV timeout')), 5000)
        );
        const kvPromise = kv.get<string>(`progress:${caseId}`);

        const data = await Promise.race([kvPromise, timeoutPromise]) as string | null;
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('KV getProgress error:', error);
        // Fallback to in-memory on error
        return inMemoryProgress.get(caseId) || null;
      }
    } else {
      return inMemoryProgress.get(caseId) || null;
    }
  },

  /**
   * Delete a case and its progress
   */
  async deleteCase(caseId: string): Promise<void> {
    if (isKVAvailable()) {
      await kv.del(`case:${caseId}`);
      await kv.del(`progress:${caseId}`);
    } else {
      inMemoryCases.delete(caseId);
      inMemoryProgress.delete(caseId);
    }
  },

  /**
   * Check if storage is using KV or in-memory
   */
  isUsingKV(): boolean {
    return isKVAvailable();
  },
};
