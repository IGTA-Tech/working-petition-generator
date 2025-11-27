'use client';

import { useState, useEffect } from 'react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { BeneficiaryInfo, VisaType, UploadedFileData, UploadedFile } from './types';
import { FileText, Mail, User, Briefcase, Globe, Info, ArrowRight, ArrowLeft, Sparkles, CheckCircle, Upload as UploadIcon, Search, X } from 'lucide-react';
import GenerationProgress from './components/GenerationProgress';
import FileUpload from './components/FileUpload';

export default function Home() {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  // caseId will be generated when user starts submitting (not on mount)
  // This ensures the same caseId is used for file uploads AND document generation
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<string[] | null>(null);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  const [formData, setFormData] = useState<BeneficiaryInfo>({
    fullName: '',
    visaType: 'O-1A',
    fieldOfProfession: '',
    background: '',
    primaryUrls: [''],
    uploadedFiles: [],
    additionalInfo: '',
    recipientEmail: '',
    briefMode: 'comprehensive',
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
        // Generate caseId if not already present (file uploads might happen before submit)
        let currentCaseId = caseId;
        if (!currentCaseId) {
          currentCaseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          setCaseId(currentCaseId);
        }

        // Update status to uploading
        file.status = 'uploading';
        setUploadedFiles([...files]);

        // Create form data
        const formDataToUpload = new FormData();
        formDataToUpload.append('file', file.file);

        // Upload file with caseId
        const response = await fetch(`/api/upload?caseId=${currentCaseId}`, {
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

  const handleLookupBeneficiary = async () => {
    if (!formData.fullName || !formData.fieldOfProfession) {
      alert('Please enter the beneficiary name and field/profession first.');
      return;
    }

    setLookupLoading(true);
    setLookupResults(null);

    try {
      const response = await fetch('/api/lookup-beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          jobTitle: formData.fieldOfProfession,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLookupResults(data.urls);
        setShowLookupModal(true);
      } else {
        alert('Error looking up beneficiary: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error looking up beneficiary: ' + error);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddLookupUrls = () => {
    if (lookupResults && lookupResults.length > 0) {
      setFormData(prev => ({
        ...prev,
        primaryUrls: [...prev.primaryUrls.filter(u => u.trim()), ...lookupResults],
      }));
      setShowLookupModal(false);
      alert(`✓ ${lookupResults.length} URLs added from lookup!`);
    }
  };

  const handleGenerateBackground = async () => {
    // Get all URLs (from lookup results or manually entered)
    const allUrls = [...(lookupResults || []), ...formData.primaryUrls.filter(u => u.trim())];

    if (allUrls.length === 0) {
      alert('Please use the beneficiary lookup on Step 1 first, or add URLs manually on Step 3.');
      return;
    }

    setBackgroundLoading(true);

    try {
      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          jobTitle: formData.fieldOfProfession,
          fieldOfProfession: formData.fieldOfProfession,
          urls: allUrls.slice(0, 15), // Use top 15 URLs
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData(prev => ({
          ...prev,
          background: data.background,
        }));
        alert(`✓ Background generated! (${data.wordCount} words, ${data.charCount} characters)`);
      } else {
        alert('Error generating background: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error generating background: ' + error);
    } finally {
      setBackgroundLoading(false);
    }
  };

  const handleSubmit = async () => {
    setGenerating(true);

    // Generate caseId if not already present (from file uploads)
    let currentCaseId = caseId;
    if (!currentCaseId) {
      currentCaseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setCaseId(currentCaseId);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          caseId: currentCaseId, // Send the caseId to the server
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Server should return the same caseId we sent
        if (data.caseId !== currentCaseId) {
          console.warn('Server returned different caseId than expected!', {
            sent: currentCaseId,
            received: data.caseId,
          });
        }
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
        // URLs: Can proceed with 0 URLs (user can skip to upload documents later)
        // OR at least 3 URLs if providing any
        const urlCount = formData.primaryUrls.filter(url => url.trim()).length;
        return urlCount === 0 || urlCount >= 3;
      case 4:
        // Files step: At least 1 file if no URLs were provided
        const hasUrls = formData.primaryUrls.filter(url => url.trim()).length >= 3;
        const hasFiles = uploadedFiles.filter(f => f.status === 'success').length >= 1;
        return hasUrls || hasFiles;
      case 5:
        return formData.recipientEmail.includes('@');
      default:
        return false;
    }
  };

  if (generating) {
    return (
      <GenerationProgress
        caseId={caseId || 'generating'}
        beneficiaryName={formData.fullName}
        visaType={formData.visaType}
        fieldOfProfession={formData.fieldOfProfession}
        urls={formData.primaryUrls.filter(u => u.trim())}
        uploadedDocuments={formData.uploadedFiles}
      />
    );
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

              {/* AI-Powered Lookup */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-purple-900 mb-2">
                      🤖 AI-Powered Evidence Discovery
                    </h3>
                    <p className="text-sm text-purple-800 mb-4">
                      Let Claude AI search for online evidence about this beneficiary automatically.
                      We'll find news articles, publications, awards, and more - saving you hours of research!
                    </p>
                    <button
                      type="button"
                      onClick={handleLookupBeneficiary}
                      disabled={lookupLoading || !formData.fullName || !formData.fieldOfProfession}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {lookupLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search size={20} />
                          Look Up Beneficiary
                        </>
                      )}
                    </button>
                    {(!formData.fullName || !formData.fieldOfProfession) && (
                      <p className="text-xs text-purple-600 mt-2">
                        ↑ Fill in name and field first to enable lookup
                      </p>
                    )}
                  </div>
                </div>
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

              {/* AI Auto-Generate Background Button */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="text-purple-600 mt-1 flex-shrink-0" size={32} />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-purple-900 mb-2">
                      🤖 AI Auto-Generate Background
                    </h3>
                    <p className="text-sm text-purple-800 mb-4">
                      Let Claude AI write your detailed career background automatically using the URLs found from beneficiary lookup!
                      This will generate a comprehensive 300-500 word narrative with dates, achievements, rankings, and more.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateBackground}
                      disabled={backgroundLoading || (!lookupResults && formData.primaryUrls.filter(u => u.trim()).length === 0)}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {backgroundLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating Background...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Background from URLs
                        </>
                      )}
                    </button>
                    {!lookupResults && formData.primaryUrls.filter(u => u.trim()).length === 0 && (
                      <p className="text-xs text-purple-600 mt-2">
                        ↑ Use beneficiary lookup on Step 1 first, or add URLs on Step 3
                      </p>
                    )}
                  </div>
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
                  Paste Multiple URLs (any format)
                </label>
                <textarea
                  className="textarea-field"
                  rows={6}
                  placeholder="Paste URLs in any format:&#10;&#10;• One per line&#10;• Comma-separated&#10;• Space-separated&#10;• Mixed formats&#10;&#10;We'll automatically detect and validate them! (Max 40 URLs per paste)"
                  onPaste={(e) => {
                    // Get pasted text
                    const pastedText = e.clipboardData.getData('text');

                    // Extract URLs using regex (matches http:// or https:// URLs)
                    const urlRegex = /https?:\/\/[^\s,;]+/gi;
                    const detectedUrls = pastedText.match(urlRegex) || [];

                    if (detectedUrls.length > 0) {
                      // Validate URLs using URL constructor
                      const validUrls: string[] = [];
                      const existingUrls = formData.primaryUrls.filter(u => u.trim());

                      for (const url of detectedUrls) {
                        try {
                          // Quick format validation
                          new URL(url);

                          // Check for duplicates (case-insensitive)
                          const urlLower = url.toLowerCase();
                          const isDuplicate =
                            validUrls.some(v => v.toLowerCase() === urlLower) ||
                            existingUrls.some(e => e.toLowerCase() === urlLower);

                          if (!isDuplicate) {
                            validUrls.push(url);
                          }
                        } catch {
                          // Invalid URL format - skip it
                        }
                      }

                      // Enforce 40 URL per-paste limit
                      const urlsToAdd = validUrls.slice(0, 40);
                      const wasLimited = validUrls.length > 40;

                      if (urlsToAdd.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          primaryUrls: [...prev.primaryUrls.filter(u => u.trim()), ...urlsToAdd]
                        }));

                        // Show feedback
                        const duplicateCount = detectedUrls.length - validUrls.length;
                        const duplicateMsg = duplicateCount > 0 ? ` (${duplicateCount} duplicates removed)` : '';
                        const limitMsg = wasLimited ? ` ⚠️ Limited to 40 URLs` : '';
                        alert(`✓ ${urlsToAdd.length} URLs detected and added!${duplicateMsg}${limitMsg}`);

                        // Clear textarea
                        e.currentTarget.value = '';
                      } else {
                        alert('No new valid URLs found in pasted text. All were either duplicates or invalid.');
                      }

                      // Prevent default paste behavior
                      e.preventDefault();
                    }
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Smart detection:</strong> Paste URLs in any format - we'll find them automatically! Max 40 per paste.
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

              {/* Skip URLs Option */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-3">
                  <strong>Don't have URLs?</strong> You can skip this step if you plan to upload documents instead.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Clear URLs and move to next step
                    setFormData(prev => ({ ...prev, primaryUrls: [] }));
                    nextStep();
                  }}
                  className="btn-secondary w-full"
                >
                  Skip URLs - I'll Upload Documents Instead
                </button>
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
                maxFiles={30}
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
                  Petitioner Name (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.petitionerName || ''}
                  onChange={(e) => handleInputChange('petitionerName', e.target.value)}
                  placeholder="e.g., Innovative Global Talent Agency, ABC Corporation, or Individual Name"
                />
                <p className="text-sm text-gray-500 mt-1">
                  If known, provide the name of the petitioning organization or individual who will file this petition.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Itinerary / Work Schedule (Optional)
                </label>
                <textarea
                  className="textarea-field"
                  rows={4}
                  value={formData.itinerary || ''}
                  onChange={(e) => handleInputChange('itinerary', e.target.value)}
                  placeholder="Example:&#10;&#10;• January 2025: Training camp at XYZ Facility&#10;• March 2025: Competition at ABC Arena&#10;• June 2025-December 2025: Professional engagement with DEF Organization&#10;&#10;Or provide any planned U.S. activities, dates, locations, or work schedule."
                />
                <p className="text-sm text-gray-500 mt-1">
                  For O-1 and P-1 visas: Provide the intended U.S. work schedule or itinerary if known. This will be included in the petition documents.
                </p>
              </div>

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

              {/* Brief Generation Mode Selection */}
              <div className="border-2 border-primary-200 rounded-lg p-6 bg-gradient-to-r from-primary-50 to-purple-50">
                <label className="block text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-primary-600" />
                  Legal Brief Generation Mode *
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Mode */}
                  <button
                    type="button"
                    onClick={() => handleInputChange('briefMode', 'standard')}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      formData.briefMode === 'standard'
                        ? 'border-primary-600 bg-white shadow-lg ring-2 ring-primary-200'
                        : 'border-gray-300 bg-white hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">Standard Brief</h3>
                      {formData.briefMode === 'standard' && (
                        <CheckCircle size={24} className="text-primary-600" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 font-semibold">📄 ~15-25 pages (~10,000 words)</p>
                      <ul className="space-y-1 text-gray-600">
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Focused on 3-4 strongest criteria</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Concise legal arguments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Top 12-15 best exhibits analyzed</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Faster generation (~15-20 min)</span>
                        </li>
                      </ul>
                      <p className="text-gray-700 font-semibold mt-3">
                        💡 Best for: Obvious/strong cases with clear qualifications
                      </p>
                    </div>
                  </button>

                  {/* Comprehensive Mode */}
                  <button
                    type="button"
                    onClick={() => handleInputChange('briefMode', 'comprehensive')}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      formData.briefMode === 'comprehensive'
                        ? 'border-purple-600 bg-white shadow-lg ring-2 ring-purple-200'
                        : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">Comprehensive Brief</h3>
                      {formData.briefMode === 'comprehensive' && (
                        <CheckCircle size={24} className="text-purple-600" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 font-semibold">📚 ~40-80 pages (~20,000 words)</p>
                      <ul className="space-y-1 text-gray-600">
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>All 6 criteria analyzed in detail</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Extensive legal citations & arguments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>15-20+ exhibits with full analysis</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>✓</span>
                          <span>Detailed evidence index & scoring</span>
                        </li>
                      </ul>
                      <p className="text-gray-700 font-semibold mt-3">
                        💡 Best for: Complex/borderline cases, new fields, young beneficiaries
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>ℹ️ Smart Filtering:</strong> If Perplexity research discovers 40+ sources,
                    we'll automatically select the highest-quality Tier 1-2 evidence to keep your brief
                    focused and impactful.
                  </p>
                </div>
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

      {/* Lookup Results Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={32} />
                  <div>
                    <h2 className="text-2xl font-bold">Evidence Discovery Results</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Found {lookupResults?.length || 0} relevant sources for {formData.fullName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLookupModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {lookupResults && lookupResults.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-gray-700 mb-4">
                    <strong>Great news!</strong> We found the following sources about {formData.fullName}.
                    Review them below and click "Add All URLs" to include them in your petition.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800">
                      <strong>✓ {lookupResults.length} URLs discovered</strong> - These will be automatically added to Step 3 (Evidence URLs)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {lookupResults.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-400 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 break-all">{url}</p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Open in new tab →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="text-amber-600" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any credible online sources for <strong>{formData.fullName}</strong> in <strong>{formData.fieldOfProfession}</strong>.
                  </p>
                  <p className="text-sm text-gray-500">
                    Don't worry! You can still proceed by:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Manually adding URLs in Step 3</li>
                    <li>• Uploading documents in Step 4</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLookupModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                {lookupResults && lookupResults.length > 0 && (
                  <button
                    onClick={handleAddLookupUrls}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Add All {lookupResults.length} URLs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
