import { NextRequest, NextResponse } from 'next/server';
import { cases } from '../../../generate/route';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string; docIndex: string } }
) {
  const { caseId, docIndex } = params;

  const petitionCase = cases.get(caseId);

  if (!petitionCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const docIndexNum = parseInt(docIndex);
  const document = petitionCase.documents[docIndexNum];

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Try to read from file system first
  const filePath = path.join(process.cwd(), 'public', 'outputs', caseId, document.name);

  let content = document.content;

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${document.name}"`,
    },
  });
}
