/**
 * ChatbotsPage — the "My Chatbots" grid.
 * API logic unchanged (getChatbots/deleteChatbot/togglePublish); adds client-side
 * search + status filter, skeletons, staggered cards, and toast feedback.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Bot, RefreshCw, Search } from 'lucide-react';
import ChatbotCard from '@/components/chatbot/ChatbotCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { staggerContainer } from '@/components/ui/PageTransition';
import { getChatbots, deleteChatbot, togglePublish } from '@/lib/chatbots';

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchChatbots = useCallback(async (isRefresh = false) => {
    try {
      setError('');
      if (isRefresh) setRefreshing(true);
      const data = await getChatbots();
      setChatbots(data);
    } catch {
      setError('Failed to load chatbots. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchChatbots(); }, [fetchChatbots]);

  const handleDelete = async (id, name) => {
    try {
      await deleteChatbot(id);
      setChatbots((prev) => prev.filter((b) => b.id !== id));
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error('Failed to delete chatbot. Please try again.');
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const updated = await togglePublish(id);
      setChatbots((prev) => prev.map((b) => (b.id === id ? updated : b)));
      toast.success(updated.isPublished ? 'Chatbot is now live 🚀' : 'Chatbot unpublished');
    } catch {
      toast.error('Failed to update chatbot status.');
    }
  };

  const filtered = useMemo(() => {
    return chatbots.filter((b) => {
      const matchesQuery = !query || b.name?.toLowerCase().includes(query.toLowerCase()) || b.description?.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || (filter === 'live' && b.isPublished) || (filter === 'draft' && !b.isPublished);
      return matchesQuery && matchesFilter;
    });
  }, [chatbots, query, filter]);

  const liveCount = chatbots.filter((b) => b.isPublished).length;

  return (
    <div className="space-y-6">
      {/* toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Your chatbots</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {chatbots.length} total · {liveCount} live
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchChatbots(true)}>
            <RefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button asChild><Link to="/chatbots/new"><Plus /> New Chatbot</Link></Button>
        </div>
      </div>

      {/* filters */}
      {(chatbots.length > 0 || loading) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chatbots…" className="h-10 pl-10" />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</Card>
      )}

      {/* loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
              <div className="mt-4 flex gap-2"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div>
              <div className="mt-5 flex gap-2 border-t border-border pt-4"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 flex-1" /></div>
            </Card>
          ))}
        </div>
      )}

      {/* empty: no chatbots at all */}
      {!loading && chatbots.length === 0 && !error && (
        <Card className="py-4">
          <EmptyState
            icon={Bot}
            title="Create your first chatbot"
            description="Design its personality and appearance, train it on your knowledge, and embed it on your site in minutes."
            action={<Button asChild><Link to="/chatbots/new"><Plus /> Create your first chatbot</Link></Button>}
          />
        </Card>
      )}

      {/* empty: filtered out */}
      {!loading && chatbots.length > 0 && filtered.length === 0 && (
        <Card className="py-4"><EmptyState icon={Search} title="No matches" description="Try a different search or filter." /></Card>
      )}

      {/* grid */}
      {!loading && filtered.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((chatbot) => (
            <ChatbotCard key={chatbot.id} chatbot={chatbot} onDelete={handleDelete} onTogglePublish={handleTogglePublish} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
