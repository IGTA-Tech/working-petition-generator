import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryInfo, PetitionCase } from '@/app/types';
import { generateAllDocuments } from '@/app/lib/document-generator';
import { sendDocumentsEmail } from '@/app/lib/email-service';
import { storage } from '@/app/lib/storage';
import fs from 'fs';
import path from 'path';

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

    await storage.setCase(caseId, petitionCase);

    // Initialize progress
    await storage.setProgress(caseId, {
      stage: 'Initializing',
      progress: 0,
      message: 'Starting document generation...',
      status: 'processing',
    });

    // Generate documents synchronously - function waits for completion
    // This ensures all progress is saved before the response returns
    await generateDocumentsAsync(caseId, beneficiaryInfo);

    // Get final result
    const finalCase = await storage.getCase(caseId);

    return NextResponse.json({
      caseId,
      status: finalCase?.status || 'completed',
      message: 'Generation completed successfully'
    });
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
    const result = await generateAllDocuments(beneficiaryInfo, async (stage, prog, message) => {
      await storage.setProgress(caseId, {
        stage,
        progress: prog,
        message,
        status: 'processing',
      });
    });

    // Prepare documents with descriptive names
    const cleanName = beneficiaryInfo.fullName.replace(/\s/g, '_');
    const visaType = beneficiaryInfo.visaType || 'O-1A';

    const documents = [
      {
        id: 'doc1',
        name: `${cleanName}_${visaType}_Evidence_Portfolio_and_Impact_Analysis.md`,
        content: result.document1,
        pageCount: Math.ceil(result.document1.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc2',
        name: `${cleanName}_${visaType}_Publications_and_Citations_Report.md`,
        content: result.document2,
        pageCount: Math.ceil(result.document2.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc3',
        name: `${cleanName}_${visaType}_Research_and_Source_Documentation.md`,
        content: result.document3,
        pageCount: Math.ceil(result.document3.length / 2500),
        timestamp: new Date(),
      },
      {
        id: 'doc4',
        name: `${cleanName}_${visaType}_Legal_Brief_and_Petition_Summary.md`,
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
    const petitionCase = await storage.getCase(caseId);
    if (petitionCase) {
      petitionCase.documents = documents;
      petitionCase.status = 'completed';
      petitionCase.completedAt = new Date();
      await storage.setCase(caseId, petitionCase);
    }

    // Send email
    await storage.setProgress(caseId, {
      stage: 'Sending Email',
      progress: 95,
      message: 'Sending documents to your email...',
      status: 'processing',
    });

    const emailSent = await sendDocumentsEmail(beneficiaryInfo, documents);

    // Update final progress
    await storage.setProgress(caseId, {
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

    await storage.setProgress(caseId, {
      stage: 'Error',
      progress: 0,
      message: 'An error occurred during generation',
      status: 'error',
      error: error.message,
    });

    const petitionCase = await storage.getCase(caseId);
    if (petitionCase) {
      petitionCase.status = 'error';
      petitionCase.error = error.message;
      await storage.setCase(caseId, petitionCase);
    }
  }
}
