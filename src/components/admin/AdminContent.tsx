import { useState, useEffect } from 'react';
import { FileText, Loader, Sparkles, Save, Send, Globe, Facebook, Instagram, Youtube, MessageCircle, PenLine, MapPin, HelpCircle, Tag, Calendar } from 'lucide-react';
import { generateSocialContent, generateBlogPost, generateCityPage, generateFAQ, generateOfferPoster, saveContentDraft, fetchContentDrafts, type ContentDraft } from '@/lib/aiContent';
import { supabase } from '@/lib/supabase';

const SOCIAL_TYPES = [
  { type: 'instagram_reel', label: 'Instagram Reel', icon: Instagram, color: 'bg-pink-100 text-pink-700' },
  { type: 'facebook_post', label: 'Facebook Post', icon: Facebook, color: 'bg-blue-100 text-blue-700' },
  { type: 'youtube_short', label: 'YouTube Short', icon: Youtube, color: 'bg-red-100 text-red-700' },
  { type: 'linkedin_post', label: 'LinkedIn Post', icon: Globe, color: 'bg-cyan-100 text-cyan-700' },
  { type: 'x_post', label: 'X (Twitter) Post', icon: MessageCircle, color: 'bg-gray-100 text-gray-700' },
];

const CONTENT_TYPES = [
  { type: 'blog_post', label: 'Blog Post', icon: PenLine, color: 'bg-purple-100 text-purple-700' },
  { type: 'city_page', label: 'City Page', icon: MapPin, color: 'bg-green-100 text-green-700' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, color: 'bg-amber-100 text-amber-700' },
  { type: 'festival_poster', label: 'Festival Poster', icon: Calendar, color: 'bg-red-100 text-red-700' },
  { type: 'offer_poster', label: 'Offer Poster', icon: Tag, color: 'bg-orange-100 text-orange-700' },
];

const SERVICES = [
  'AC Repair', 'Refrigerator Repair', 'Washing Machine Repair', 'Plumbing',
  'Electrical Work', 'Deep Cleaning', 'Pest Control', 'RO Water Purifier',
  'Microwave Repair', 'TV Repair', 'Geyser Repair', 'Carpentry',
];

export default function AdminContent() {
  const [mode, setMode] = useState<'social' | 'content'>('social');
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [selectedCity, setSelectedCity] = useState('');
  const [offerText, setOfferText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [generated, setGenerated] = useState<Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'> | null>(null);
  const [blogTopic, setBlogTopic] = useState('');
  const [faqService, setFaqService] = useState(SERVICES[0]);
  const [festivalName, setFestivalName] = useState('');
  const [contentSubMode, setContentSubMode] = useState<'blog' | 'city' | 'faq' | 'poster'>('blog');

  useEffect(() => { loadDrafts(); }, []);

  const loadDrafts = async () => {
    const data = await fetchContentDrafts(undefined, 20);
    setDrafts(data);
  };

  const handleGenerateSocial = async (type: string) => {
    setGenerating(true);
    const content = generateSocialContent(type, selectedService, selectedCity || undefined, offerText || undefined);
    setGenerated(content);
    setGenerating(false);
  };

  const handleGenerateContent = async () => {
    setGenerating(true);
    let content: Omit<ContentDraft, 'id' | 'created_at' | 'status' | 'platform_url'>;
    if (contentSubMode === 'blog') {
      content = generateBlogPost(blogTopic || `${selectedService} Maintenance Guide`, selectedService);
    } else if (contentSubMode === 'city') {
      content = generateCityPage(selectedCity || 'Hyderabad', SERVICES.slice(0, 6));
    } else if (contentSubMode === 'faq') {
      content = generateFAQ(faqService);
    } else {
      content = generateOfferPoster(festivalName || 'Diwali', offerText || '20% off on all services', selectedService);
    }
    setGenerated(content);
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generated) return;
    await saveContentDraft(generated);
    setGenerated(null);
    loadDrafts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
          <FileText size={24} className="text-blue-600" /> AI Content Generator
        </h2>
        <p className="text-gray-500 text-sm">Generate social media posts, blog articles, city pages, FAQs, and promotional posters.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setMode('social')}
          className={'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
            (mode === 'social' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50')}>
          Social Media
        </button>
        <button onClick={() => setMode('content')}
          className={'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
            (mode === 'content' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50')}>
          Content & SEO
        </button>
      </div>

      {mode === 'social' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Service</label>
                <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500">
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">City (optional)</label>
                <input type="text" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="e.g. Hyderabad"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Offer (optional)</label>
                <input type="text" value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="e.g. 20% off"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_TYPES.map((s) => (
                <button key={s.type} onClick={() => handleGenerateSocial(s.type)} disabled={generating}
                  className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ' + s.color + ' hover:opacity-80'}>
                  <s.icon size={16} /> {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'content' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((c) => (
              <button key={c.type} onClick={() => setContentSubMode(c.type.split('_')[0] as 'blog' | 'city' | 'faq' | 'poster')}
                className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' + c.color + ' hover:opacity-80'}>
                <c.icon size={16} /> {c.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            {contentSubMode === 'blog' && (
              <input type="text" value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)} placeholder="Blog topic (e.g. 'How to Maintain Your AC in Summer')"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            )}
            {contentSubMode === 'city' && (
              <input type="text" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="City name (e.g. Hyderabad)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            )}
            {contentSubMode === 'faq' && (
              <select value={faqService} onChange={(e) => setFaqService(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500">
                {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {contentSubMode === 'poster' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={festivalName} onChange={(e) => setFestivalName(e.target.value)} placeholder="Festival name (e.g. Diwali)"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
                <input type="text" value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="Offer details (e.g. 25% off all services)"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
              </div>
            )}
            <button onClick={handleGenerateContent} disabled={generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
              <Sparkles size={16} /> Generate Content
            </button>
          </div>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-8"><Loader className="animate-spin text-blue-600" size={24} /></div>
      )}

      {generated && !generating && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Generated Content Preview</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
            <p className="text-sm font-bold text-gray-900">{generated.title}</p>
          </div>
          {generated.caption && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Caption</label>
              <p className="text-sm text-gray-700 whitespace-pre-line">{generated.caption}</p>
            </div>
          )}
          {generated.hashtags && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Hashtags</label>
              <div className="flex flex-wrap gap-1">
                {generated.hashtags.map((h) => <span key={h} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{h}</span>)}
              </div>
            </div>
          )}
          {generated.voice_over_script && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Voice-over Script</label>
              <p className="text-sm text-gray-700 whitespace-pre-line">{generated.voice_over_script}</p>
            </div>
          )}
          {generated.video_script && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Video Script</label>
              <p className="text-sm text-gray-700 whitespace-pre-line">{generated.video_script}</p>
            </div>
          )}
          {generated.body_content && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Body Content</label>
              <p className="text-sm text-gray-700 whitespace-pre-line max-h-60 overflow-y-auto">{generated.body_content}</p>
            </div>
          )}
          {generated.meta_description && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Meta Description</label>
              <p className="text-sm text-gray-500">{generated.meta_description}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
              <Save size={16} /> Save Draft
            </button>
            <button onClick={() => setGenerated(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              Discard
            </button>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Recent Drafts</h3>
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                <FileText size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{d.title}</div>
                  <div className="text-xs text-gray-400">{d.content_type.replace(/_/g, ' ')} • {new Date(d.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' +
                  (d.status === 'draft' ? 'bg-amber-100 text-amber-700' : d.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
