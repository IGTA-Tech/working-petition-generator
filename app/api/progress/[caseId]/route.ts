import { NextRequest, NextResponse } from 'next/server';
import { progress } from '../../generate/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const caseId = params.caseId;

  const progressData = progress.get(caseId);

  if (!progressData) {
    return NextResponse.json(
      {
        stage: 'Not Found',
        progress: 0,
        message: 'Case not found',
        status: 'error',
        error: 'Case ID not found',
      },
      { status: 404 }
    );
  }

  return NextResponse.json(progressData);
}
