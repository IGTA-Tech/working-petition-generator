import sgMail from '@sendgrid/mail';
import { BeneficiaryInfo } from '../types';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendDocumentsEmail(
  beneficiaryInfo: BeneficiaryInfo,
  documents: Array<{ name: string; content: string; pageCount: number }>
): Promise<boolean> {
  try {
    const attachments = documents.map((doc) => ({
      content: Buffer.from(doc.content).toString('base64'),
      filename: doc.name,
      type: 'text/markdown',
      disposition: 'attachment',
    }));

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background: #f9fafb; }
    .document { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
    h3 { color: #1f2937; margin-top: 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 Visa Petition Documents Ready</h1>
    <p style="font-size: 1.2em; margin: 10px 0 0 0;">Generated for: ${beneficiaryInfo.fullName}</p>
    <p style="margin: 5px 0 0 0;">Visa Type: ${beneficiaryInfo.visaType}</p>
  </div>

  <div class="content">
    <h2>Your Complete ${beneficiaryInfo.visaType} Visa Petition Package</h2>
    <p>Hello,</p>
    <p>Your comprehensive visa petition documentation has been successfully generated using AI analysis of your credentials and our extensive immigration law knowledge base.</p>

    <div class="document">
      <h3>📄 Document 1: Comprehensive Analysis</h3>
      <p><strong>75+ pages</strong> - Complete criterion-by-criterion evaluation with:</p>
      <ul>
        <li>Evidence scoring and weighting</li>
        <li>Approval probability assessment</li>
        <li>Strengths and weaknesses analysis</li>
        <li>Specific recommendations</li>
      </ul>
    </div>

    <div class="document">
      <h3>📊 Document 2: Publication Significance Analysis</h3>
      <p><strong>40+ pages</strong> - Detailed assessment including:</p>
      <ul>
        <li>Every media mention analyzed</li>
        <li>Circulation and reach data</li>
        <li>Editorial standards evaluation</li>
        <li>Aggregate impact analysis</li>
      </ul>
    </div>

    <div class="document">
      <h3>🔗 Document 3: URL Reference Document</h3>
      <p>Organized reference list featuring:</p>
      <ul>
        <li>All evidence sources by criterion</li>
        <li>Complete verified links</li>
        <li>Quality indicators</li>
        <li>Easy exhibit organization</li>
      </ul>
    </div>

    <div class="document">
      <h3>⚖️ Document 4: Legal Brief</h3>
      <p><strong>30+ pages</strong> - Professional petition brief with:</p>
      <ul>
        <li>USCIS-ready format</li>
        <li>Detailed legal arguments</li>
        <li>Exhibit organization guide</li>
        <li>Executive summary</li>
      </ul>
    </div>

    <h3>📎 Documents Attached</h3>
    <p>All four documents are attached to this email. You can:</p>
    <ul>
      <li>Review each document thoroughly</li>
      <li>Share with your immigration attorney</li>
      <li>Copy into Word/Google Docs for formatting</li>
      <li>Use as foundation for USCIS petition</li>
    </ul>

    <h3>⚠️ IMPORTANT: Next Steps</h3>
    <ol>
      <li><strong>Attorney Review Required</strong>: These are AI-generated drafts. Have a qualified immigration attorney review all documents before submission.</li>
      <li><strong>Gather Additional Evidence</strong>: Review recommendations in Document 1 for strengthening your case.</li>
      <li><strong>Address Weaknesses</strong>: Note any gaps identified in the comprehensive analysis.</li>
      <li><strong>Prepare Exhibits</strong>: Use Document 3 as your guide for organizing evidence.</li>
      <li><strong>Verify Current Information</strong>: Ensure all facts and URLs are still accurate.</li>
    </ol>

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #92400e;">⚖️ Legal Disclaimer</h3>
      <p style="color: #92400e; margin: 0;"><strong>Important:</strong> These documents are AI-assisted drafts for petition preparation. They are NOT legal advice and should ALWAYS be reviewed by a qualified immigration attorney before submission to USCIS. Success of your petition depends on many factors including proper evidence collection, presentation, and compliance with current USCIS policies.</p>
    </div>
  </div>

  <div class="footer">
    <p><strong>Innovative Automations - Visa Petition Document Generator</strong></p>
    <p>Specialized in O-1A, O-1B, P-1A, and EB-1A Visa Petitions</p>
    <p style="margin-top: 15px;">© 2025 Innovative Automations. All rights reserved.</p>
    <p style="margin-top: 10px;">
      Questions? Reply to this email or contact us at
      <a href="mailto:info@innovativeglobaltalent.com" style="color: #93c5fd; text-decoration: none;">info@innovativeglobaltalent.com</a>
    </p>
    <p style="margin-top: 5px; font-size: 0.9em;">Powered by Claude AI</p>
  </div>
</body>
</html>`;

    const msg = {
      to: beneficiaryInfo.recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'applications@innovativeautomations.dev',
      replyTo: process.env.SENDGRID_REPLY_TO_EMAIL || 'info@innovativeglobaltalent.com',
      subject: `Your ${beneficiaryInfo.visaType} Visa Petition Documents - ${beneficiaryInfo.fullName}`,
      html: emailHtml,
      attachments,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
