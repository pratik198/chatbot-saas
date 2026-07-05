/**
 * ChatbotNewPage — create a chatbot with a live preview.
 * Logic unchanged (createChatbot → navigate). Uses the shared ChatbotForm.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import ChatbotForm from '@/components/chatbot/ChatbotForm';
import ChatbotPreview from '@/components/chatbot/ChatbotPreview';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createChatbot } from '@/lib/chatbots';

const DEFAULTS = {
  name: '',
  description: '',
  welcomeMessage: 'Hi there! 👋 How can I help you today?',
  systemPrompt: 'You are a helpful and friendly AI assistant. Answer questions clearly and concisely.',
  themeColor: '#6366f1',
  widgetPosition: 'bottom-right',
  language: 'en',
  leadFormEnabled: false,
};

export default function ChatbotNewPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createChatbot(formData);
      toast.success(`"${formData.name}" created 🎉`);
      navigate('/chatbots');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create chatbot. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/chatbots"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Create new chatbot</h2>
          <p className="text-sm text-muted-foreground">Configure your assistant and watch it come to life.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Card><CardContent className="p-5 sm:p-6"><ChatbotForm data={formData} onChange={handleChange} /></CardContent></Card>
            <div className="flex justify-between">
              <Button asChild variant="outline"><Link to="/chatbots">Cancel</Link></Button>
              <Button type="submit" loading={loading} disabled={!formData.name || !formData.welcomeMessage}><Save className="h-4 w-4" /> Create chatbot</Button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <Card className="sticky top-24 min-h-96 bg-secondary/30 p-4">
              <ChatbotPreview name={formData.name} welcomeMessage={formData.welcomeMessage} themeColor={formData.themeColor} widgetPosition={formData.widgetPosition} />
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
