import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { processFile } from '@/app/lib/file-processor';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for file processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOCX, DOC, JPG, PNG, TXT' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Process file to extract text
    const processed = await processFile(file);

    return NextResponse.json({
      success: true,
      blob: {
        url: blob.url,
        pathname: blob.pathname,
        downloadUrl: blob.downloadUrl,
      },
      processed: {
        fileName: processed.fileName,
        fileType: processed.fileType,
        wordCount: processed.wordCount,
        pageCount: processed.pageCount,
        summary: processed.summary,
        // Don't send full extracted text in response (too large)
        // It will be extracted again during document generation
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
