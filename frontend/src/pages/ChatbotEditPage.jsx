/**
 * WHY this page exists:
 *   Edit an existing chatbot — pre-fills form, allows save/publish/delete.
 *
 * HOW it differs from Next.js version:
 *   - useParams() from react-router-dom (same hook name, different import)
 *   - useNavigate() instead of useRouter()
 *   - Link from react-router-dom
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Globe, EyeOff, Trash2, MessageCircle, BookOpen } from 'lucide-react';
import ChatbotPreview from '@/components/chatbot/ChatbotPreview';
import TestBotModal from '@/components/chatbot/TestBotModal';
import { getChatbot, updateChatbot, togglePublish, deleteChatbot } from '@/lib/chatbots';

const TABS = [
  { id: 'basic',      label: '① Basic Info' },
  { id: 'ai',         label: '② AI Settings' },
  { id: 'appearance', label: '③ Appearance' },
];

export default function ChatbotEditPage() {
  const navigate = useNavigate();
  const { id: chatbotId } = useParams(); // React Router: /chatbots/:id → params.id

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    getChatbot(chatbotId)
      .then(chatbot => setFormData({
        name:            chatbot.name,
        description:     chatbot.description || '',
        welcomeMessage:  chatbot.welcomeMessage,
        systemPrompt:    chatbot.systemPrompt || '',
        themeColor:      chatbot.themeColor,
        widgetPosition:  chatbot.widgetPosition,
        language:        chatbot.language,
        leadFormEnabled: chatbot.leadFormEnabled,
        isActive:        chatbot.isActive,
        isPublished:     chatbot.isPublished,
      }))
      .catch(() => setError('Chatbot not found.'))
      .finally(() => setLoading(false));
  }, [chatbotId]);

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await updateChatbot(chatbotId, formData);
      setFormData(prev => ({ ...prev, ...updated }));
      setSuccess('Chatbot saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const updated = await togglePublish(chatbotId);
      setFormData(prev => ({ ...prev, isPublished: updated.isPublished }));
      setSuccess(updated.isPublished ? 'Chatbot published!' : 'Chatbot set to draft.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update publish status.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${formData.name}"? This cannot be undone.`)) return;
    try {
      await deleteChatbot(chatbotId);
      navigate('/chatbots');
    } catch {
      setError('Failed to delete chatbot.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
    </div>
  );

  if (!formData) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500">Chatbot not found.</p>
      <Link to="/chatbots" className="btn-primary mt-4 inline-flex">Back to Chatbots</Link>
    </div>
  );

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/chatbots" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit: {formData.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formData.isPublished ? 'bg-blue-100 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {formData.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formData.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/knowledge?chatbotId=${chatbotId}`}
            className="btn-secondary flex items-center gap-1.5 text-brand-600 hover:bg-brand-50 hover:border-brand-300">
            <BookOpen className="w-4 h-4" />Knowledge Base
          </Link>
          {formData.isPublished && (
            <button type="button" onClick={() => setShowTest(true)}
              className="btn-secondary flex items-center gap-1.5 text-green-600 hover:bg-green-50 hover:border-green-300">
              <MessageCircle className="w-4 h-4" />Test Bot
            </button>
          )}
          <button type="button" onClick={handleDelete}
            className="btn-secondary flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-300">
            <Trash2 className="w-4 h-4" />Delete
          </button>
          <button type="button" onClick={handleTogglePublish}
            className={`btn-secondary flex items-center gap-1.5 ${formData.isPublished ? 'text-orange-600' : 'text-blue-600'}`}>
            {formData.isPublished ? <><EyeOff className="w-4 h-4" />Unpublish</> : <><Globe className="w-4 h-4" />Publish</>}
          </button>
        </div>
      </div>

      {error   && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          <div className="lg:col-span-3 space-y-4">
            <div className="card">
              <div className="flex border-b border-gray-200">
                {TABS.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'text-brand-600 border-b-2 border-brand-600 -mb-px' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'basic' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot Name <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} required minLength={2} maxLength={100} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input type="text" value={formData.description} onChange={e => handleChange('description', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message <span className="text-red-500">*</span></label>
                      <textarea value={formData.welcomeMessage} onChange={e => handleChange('welcomeMessage', e.target.value)} required rows={3} maxLength={500} className="input-field resize-none" />
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input type="checkbox" id="leadForm" checked={formData.leadFormEnabled} onChange={e => handleChange('leadFormEnabled', e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-600" />
                      <label htmlFor="leadForm" className="text-sm font-medium text-gray-700 cursor-pointer">Enable Lead Capture Form</label>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => handleChange('isActive', e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-600" />
                      <div>
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">Chatbot Active</label>
                        <p className="text-xs text-gray-400 mt-0.5">Uncheck to disable without deleting</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                      <textarea value={formData.systemPrompt} onChange={e => handleChange('systemPrompt', e.target.value)} rows={8} maxLength={5000} className="input-field resize-none font-mono text-xs" />
                      <p className="text-xs text-gray-400 mt-1">{formData.systemPrompt.length}/5000 · Uses OpenAI GPT-4o in Phase 4</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select value={formData.language} onChange={e => handleChange('language', e.target.value)} className="input-field">
                        <option value="en">English</option><option value="es">Spanish</option>
                        <option value="fr">French</option><option value="de">German</option>
                        <option value="pt">Portuguese</option><option value="hi">Hindi</option>
                        <option value="ar">Arabic</option><option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {['#2563eb','#7c3aed','#059669','#dc2626','#ea580c','#0891b2','#4f46e5','#374151'].map(color => (
                          <button key={color} type="button" onClick={() => handleChange('themeColor', color)}
                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${formData.themeColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                            style={{ backgroundColor: color }} />
                        ))}
                        <div className="flex items-center gap-2">
                          <input type="color" value={formData.themeColor} onChange={e => handleChange('themeColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                          <input type="text" value={formData.themeColor} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) handleChange('themeColor', e.target.value); }} maxLength={7} className="input-field w-28 font-mono text-sm" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Widget Position</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{value:'bottom-right',label:'Bottom Right'},{value:'bottom-left',label:'Bottom Left'}].map(opt => (
                          <button key={opt.value} type="button" onClick={() => handleChange('widgetPosition', opt.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${formData.widgetPosition === opt.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Link to="/chatbots" className="btn-secondary">Cancel</Link>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-4 h-full min-h-96 bg-gray-50 sticky top-24">
              <ChatbotPreview
                name={formData.name}
                welcomeMessage={formData.welcomeMessage}
                themeColor={formData.themeColor}
                widgetPosition={formData.widgetPosition}
              />
            </div>
          </div>
        </div>
      </form>

      {showTest && (
        <TestBotModal chatbotId={chatbotId} onClose={() => setShowTest(false)} />
      )}
    </div>
  );
}
