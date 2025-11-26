import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryInfo, PetitionCase } from '@/app/types';
import { generateAllDocuments } from '@/app/lib/document-generator';
import { sendDocumentsEmail } from '@/app/lib/email-service';
import fs from 'fs';
import path from 'path';

// In-memory storage for demo (in production, use a database)
// Use global to persist across hot-reloads in development
const globalForCases = global as unknown as { cases?: Map<string, PetitionCase>; progress?: Map<string, any> };
const cases = globalForCases.cases ?? new Map<string, PetitionCase>();
const progress = globalForCases.progress ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForCases.cases = cases;
  globalForCases.progress = progress;
}

export async function POST(request: NextRequest) {
  try {
    const beneficiaryInfo: BeneficiaryInfo = await request.json();

    // Validate input
    if (!beneficiaryInfo.fullName || !beneficiaryInfo.visaType || !beneficiaryInfo.recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use caseId from client if provided, otherwise generate new one
    // This ensures files uploaded earlier use the same caseId as the generation process
    const caseId = beneficiaryInfo.caseId || `case_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Initialize case
    const petitionCase: PetitionCase = {
      id: caseId,
      beneficiaryInfo,
      documents: [],
      status: 'processing',
      createdAt: new Date(),
    };

    cases.set(caseId, petitionCase);

    // Initialize progress
    progress.set(caseId, {
      stage: 'Initializing',
      progress: 0,
      message: 'Starting document generation...',
      status: 'processing',
    });

    // Start generation in background
    generateDocumentsAsync(caseId, beneficiaryInfo);

    return NextResponse.json({ caseId, status: 'processing' });
  } catch (error: any) {
    console.error('Error starting generation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateDocumentsAsync(caseId: string, beneficiaryInfo: BeneficiaryInfo) {
  try {
    const result = await generateAllDocuments(beneficiaryInfo, (stage, prog, message) => {
      progress.set(caseId, {
        stage,
        progress: prog,
        message,
        status: 'processing',
      });
    });

    // Prepare documents
    const documents = [
      {
        id: 'doc1',
        name: `Document_1_Comprehensive_Analysis_${beneficiaryInfo.fullName.replace(/\s/g, '_')}.md`,
        content: result.document1,
        pageCount: Math.ceil(result.document1.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc2',
        name: `Document_2_Publication_Analysis_${beneficiaryInfo.fullName.replace(/\s/g, '_')}.md`,
        content: result.document2,
        pageCount: Math.ceil(result.document2.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc3',
        name: `Document_3_URL_Reference_${beneficiaryInfo.fullName.replace(/\s/g, '_')}.md`,
        content: result.document3,
        pageCount: Math.ceil(result.document3.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc4',
        name: `Document_4_Legal_Brief_${beneficiaryInfo.fullName.replace(/\s/g, '_')}.md`,
        content: result.document4,
        pageCount: Math.ceil(result.document4.length / 2500),
        timestamp: new Date(),
      },
    ];

    // Save documents to disk
    const outputDir = path.join(process.cwd(), 'public', 'outputs', caseId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    documents.forEach((doc) => {
      fs.writeFileSync(path.join(outputDir, doc.name), doc.content);
    });

    // Update case
    const petitionCase = cases.get(caseId);
    if (petitionCase) {
      petitionCase.documents = documents;
      petitionCase.status = 'completed';
      petitionCase.completedAt = new Date();
      cases.set(caseId, petitionCase);
    }

    // Send email
    progress.set(caseId, {
      stage: 'Sending Email',
      progress: 95,
      message: 'Sending documents to your email...',
      status: 'processing',
    });

    const emailSent = await sendDocumentsEmail(beneficiaryInfo, documents);

    // Update final progress
    progress.set(caseId, {
      stage: 'Complete',
      progress: 100,
      message: emailSent
        ? 'Documents generated and emailed successfully!'
        : 'Documents generated! (Email delivery failed - please download manually)',
      status: 'completed',
      documents,
    });
  } catch (error: any) {
    console.error('Error generating documents:', error);

    progress.set(caseId, {
      stage: 'Error',
      progress: 0,
      message: 'An error occurred during generation',
      status: 'error',
      error: error.message,
    });

    const petitionCase = cases.get(caseId);
    if (petitionCase) {
      petitionCase.status = 'error';
      petitionCase.error = error.message;
      cases.set(caseId, petitionCase);
    }
  }
}

export { cases, progress };
