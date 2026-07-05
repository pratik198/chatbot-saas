/**
 * KnowledgePage — train a chatbot via PDF / FAQ / bulk FAQ / text.
 *
 * ALL data logic is preserved from the original: chatbot deep-linking,
 * PROCESSING polling, single & bulk FAQ, multi-file upload, retrain, delete.
 * Presentation rebuilt on the design system: real drag & drop, tabs, toasts,
 * and a styled confirm dialog for deletes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Upload, Plus, FileText, MessageSquare, AlignLeft, Loader2, Bot, ListPlus, Zap, X, Database, FileUp,
} from 'lucide-react';
import DocumentTable from '@/components/knowledge/DocumentTable';
import { Dropzone } from '@/components/knowledge/Dropzone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import { getChatbots } from '@/lib/chatbots';
import { getDocuments, uploadPdf, addFaq, addBulkFaqs, uploadBulkFaqFiles, addText, deleteDocument, retrainDocument } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const MAX_BULK_FAQ_FILES = 10;

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
  const [pendingDelete, setPendingDelete] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    getChatbots().then((data) => {
      setChatbots(data || []);
      const requested = searchParams.get('chatbotId');
      const requestedExists = requested && data?.some((bot) => String(bot.id) === requested);
      if (requestedExists) setSelectedChatbotId(requested);
      else if (data?.length > 0) setSelectedChatbotId(String(data[0].id));
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
      const hasProcessing = data?.some((d) => d.status === 'PROCESSING');
      if (hasProcessing && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          const refreshed = await getDocuments(Number(selectedChatbotId));
          setDocuments(refreshed || []);
          if (!refreshed?.some((d) => d.status === 'PROCESSING')) {
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
    setUploading(true);
    try {
      await uploadPdf(Number(selectedChatbotId), pdfFile);
      setPdfFile(null);
      toast.success('PDF uploaded! Processing in the background…');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId) return;
    setUploading(true);
    try {
      await addFaq(Number(selectedChatbotId), faqQuestion, faqAnswer);
      setFaqQuestion(''); setFaqAnswer('');
      toast.success('FAQ added and processed!');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add FAQ.');
    } finally { setUploading(false); }
  };

  const describeBulkQueued = (doc) =>
    `${doc.totalPairs} FAQ pair${doc.totalPairs === 1 ? '' : 's'} queued` +
    (doc.skippedPairs > 0 ? ` · ${doc.skippedPairs} line(s) skipped (missing "|").` : '.');

  const handleBulkFaqSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId || !bulkFaqText.trim()) return;
    setUploading(true);
    try {
      const doc = await addBulkFaqs(Number(selectedChatbotId), bulkFaqText);
      setBulkFaqText('');
      toast.success(describeBulkQueued(doc), { description: 'Large imports process in the background — watch progress below.' });
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed. Please try again.');
    } finally { setUploading(false); }
  };

  const addBulkFaqFiles = (newFiles) => {
    const combined = [...bulkFaqFiles, ...newFiles];
    if (combined.length > MAX_BULK_FAQ_FILES) {
      toast.warning(`Max ${MAX_BULK_FAQ_FILES} files per upload — only the first ${MAX_BULK_FAQ_FILES} were kept.`);
    }
    setBulkFaqFiles(combined.slice(0, MAX_BULK_FAQ_FILES));
  };

  const removeBulkFaqFile = (index) => setBulkFaqFiles((prev) => prev.filter((_, i) => i !== index));

  const handleBulkFaqFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId || bulkFaqFiles.length === 0) return;
    setUploading(true);
    try {
      const docs = await uploadBulkFaqFiles(Number(selectedChatbotId), bulkFaqFiles);
      const totalPairs = docs.reduce((sum, d) => sum + (d.totalPairs || 0), 0);
      const totalSkipped = docs.reduce((sum, d) => sum + (d.skippedPairs || 0), 0);
      setBulkFaqFiles([]);
      toast.success(
        `${docs.length} file${docs.length === 1 ? '' : 's'} uploaded · ${totalPairs} pair${totalPairs === 1 ? '' : 's'} queued` +
          (totalSkipped > 0 ? ` · ${totalSkipped} skipped` : ''),
        { description: 'Large imports process in the background — watch progress below.' },
      );
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'File import failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChatbotId) return;
    setUploading(true);
    try {
      await addText(Number(selectedChatbotId), textTitle, textContent);
      setTextTitle(''); setTextContent('');
      toast.success('Text content added! Processing in the background…');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add text.');
    } finally { setUploading(false); }
  };

  const doDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await deleteDocument(target.id);
      setDocuments((prev) => prev.filter((d) => d.id !== target.id));
      toast.success(`"${target.name}" deleted`);
    } catch { toast.error('Failed to delete document.'); }
  };

  const handleRetrain = async (id) => {
    try {
      const updated = await retrainDocument(id);
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
      toast.success('Retraining started…');
      fetchDocs();
    } catch { toast.error('Failed to retrain.'); }
  };

  if (chatbots.length === 0) {
    return (
      <Card className="py-6">
        <EmptyState
          icon={Bot}
          title="No chatbots yet"
          description="Create a chatbot first, then feed it knowledge to make it smart."
          action={<Button asChild><Link to="/chatbots/new"><Plus /> Create a chatbot</Link></Button>}
        />
      </Card>
    );
  }

  const hasProcessing = documents.some((d) => d.status === 'PROCESSING');
  const readyCount = documents.filter((d) => d.status === 'READY').length;
  const detectedPairs = bulkFaqText.split('\n').filter((l) => l.includes('|') && l.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* header + chatbot selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Knowledge base</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Feed documents, FAQs, and text so your chatbot answers accurately.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Chatbot</Label>
          <div className="relative">
            <select
              value={selectedChatbotId}
              onChange={(e) => handleChatbotChange(e.target.value)}
              className="h-10 w-52 appearance-none rounded-xl border border-input bg-card pl-3.5 pr-9 text-sm font-medium text-foreground shadow-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {chatbots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </select>
            <Bot className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* upload panel */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full flex-wrap sm:w-auto">
              <TabsTrigger value="pdf"><FileText className="h-4 w-4" /> Upload PDF</TabsTrigger>
              <TabsTrigger value="faq"><MessageSquare className="h-4 w-4" /> Add FAQ</TabsTrigger>
              <TabsTrigger value="bulkFaq"><ListPlus className="h-4 w-4" /> Bulk FAQ</TabsTrigger>
              <TabsTrigger value="text"><AlignLeft className="h-4 w-4" /> Paste text</TabsTrigger>
            </TabsList>

            {/* PDF */}
            <TabsContent value="pdf">
              <form onSubmit={handlePdfUpload} className="space-y-4">
                <Dropzone
                  accept=".pdf"
                  icon={FileUp}
                  title={pdfFile ? pdfFile.name : 'Click to upload or drag & drop'}
                  subtitle={pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(1)} MB · click to replace` : 'PDF files only · Max 20 MB'}
                  onFiles={(files) => setPdfFile(files[0] || null)}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Text extraction & embedding run in the background (10–30s for large PDFs).</p>
                  <Button type="submit" loading={uploading} disabled={!pdfFile}><Upload className="h-4 w-4" /> Upload PDF</Button>
                </div>
              </form>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq">
              <form onSubmit={handleFaqSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="q">Question <span className="text-destructive">*</span></Label>
                  <Input id="q" value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} placeholder="e.g., What are your business hours?" required maxLength={500} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a">Answer <span className="text-destructive">*</span></Label>
                  <textarea id="a" value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} placeholder="e.g., We're open Monday–Friday, 9am–6pm EST." required rows={4} maxLength={3000}
                    className="w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                  <p className="text-right text-xs text-muted-foreground">{faqAnswer.length}/3000</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={uploading}><Plus className="h-4 w-4" /> Add FAQ</Button>
                </div>
              </form>
            </TabsContent>

            {/* Bulk FAQ */}
            <TabsContent value="bulkFaq">
              <div className="space-y-6">
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-muted-foreground">
                    Train on many questions at once for <strong className="text-foreground">instant replies</strong> — matched questions skip AI generation
                    and answer immediately. Up to <strong className="text-foreground">50,000 pairs</strong> per import; large imports process in the background.
                  </p>
                </div>

                <form onSubmit={handleBulkFaqFileUpload} className="space-y-3">
                  <Label>Upload up to {MAX_BULK_FAQ_FILES} .txt / .pdf files <span className="font-normal text-muted-foreground">(one "question | answer" per line)</span></Label>
                  <Dropzone
                    accept=".txt,.pdf"
                    multiple
                    title="Click to select files or drag & drop"
                    subtitle={`.txt or .pdf · Max 25 MB each · up to ${MAX_BULK_FAQ_FILES} files`}
                    onFiles={addBulkFaqFiles}
                  />
                  {bulkFaqFiles.length > 0 && (
                    <ul className="space-y-1.5">
                      {bulkFaqFiles.map((file, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs">
                          <span className="flex items-center gap-2 truncate text-foreground"><FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {file.name}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <button type="button" onClick={() => removeBulkFaqFile(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove file"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" loading={uploading} disabled={bulkFaqFiles.length === 0}>
                      <Upload className="h-4 w-4" /> Upload{bulkFaqFiles.length > 0 ? ` ${bulkFaqFiles.length} file${bulkFaqFiles.length === 1 ? '' : 's'}` : ''}
                    </Button>
                  </div>
                </form>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">OR PASTE DIRECTLY</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleBulkFaqSubmit} className="space-y-3">
                  <Label>One pair per line: <span className="font-mono text-primary">question | answer</span></Label>
                  <textarea value={bulkFaqText} onChange={(e) => setBulkFaqText(e.target.value)} placeholder={BULK_FAQ_PLACEHOLDER} rows={8}
                    className="w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 font-mono text-xs text-foreground shadow-soft transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{detectedPairs} pair(s) detected</Badge>
                    <Button type="submit" loading={uploading} disabled={!bulkFaqText.trim()}><ListPlus className="h-4 w-4" /> Import FAQs</Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* Text */}
            <TabsContent value="text">
              <form onSubmit={handleTextSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tt">Title <span className="text-destructive">*</span></Label>
                  <Input id="tt" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="e.g., Refund Policy, Product Description" required maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tc">Content <span className="text-destructive">*</span></Label>
                  <textarea id="tc" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste your text content here…" required rows={8} minLength={10} maxLength={50000}
                    className="w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                  <p className="text-right text-xs text-muted-foreground">{textContent.length}/50,000</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={uploading}><Plus className="h-4 w-4" /> Add text</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* documents */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
          <div>
            <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Documents</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{readyCount} of {documents.length} ready</p>
          </div>
          {hasProcessing && <Badge variant="warning"><Loader2 className="h-3 w-3 animate-spin" /> Processing…</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {docsLoading && documents.length === 0
            ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : <DocumentTable documents={documents} onDelete={(id, name) => setPendingDelete({ id, name })} onRetrain={handleRetrain} />}
        </CardContent>
      </Card>

      {/* delete confirm */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{pendingDelete?.name}"?</DialogTitle>
            <DialogDescription>This removes the document and its embeddings from your chatbot's knowledge. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={doDelete}><X className="h-4 w-4" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
