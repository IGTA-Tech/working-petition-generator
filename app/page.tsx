'use client';

import { useState } from 'react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { BeneficiaryInfo, VisaType, UploadedFileData } from './types';
import { FileText, Mail, User, Briefcase, Globe, Info, ArrowRight, ArrowLeft, Sparkles, CheckCircle, Upload as UploadIcon } from 'lucide-react';
import GenerationProgress from './components/GenerationProgress';
import FileUpload, { UploadedFile } from './components/FileUpload';

export default function Home() {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BeneficiaryInfo>({
    fullName: '',
    visaType: 'O-1A',
    fieldOfProfession: '',
    background: '',
    primaryUrls: [''],
    uploadedFiles: [],
    additionalInfo: '',
    recipientEmail: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const totalSteps = 5; // Increased to 5 steps (added file upload)

  const handleInputChange = (field: keyof BeneficiaryInfo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.primaryUrls];
    newUrls[index] = value;
    setFormData(prev => ({ ...prev, primaryUrls: newUrls }));
  };

  const addUrlField = () => {
    setFormData(prev => ({ ...prev, primaryUrls: [...prev.primaryUrls, ''] }));
  };

  const removeUrlField = (index: number) => {
    const newUrls = formData.primaryUrls.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, primaryUrls: newUrls }));
  };

  const handleFilesChange = async (files: UploadedFile[]) => {
    setUploadedFiles(files);

    // Upload files that are pending
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const file of pendingFiles) {
      try {
        // Update status to uploading
        file.status = 'uploading';
        setUploadedFiles([...files]);

        // Create form data
        const formDataToUpload = new FormData();
        formDataToUpload.append('file', file.file);

        // Upload file
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToUpload,
        });

        if (response.ok) {
          const data = await response.json();
          file.status = 'success';
          file.blobUrl = data.blob.url;
          file.extractedText = data.processed.summary;

          // Add to form data
          const uploadedFileData: UploadedFileData = {
            fileName: data.processed.fileName,
            fileType: data.processed.fileType,
            blobUrl: data.blob.url,
            wordCount: data.processed.wordCount,
            pageCount: data.processed.pageCount,
            summary: data.processed.summary,
          };

          setFormData(prev => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles, uploadedFileData],
          }));
        } else {
          file.status = 'error';
        }

        setUploadedFiles([...files]);
      } catch (error) {
        file.status = 'error';
        setUploadedFiles([...files]);
      }
    }
  };

  const handleSubmit = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setCaseId(data.caseId);
      } else {
        alert('Error: ' + data.error);
        setGenerating(false);
      }
    } catch (error) {
      alert('Error generating documents: ' + error);
      setGenerating(false);
    }
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName && formData.visaType && formData.fieldOfProfession;
      case 2:
        return formData.background.length > 100;
      case 3:
        // URLs: At least 3 URLs OR at least 1 uploaded file
        const hasUrls = formData.primaryUrls.filter(url => url.trim()).length >= 3;
        const hasFiles = uploadedFiles.filter(f => f.status === 'success').length >= 1;
        return hasUrls || hasFiles;
      case 4:
        // Files step is optional - can always proceed
        return true;
      case 5:
        return formData.recipientEmail.includes('@');
      default:
        return false;
    }
  };

  if (generating) {
    return <GenerationProgress caseId={caseId || 'generating'} />;
  }

  return (
    <div className="min-h-screen gradient-bg py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText size={48} />
            <h1 className="text-5xl font-bold">Visa Petition Generator</h1>
          </div>
          <p className="text-xl text-blue-100">
            AI-Powered Document Generation for O-1A, O-1B, P-1A & EB-1A Visas
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    s === step
                      ? 'bg-primary-600 text-white scale-110'
                      : s < step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s < step ? <CheckCircle size={20} /> : s}
                </div>
                {s < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span className={step === 1 ? 'font-bold text-primary-600' : ''}>Basic Info</span>
            <span className={step === 2 ? 'font-bold text-primary-600' : ''}>Background</span>
            <span className={step === 3 ? 'font-bold text-primary-600' : ''}>URLs</span>
            <span className={step === 4 ? 'font-bold text-primary-600' : ''}>Documents</span>
            <span className={step === 5 ? 'font-bold text-primary-600' : ''}>Review</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="text-primary-600" />
                Basic Information
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="e.g., John Michael Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Visa Type *
                </label>
                <select
                  className="input-field"
                  value={formData.visaType}
                  onChange={(e) => handleInputChange('visaType', e.target.value as VisaType)}
                >
                  <option value="O-1A">O-1A - Extraordinary Ability (Sciences, Business, Education, Athletics)</option>
                  <option value="O-1B">O-1B - Extraordinary Ability (Arts, Motion Picture, TV)</option>
                  <option value="P-1A">P-1A - Internationally Recognized Athlete</option>
                  <option value="EB-1A">EB-1A - Extraordinary Ability (Green Card)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Field/Profession *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.fieldOfProfession}
                  onChange={(e) => handleInputChange('fieldOfProfession', e.target.value)}
                  placeholder="e.g., Professional Mixed Martial Arts, AI Research, Film Director"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Make sure the visa type matches your profession and achievements.
                  O-1A is for sciences/business/athletics, O-1B is for arts/entertainment, P-1A is for athletes,
                  and EB-1A is for permanent residence (green card).
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Background */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="text-primary-600" />
                Career Background
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Detailed Background Information * (Minimum 100 characters)
                </label>
                <textarea
                  className="textarea-field"
                  rows={12}
                  value={formData.background}
                  onChange={(e) => handleInputChange('background', e.target.value)}
                  placeholder="Provide comprehensive details including:&#10;&#10;• Career history and timeline&#10;• Major achievements and accomplishments&#10;• Training, education, and certifications&#10;• Awards and recognitions&#10;• Current activities and role&#10;• Notable competitions, performances, or projects&#10;• Goals and plans for US entry&#10;• Any unique or extraordinary aspects of your career&#10;&#10;The more detail you provide, the better the generated documents will be."
                />
                <div className="text-sm text-gray-500 mt-2">
                  {formData.background.length} / 100 characters minimum
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Tip:</strong> Be specific! Include dates, numbers, rankings, names of organizations,
                  and quantifiable achievements. This information will be used to generate your comprehensive
                  analysis and legal brief.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: URLs */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="text-primary-600" />
                Evidence URLs
              </h2>

              <p className="text-gray-600">
                Provide URLs to online evidence of your achievements. These will be analyzed to extract
                information for your petition documents.
              </p>

              {/* Bulk URL Paste */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paste Multiple URLs (one per line)
                </label>
                <textarea
                  className="textarea-field"
                  rows={6}
                  placeholder="Paste multiple URLs here, one per line:&#10;https://www.example.com/article-1&#10;https://www.example.com/article-2&#10;https://www.example.com/article-3"
                  onBlur={(e) => {
                    const urls = e.target.value
                      .split('\n')
                      .map(u => u.trim())
                      .filter(u => u.length > 0);

                    if (urls.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        primaryUrls: [...prev.primaryUrls.filter(u => u.trim()), ...urls]
                      }));
                      e.target.value = '';
                    }
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Paste URLs here (one per line) and they'll be automatically added below
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Individual URLs (Minimum 3 total)
                </label>
                <div className="space-y-3">
                  {formData.primaryUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        className="input-field"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        placeholder="https://www.example.com/article-about-you"
                      />
                      {formData.primaryUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrlField(index)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addUrlField}
                  className="btn-secondary w-full mt-3"
                >
                  + Add Another URL
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Examples of good URLs:</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>News articles and media coverage</li>
                    <li>Wikipedia or other encyclopedia entries</li>
                    <li>Official competition/tournament results</li>
                    <li>Academic publications or citations</li>
                    <li>Professional organization profiles</li>
                    <li>Award announcements and recognitions</li>
                    <li>Industry rankings or statistics</li>
                  </ul>
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Document Upload */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UploadIcon className="text-primary-600" />
                Upload Evidence Documents
              </h2>

              <p className="text-gray-600">
                Upload supporting documents such as resumes, awards, publications, media coverage,
                letters of recommendation, or any other evidence that supports your petition.
              </p>

              <FileUpload
                onFilesChange={handleFilesChange}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Accepted file types:</strong> PDF, DOCX, DOC, JPG, PNG, TXT (max 50MB each)
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Note:</strong> File upload is optional. You can skip this step if you've already
                  provided sufficient URLs, or continue to the next step to add more information.
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ <strong>{uploadedFiles.filter(f => f.status === 'success').length} file(s) uploaded successfully</strong>
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Total content: {formData.uploadedFiles.reduce((sum, f) => sum + f.wordCount, 0).toLocaleString()} words extracted
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Additional Info & Email */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Info className="text-primary-600" />
                Additional Information & Delivery
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Information (Optional)
                </label>
                <textarea
                  className="textarea-field"
                  rows={6}
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any additional context that might be helpful:&#10;&#10;• Training facilities or institutions&#10;• Notable coaches, mentors, or collaborators&#10;• Professional affiliations&#10;• Specific rankings or statistics&#10;• Upcoming projects or opportunities in the US"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={18} />
                  Email Address * (Where to send completed documents)
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.recipientEmail}
                  onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-900 mb-2">📋 What You'll Receive:</h3>
                <ul className="text-sm text-purple-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Document 1:</strong> Comprehensive Analysis (75+ pages) - Complete criterion-by-criterion evaluation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Document 2:</strong> Publication Significance Analysis (40+ pages) - Media coverage assessment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Document 3:</strong> URL Reference Document - Organized evidence sources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Document 4:</strong> Legal Brief (30+ pages) - USCIS-ready petition brief</span>
                  </li>
                </ul>
                <p className="text-sm text-purple-800 mt-3 font-semibold">
                  ⏱️ Estimated generation time: 15-30 minutes
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Legal Disclaimer:</strong> These documents are AI-assisted drafts for petition preparation.
                  They are NOT legal advice and should ALWAYS be reviewed by a qualified immigration attorney before
                  submission to USCIS.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-0 disabled:cursor-default"
            >
              <ArrowLeft size={20} />
              Previous
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="btn-primary flex items-center gap-2"
              >
                Next
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || generating}
                className="btn-primary flex items-center gap-2"
              >
                <Sparkles size={20} />
                Generate Documents
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white text-sm">
          <p>© 2025 Visa Petition Document Generator. Powered by Claude AI.</p>
        </div>
      </div>
    </div>
  );
}
