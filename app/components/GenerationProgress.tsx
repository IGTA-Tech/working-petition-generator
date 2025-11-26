'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, Mail, Download, AlertCircle, FileStack } from 'lucide-react';

interface UploadedDocument {
  fileName: string;
  fileType: string;
  blobUrl: string;
  summary: string;
  pageCount?: number;
}

interface GenerationProgressProps {
  caseId: string;
  beneficiaryName?: string;
  visaType?: string;
  fieldOfProfession?: string;
  urls?: string[];
  uploadedDocuments?: UploadedDocument[];
}

interface ProgressData {
  stage: string;
  progress: number;
  message: string;
  currentDocument?: string;
  status: 'processing' | 'completed' | 'error';
  documents?: any[];
  error?: string;
}

export default function GenerationProgress({ caseId, beneficiaryName, visaType, fieldOfProfession, urls, uploadedDocuments }: GenerationProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData>({
    stage: 'Initializing',
    progress: 0,
    message: 'Starting document generation...',
    status: 'processing',
  });
  const [generatingExhibits, setGeneratingExhibits] = useState(false);
  const [exhibitProgress, setExhibitProgress] = useState<string>('');
  const [exhibitDownloadUrl, setExhibitDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    // If no caseId yet, don't start polling
    if (!caseId || caseId === 'generating') {
      return;
    }

    const pollProgress = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${caseId}`);
        const data = await response.json();
        setProgressData(data);

        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(pollProgress);
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 2000);

    return () => clearInterval(pollProgress);
  }, [caseId]);

  if (progressData.status === 'error') {
    return (
      <div className="min-h-screen gradient-bg py-12 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generation Failed</h2>
            <p className="text-gray-600 mb-6">{progressData.error || 'An unknown error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerateExhibits = async () => {
    const hasUrls = urls && urls.length > 0;
    const hasDocs = uploadedDocuments && uploadedDocuments.length > 0;

    if (!hasUrls && !hasDocs) {
      alert('No URLs or documents available to generate exhibits');
      return;
    }

    if (!beneficiaryName) {
      alert('Beneficiary name is required');
      return;
    }

    setGeneratingExhibits(true);
    setExhibitProgress('Starting exhibit generation...');

    try {
      const response = await fetch('/api/generate-exhibits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urls?.filter(u => u.trim()) || [],
          uploadedDocuments: uploadedDocuments || [],
          beneficiaryName,
          visaType: visaType || 'O-1A',
          fieldOfProfession: fieldOfProfession || 'Not specified',
          caseId: caseId || 'temp',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExhibitProgress(`Success! Generated ${data.results.converted} exhibits organized by criterion. Cost: $${data.results.estimatedCost.toFixed(2)}`);
        setExhibitDownloadUrl(data.results.combinedPdfUrl);
      } else {
        setExhibitProgress(`Error: ${data.error || 'Failed to generate exhibits'}`);
        if (data.details) {
          alert(data.details);
        }
      }
    } catch (error) {
      setExhibitProgress(`Error: ${error}`);
    } finally {
      setGeneratingExhibits(false);
    }
  };

  if (progressData.status === 'completed') {
    const hasUrls = urls && urls.filter(u => u.trim()).length > 0;
    const hasDocs = uploadedDocuments && uploadedDocuments.length > 0;
    const totalEvidence = (urls?.filter(u => u.trim()).length || 0) + (uploadedDocuments?.length || 0);

    return (
      <div className="min-h-screen gradient-bg py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Documents Ready!</h2>
              <p className="text-gray-600">
                Your visa petition documents have been generated and emailed to you.
              </p>
            </div>

            <div className="space-y-4">
              {progressData.documents?.map((doc: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="text-primary-600" size={24} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-500">{doc.pageCount}+ pages</p>
                    </div>
                  </div>
                  {caseId && caseId !== 'generating' ? (
                    <a
                      href={`/api/download/${caseId}/${index}`}
                      download={doc.name}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Download size={18} />
                      Download
                    </a>
                  ) : (
                    <div className="text-sm text-gray-500">Processing...</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="text-blue-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Email Sent!</h3>
                  <p className="text-sm text-blue-800">
                    All documents have been sent to your email address. Check your inbox (and spam folder).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Next Steps:</h3>
              <ol className="list-decimal ml-5 text-sm text-yellow-800 space-y-1">
                <li>Review all documents thoroughly</li>
                <li>Have a qualified immigration attorney review before submission</li>
                <li>Gather physical copies of all evidence referenced</li>
                <li>Address any weaknesses identified in the comprehensive analysis</li>
                <li>Verify all information is current and accurate</li>
              </ol>
            </div>

            {(hasUrls || hasDocs) && (
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl">
                <div className="flex items-start gap-4">
                  <FileStack className="text-purple-600 mt-1 flex-shrink-0" size={32} />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-purple-900 mb-2">
                      📎 Generate PDF Exhibits (Optional)
                    </h3>
                    <p className="text-sm text-purple-800 mb-4">
                      Automatically convert your evidence ({urls?.filter(u => u.trim()).length || 0} URLs + {uploadedDocuments?.length || 0} documents) into professionally formatted PDF exhibits with:
                    </p>
                    <ul className="text-sm text-purple-700 space-y-1 mb-4 ml-4">
                      <li>• Cover sheets with exhibit numbering and metadata</li>
                      <li>• Archive.org permanent archival links</li>
                      <li>• Organized by criterion (for EB-1A)</li>
                      <li>• USCIS-ready formatting</li>
                    </ul>

                    {!generatingExhibits && !exhibitDownloadUrl && (
                      <div className="space-y-2">
                        <button
                          onClick={handleGenerateExhibits}
                          className="btn-primary flex items-center gap-2"
                        >
                          <FileStack size={18} />
                          Generate PDF Exhibits
                        </button>
                        <p className="text-xs text-purple-600">
                          Estimated cost: ${(urls?.filter(u => u.trim()).length || 0) * 0.097} (via API2PDF)
                        </p>
                      </div>
                    )}

                    {generatingExhibits && (
                      <div className="p-4 bg-white border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-purple-900">{exhibitProgress}</p>
                        </div>
                      </div>
                    )}

                    {exhibitDownloadUrl && (
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-900 mb-2">✅ {exhibitProgress}</p>
                        </div>
                        <a
                          href={exhibitDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary flex items-center gap-2 justify-center"
                        >
                          <Download size={18} />
                          Download Complete Exhibits PDF
                        </a>
                        <p className="text-xs text-center text-purple-600">
                          Includes exhibit list + all evidence organized by criterion
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Generate Another Petition
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing view
  return (
    <div className="min-h-screen gradient-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Clock className="mx-auto mb-4 text-primary-600 animate-spin" size={64} />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Generating Your Documents</h2>
            <p className="text-gray-600">
              This may take 15-30 minutes. Please keep this window open.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">{progressData.stage}</span>
              <span className="text-gray-500">{progressData.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressData.progress}%` }}
              />
            </div>
          </div>

          {/* Current Message */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <p className="text-blue-900">{progressData.message}</p>
            {progressData.currentDocument && (
              <p className="text-sm text-blue-700 mt-1">
                Current: <strong>{progressData.currentDocument}</strong>
              </p>
            )}
          </div>

          {/* Stage Checklist */}
          <div className="space-y-3">
            {[
              { name: 'Reading Knowledge Base', stage: 'knowledge' },
              { name: 'Analyzing URLs', stage: 'urls' },
              { name: 'Generating Comprehensive Analysis', stage: 'doc1' },
              { name: 'Generating Publication Analysis', stage: 'doc2' },
              { name: 'Generating URL Reference', stage: 'doc3' },
              { name: 'Generating Legal Brief', stage: 'doc4' },
              { name: 'Sending Email', stage: 'email' },
            ].map((item, index) => {
              const completed = progressData.progress > (index / 7) * 100;
              const current = progressData.stage.toLowerCase().includes(item.stage);

              return (
                <div
                  key={item.stage}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    current ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                  }`}
                >
                  {completed ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : current ? (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className={`${current ? 'font-semibold text-primary-900' : 'text-gray-600'}`}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {caseId && caseId !== 'generating' && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Case ID: {caseId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
