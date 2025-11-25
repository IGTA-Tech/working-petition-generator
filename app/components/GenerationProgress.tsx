'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, Mail, Download, AlertCircle } from 'lucide-react';

interface GenerationProgressProps {
  caseId: string;
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

export default function GenerationProgress({ caseId }: GenerationProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData>({
    stage: 'Initializing',
    progress: 0,
    message: 'Starting document generation...',
    status: 'processing',
  });

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

  if (progressData.status === 'completed') {
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
