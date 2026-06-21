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
import { Link } from 'react-router-dom';
import { Upload, Plus, FileText, MessageSquare, AlignLeft, Loader2, Bot } from 'lucide-react';
import DocumentTable from '@/components/knowledge/DocumentTable';
import { getChatbots } from '@/lib/chatbots';
import { getDocuments, uploadPdf, addFaq, addText, deleteDocument, retrainDocument } from '@/lib/knowledge';

const TABS = [
  { id: 'pdf',  label: 'Upload PDF',  icon: FileText },
  { id: 'faq',  label: 'Add FAQ',     icon: MessageSquare },
  { id: 'text', label: 'Paste Text',  icon: AlignLeft },
];

export default function KnowledgePage() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');
  const [pdfFile, setPdfFile] = useState(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    getChatbots().then(data => {
      setChatbots(data || []);
      if (data?.length > 0) setSelectedChatbotId(String(data[0].id));
    }).catch(() => {});
  }, []);

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
          <select value={selectedChatbotId} onChange={e => setSelectedChatbotId(e.target.value)} className="input-field w-48">
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
