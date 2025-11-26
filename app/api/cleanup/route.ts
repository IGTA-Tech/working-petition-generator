import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Cleanup endpoint to delete temporary files from Vercel Blob storage
 * Deletes all files with a specific caseId prefix
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId is required' },
        { status: 400 }
      );
    }

    // Don't allow cleanup of 'temp' prefix (too broad)
    if (caseId === 'temp') {
      return NextResponse.json(
        { error: 'Cannot cleanup generic "temp" prefix. Provide specific caseId.' },
        { status: 400 }
      );
    }

    console.log(`Starting cleanup for caseId: ${caseId}`);

    // List all blobs with the caseId prefix
    const { blobs } = await list({
      prefix: `${caseId}/`,
    });

    console.log(`Found ${blobs.length} files to delete for caseId: ${caseId}`);

    // Delete each blob
    const deletePromises = blobs.map(blob => del(blob.url));
    await Promise.all(deletePromises);

    console.log(`Cleanup completed for caseId: ${caseId}. Deleted ${blobs.length} files.`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${blobs.length} files for case ${caseId}`,
      filesDeleted: blobs.length,
    });
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup files',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
