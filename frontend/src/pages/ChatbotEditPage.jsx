/**
 * ChatbotEditPage — edit an existing chatbot (save / publish / delete / test).
 * Logic unchanged; uses the shared ChatbotForm + styled confirm + toasts.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Save, Globe, EyeOff, Trash2, MessageCircle, BookOpen } from 'lucide-react';
import ChatbotForm from '@/components/chatbot/ChatbotForm';
import ChatbotPreview from '@/components/chatbot/ChatbotPreview';
import TestBotModal from '@/components/chatbot/TestBotModal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoaderPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/Dialog';
import { getChatbot, updateChatbot, togglePublish, deleteChatbot } from '@/lib/chatbots';
import { Bot } from 'lucide-react';

export default function ChatbotEditPage() {
  const navigate = useNavigate();
  const { id: chatbotId } = useParams();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getChatbot(chatbotId)
      .then((c) => setFormData({
        name: c.name, description: c.description || '', welcomeMessage: c.welcomeMessage,
        systemPrompt: c.systemPrompt || '', themeColor: c.themeColor, widgetPosition: c.widgetPosition,
        language: c.language, leadFormEnabled: c.leadFormEnabled, isActive: c.isActive, isPublished: c.isPublished,
      }))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [chatbotId]);

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateChatbot(chatbotId, formData);
      setFormData((prev) => ({ ...prev, ...updated }));
      toast.success('Changes saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleTogglePublish = async () => {
    try {
      const updated = await togglePublish(chatbotId);
      setFormData((prev) => ({ ...prev, isPublished: updated.isPublished }));
      toast.success(updated.isPublished ? 'Chatbot is now live 🚀' : 'Chatbot set to draft');
    } catch { toast.error('Failed to update publish status.'); }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    try {
      await deleteChatbot(chatbotId);
      toast.success('Chatbot deleted');
      navigate('/chatbots');
    } catch { toast.error('Failed to delete chatbot.'); }
  };

  if (loading) return <LoaderPanel label="Loading chatbot…" />;

  if (notFound || !formData) {
    return (
      <Card className="py-6">
        <EmptyState icon={Bot} title="Chatbot not found" description="It may have been deleted."
          action={<Button asChild><Link to="/chatbots">Back to chatbots</Link></Button>} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/chatbots"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{formData.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              {formData.isPublished ? <Badge variant="success" dot>Live</Badge> : <Badge variant="warning" dot>Draft</Badge>}
              {formData.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm"><Link to={`/knowledge?chatbotId=${chatbotId}`}><BookOpen className="h-4 w-4" /> Knowledge</Link></Button>
          {formData.isPublished && <Button variant="outline" size="sm" onClick={() => setShowTest(true)}><MessageCircle className="h-4 w-4" /> Test</Button>}
          <Button variant={formData.isPublished ? 'secondary' : 'default'} size="sm" onClick={handleTogglePublish}>
            {formData.isPublished ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Globe className="h-4 w-4" /> Publish</>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Card><CardContent className="p-5 sm:p-6"><ChatbotForm data={formData} onChange={handleChange} showActive /></CardContent></Card>
            <div className="flex justify-between">
              <Button asChild variant="outline"><Link to="/chatbots">Cancel</Link></Button>
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save changes</Button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <Card className="sticky top-24 min-h-96 bg-secondary/30 p-4">
              <ChatbotPreview name={formData.name} welcomeMessage={formData.welcomeMessage} themeColor={formData.themeColor} widgetPosition={formData.widgetPosition} />
            </Card>
          </div>
        </div>
      </form>

      {showTest && <TestBotModal chatbotId={chatbotId} onClose={() => setShowTest(false)} />}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{formData.name}"?</DialogTitle>
            <DialogDescription>This permanently removes the chatbot and its conversations. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /> Delete chatbot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
