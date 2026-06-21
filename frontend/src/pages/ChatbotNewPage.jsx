/**
 * WHY this page exists:
 *   Create a new chatbot via a multi-tab form with a live preview.
 *
 * HOW it differs from Next.js version:
 *   - Link and useNavigate from react-router-dom
 *   - navigate('/chatbots') instead of router.push('/chatbots')
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ChatbotPreview from '@/components/chatbot/ChatbotPreview';
import { createChatbot } from '@/lib/chatbots';

const TABS = [
  { id: 'basic',      label: '① Basic Info' },
  { id: 'ai',         label: '② AI Settings' },
  { id: 'appearance', label: '③ Appearance' },
];

const DEFAULTS = {
  name: '',
  description: '',
  welcomeMessage: 'Hi there! 👋 How can I help you today?',
  systemPrompt: 'You are a helpful and friendly AI assistant. Answer questions clearly and concisely.',
  themeColor: '#2563eb',
  widgetPosition: 'bottom-right',
  language: 'en',
  leadFormEnabled: false,
};

export default function ChatbotNewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createChatbot(formData);
      navigate('/chatbots');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create chatbot. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-4">
        <Link to="/chatbots" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Create New Chatbot</h2>
          <p className="text-sm text-gray-500">Configure your chatbot and see it come to life</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Config (3/5) ──────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card">
              <div className="flex border-b border-gray-200">
                {TABS.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* ── Basic Tab ─────────────────────────────── */}
                {activeTab === 'basic' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chatbot Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        placeholder="e.g., Support Bot, Sales Assistant"
                        required minLength={2} maxLength={100} className="input-field" />
                      <p className="text-xs text-gray-400 mt-1">Visible to users in the chat header</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input type="text" value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="What is this chatbot for? (optional)" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Welcome Message <span className="text-red-500">*</span>
                      </label>
                      <textarea value={formData.welcomeMessage}
                        onChange={e => handleChange('welcomeMessage', e.target.value)}
                        required rows={3} maxLength={500} className="input-field resize-none" />
                      <p className="text-xs text-gray-400 mt-1">{formData.welcomeMessage.length}/500</p>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input type="checkbox" id="leadForm" checked={formData.leadFormEnabled}
                        onChange={e => handleChange('leadFormEnabled', e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-brand-600" />
                      <div>
                        <label htmlFor="leadForm" className="text-sm font-medium text-gray-700 cursor-pointer">
                          Enable Lead Capture Form
                        </label>
                        <p className="text-xs text-gray-400 mt-0.5">Collect visitor info before chat (Phase 5)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── AI Tab ────────────────────────────────── */}
                {activeTab === 'ai' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                      <textarea value={formData.systemPrompt}
                        onChange={e => handleChange('systemPrompt', e.target.value)}
                        placeholder="Tell the AI how to behave..."
                        rows={8} maxLength={5000} className="input-field resize-none font-mono text-xs" />
                      <p className="text-xs text-gray-400 mt-1">
                        {formData.systemPrompt.length}/5000 · Uses OpenAI GPT-4o in Phase 4
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select value={formData.language} onChange={e => handleChange('language', e.target.value)} className="input-field">
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="pt">Portuguese</option>
                        <option value="hi">Hindi</option>
                        <option value="ar">Arabic</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Appearance Tab ────────────────────────── */}
                {activeTab === 'appearance' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {['#2563eb','#7c3aed','#059669','#dc2626','#ea580c','#0891b2','#4f46e5','#374151'].map(color => (
                          <button key={color} type="button" onClick={() => handleChange('themeColor', color)}
                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                              formData.themeColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                            }`}
                            style={{ backgroundColor: color }} />
                        ))}
                        <div className="flex items-center gap-2">
                          <input type="color" value={formData.themeColor}
                            onChange={e => handleChange('themeColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                          <input type="text" value={formData.themeColor}
                            onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) handleChange('themeColor', e.target.value); }}
                            maxLength={7} className="input-field w-28 font-mono text-sm" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Widget Position</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{value:'bottom-right',label:'Bottom Right',desc:'Most common'},{value:'bottom-left',label:'Bottom Left',desc:'Alternative'}].map(opt => (
                          <button key={opt.value} type="button" onClick={() => handleChange('widgetPosition', opt.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${
                              formData.widgetPosition === opt.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500">{opt.desc}</p>
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
              <button type="submit"
                disabled={loading || !formData.name || !formData.welcomeMessage}
                className="btn-primary flex items-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Save className="w-4 h-4" />Create Chatbot</>}
              </button>
            </div>
          </div>

          {/* ── Right: Preview (2/5) ────────────────────────── */}
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
    </div>
  );
}
