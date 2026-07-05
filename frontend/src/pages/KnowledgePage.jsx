/**
 * WHY this page exists:
 *   The Knowledge Base page — users upload PDFs, FAQs, and text to train their chatbot.
 *   The chatbot uses this content to answer questions in Phase 4 (OpenAI GPT-4o).
 *
 * HOW it differs from Next.js version:
 *   - Link from react-router-dom
 *   - No 'use client' directive
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Upload, Plus, FileText, MessageSquare, AlignLeft, Loader2, Bot, ListPlus, Zap, X } from 'lucide-react';
import DocumentTable from '@/components/knowledge/DocumentTable';
import { getChatbots } from '@/lib/chatbots';
import { getDocuments, uploadPdf, addFaq, addBulkFaqs, uploadBulkFaqFiles, addText, deleteDocument, retrainDocument } from '@/lib/knowledge';

const MAX_BULK_FAQ_FILES = 10;

const TABS = [
  { id: 'pdf',      label: 'Upload PDF',   icon: FileText },
  { id: 'faq',      label: 'Add FAQ',      icon: MessageSquare },
  { id: 'bulkFaq',  label: 'Bulk FAQ',     icon: ListPlus },
  { id: 'text',     label: 'Paste Text',   icon: AlignLeft },
];

const BULK_FAQ_PLACEHOLDER =
`What are your business hours? | We're open Monday-Friday, 9am-6pm EST.
Do you offer refunds? | Yes, within 30 days of purchase.
Do you deliver? | Yes, within a 5km radius.`;

export default function KnowledgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');
  const [pdfFile, setPdfFile] = useState(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [bulkFaqText, setBulkFaqText] = useState('');
  const [bulkFaqFiles, setBulkFaqFiles] = useState([]);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    getChatbots().then(data => {
      setChatbots(data || []);
      // Deep-link support: /knowledge?chatbotId=3 preselects that bot
      // (e.g. from the "Knowledge Base" link on a chatbot's edit page).
      const requested = searchParams.get('chatbotId');
      const requestedExists = requested && data?.some(bot => String(bot.id) === requested);
      if (requestedExists) {
        setSelectedChatbotId(requested);
      } else if (data?.length > 0) {
        setSelectedChatbotId(String(data[0].id));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChatbotChange = (id) => {
    setSelectedChatbotId(id);
    setSearchParams(id ? { chatbotId: id } : {});
  };

  const fetchDocs = useCallback(async () => {
    if (!selectedChatbotId) return;
    setDocsLoading(true);
    try {
      const data = await getDocuments(Number(selectedChatbotId));
      setDocuments(data || []);
      const hasProcessing = data?.some(d => d.status === 'PROCESSING');
      if (hasProcessing && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          const refreshed = await getDocuments(Number(selectedChatbotId));
          setDocuments(refreshed || []);
          if (!refreshed?.some(d => d.status === 'PROCESSING')) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }, 3000);
      } else if (!hasProcessing && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch { /* silent */ } finally {
      setDocsLoading(false);
    }
  }, [selectedChatbotId]);

  useEffect(() => {
    fetchDocs();
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [fetchDocs]);

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile || !selectedChatbotId) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      await uploadPdf(Number(selectedChatbotId), pdfFile);
      setPdfFile(null); e.target.reset();
      setUploadSuccess('PDF uploaded! Processing in background...');
      setTimeout(() => setUploadSuccess(''), 5000);
      fetchDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      await addFaq(Number(selectedChatbotId), faqQuestion, faqAnswer);
      setFaqQuestion(''); setFaqAnswer('');
      setUploadSuccess('FAQ added and processed!');
      setTimeout(() => setUploadSuccess(''), 4000);
      fetchDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to add FAQ.');
    } finally { setUploading(false); }
  };

  // Shared success message for both the paste and file-upload bulk paths —
  // the backend returns a single Document with totalPairs/skippedPairs set,
  // and processes the actual embedding in the background (large imports can
  // take a long time), so this reports what got queued, not what's finished.
  const describeBulkQueued = (doc) =>
    `${doc.totalPairs} FAQ pair${doc.totalPairs === 1 ? '' : 's'} queued for processing!` +
    (doc.skippedPairs > 0 ? ` ${doc.skippedPairs} line(s) skipped (missing "|" or empty question/answer).` : '') +
    ' Large imports process in the background — check the table below for progress.';

  const handleBulkFaqSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId || !bulkFaqText.trim()) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      const doc = await addBulkFaqs(Number(selectedChatbotId), bulkFaqText);
      setBulkFaqText('');
      setUploadSuccess(describeBulkQueued(doc));
      setTimeout(() => setUploadSuccess(''), 8000);
      fetchDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Bulk import failed. Please try again.');
    } finally { setUploading(false); }
  };

  const addBulkFaqFiles = (newFiles) => {
    setUploadError('');
    const combined = [...bulkFaqFiles, ...newFiles];
    if (combined.length > MAX_BULK_FAQ_FILES) {
      setUploadError(`Max ${MAX_BULK_FAQ_FILES} files per upload — only the first ${MAX_BULK_FAQ_FILES} were kept.`);
    }
    setBulkFaqFiles(combined.slice(0, MAX_BULK_FAQ_FILES));
  };

  const removeBulkFaqFile = (index) => {
    setBulkFaqFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkFaqFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId || bulkFaqFiles.length === 0) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      const docs = await uploadBulkFaqFiles(Number(selectedChatbotId), bulkFaqFiles);
      const totalPairs = docs.reduce((sum, d) => sum + (d.totalPairs || 0), 0);
      const totalSkipped = docs.reduce((sum, d) => sum + (d.skippedPairs || 0), 0);
      setBulkFaqFiles([]);
      setUploadSuccess(
        `${docs.length} file${docs.length === 1 ? '' : 's'} uploaded, ${totalPairs} FAQ pair${totalPairs === 1 ? '' : 's'} queued for processing!` +
        (totalSkipped > 0 ? ` ${totalSkipped} line(s) skipped across all files.` : '') +
        ' Large imports process in the background — check the table below for progress.'
      );
      setTimeout(() => setUploadSuccess(''), 8000);
      fetchDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'File import failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId) return;
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      await addText(Number(selectedChatbotId), textTitle, textContent);
      setTextTitle(''); setTextContent('');
      setUploadSuccess('Text content added! Processing in background...');
      setTimeout(() => setUploadSuccess(''), 5000);
      fetchDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to add text.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch { alert('Failed to delete.'); }
  };

  const handleRetrain = async (id) => {
    try {
      const updated = await retrainDocument(id);
      setDocuments(prev => prev.map(d => d.id === id ? updated : d));
      fetchDocs();
    } catch { alert('Failed to retrain.'); }
  };

  if (chatbots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bot className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No chatbots yet</h3>
        <p className="text-sm text-gray-500 mb-4">Create a chatbot first, then add knowledge to it.</p>
        <Link to="/chatbots/new" className="btn-primary">Create a Chatbot</Link>
      </div>
    );
  }

  const hasProcessing = documents.some(d => d.status === 'PROCESSING');

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
          <p className="text-sm text-gray-500 mt-0.5">Train your chatbot by adding documents, FAQs, and text content</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Chatbot:</label>
          <select value={selectedChatbotId} onChange={e => handleChatbotChange(e.target.value)} className="input-field w-48">
            {chatbots.map(bot => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'text-brand-600 border-b-2 border-brand-600 -mb-px' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {uploadError  && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{uploadError}</div>}
          {uploadSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{uploadSuccess}</div>}

          {activeTab === 'pdf' && (
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select PDF file (max 20 MB)</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('pdfInput').click()}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {pdfFile ? (
                    <div>
                      <p className="text-sm font-medium text-brand-700">{pdfFile.name}</p>
                      <p className="text-xs text-gray-400">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF files only · Max 20 MB</p>
                    </div>
                  )}
                  <input id="pdfInput" type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files[0] || null)} />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={uploading || !pdfFile} className="btn-primary flex items-center gap-2">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload PDF</>}
                </button>
              </div>
              <p className="text-xs text-gray-400">After upload, text extraction and embedding happen in the background (10–30 seconds for large PDFs).</p>
            </form>
          )}

          {activeTab === 'faq' && (
            <form onSubmit={handleFaqSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question <span className="text-red-500">*</span></label>
                <input type="text" value={faqQuestion} onChange={e => setFaqQuestion(e.target.value)} placeholder="e.g., What are your business hours?" required maxLength={500} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer <span className="text-red-500">*</span></label>
                <textarea value={faqAnswer} onChange={e => setFaqAnswer(e.target.value)} placeholder="e.g., We're open Monday–Friday, 9am–6pm EST." required rows={4} maxLength={3000} className="input-field resize-none" />
                <p className="text-xs text-gray-400 mt-1">{faqAnswer.length}/3000</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Add FAQ</>}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'bulkFaq' && (
            <div className="space-y-6">
              <div className="flex items-start gap-2 p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-700">
                <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Train on many questions at once for instant replies — each pair gets its own
                  quick-answer entry, so matching visitor questions skip AI generation entirely and
                  reply immediately. Supports up to <strong>50,000 pairs</strong> per import. Large
                  imports process in the background — you can navigate away and check progress later.
                </p>
              </div>

              {/* Option A: upload up to 10 files at once */}
              <form onSubmit={handleBulkFaqFileUpload} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Upload up to {MAX_BULK_FAQ_FILES} .txt or .pdf files <span className="text-gray-400 font-normal">(same "question | answer" per line format)</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('bulkFaqFileInput').click()}
                >
                  <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Click to select files or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-1">.txt or .pdf · Max 25 MB each · up to {MAX_BULK_FAQ_FILES} files · 50,000 pairs per file</p>
                  <input id="bulkFaqFileInput" type="file" accept=".txt,.pdf" multiple className="hidden"
                    onChange={e => { addBulkFaqFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                </div>

                {bulkFaqFiles.length > 0 && (
                  <ul className="space-y-1.5">
                    {bulkFaqFiles.map((file, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className="text-gray-700 truncate">{file.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button type="button" onClick={() => removeBulkFaqFile(i)} className="text-gray-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex justify-end">
                  <button type="submit" disabled={uploading || bulkFaqFiles.length === 0} className="btn-primary flex items-center gap-2">
                    {uploading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>
                      : <><Upload className="w-4 h-4" />Upload {bulkFaqFiles.length > 0 ? `${bulkFaqFiles.length} file${bulkFaqFiles.length === 1 ? '' : 's'}` : ''}</>}
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR PASTE DIRECTLY</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Option B: paste directly */}
              <form onSubmit={handleBulkFaqSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    One pair per line: <span className="font-mono text-brand-700">question | answer</span>
                  </label>
                  <textarea
                    value={bulkFaqText}
                    onChange={e => setBulkFaqText(e.target.value)}
                    placeholder={BULK_FAQ_PLACEHOLDER}
                    rows={8}
                    className="input-field resize-none font-mono text-xs"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {bulkFaqText.split('\n').filter(l => l.includes('|') && l.trim().length > 0).length} pair(s) detected · max 50,000 per import
                  </p>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={uploading || !bulkFaqText.trim()} className="btn-primary flex items-center gap-2">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</> : <><ListPlus className="w-4 h-4" />Import FAQs</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="e.g., Refund Policy, Product Description" required maxLength={255} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
                <textarea value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Paste your text content here..." required rows={8} minLength={10} maxLength={50000} className="input-field resize-none" />
                <p className="text-xs text-gray-400 mt-1">{textContent.length}/50,000</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Add Text</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Knowledge Base Documents</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {documents.filter(d => d.status === 'READY').length} of {documents.length} documents ready
            </p>
          </div>
          {hasProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </div>
          )}
        </div>
        <div className="p-0">
          {docsLoading
            ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            : <DocumentTable documents={documents} onDelete={handleDelete} onRetrain={handleRetrain} />
          }
        </div>
      </div>
    </div>
  );
}
