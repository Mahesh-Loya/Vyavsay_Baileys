import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const { data } = await client.get(`/knowledge?userId=${user?.id}`);
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch knowledge items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    
    setAdding(true);
    setError(null);
    try {
      await client.post('/knowledge', {
        userId: user?.id,
        content: newContent
      });
      setNewContent('');
      await fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add knowledge');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/knowledge/${id}?userId=${user?.id}`);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Knowledge Base</h1>
          <p className="text-muted-foreground text-lg italic">"The AI brain is only as good as the facts you feed it."</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search knowledge..."
              className="bg-card border border-border/50 rounded-2xl py-3 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Knowledge Form */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 sticky top-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Add Context</h2>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-6">
              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste pricing, services, or business info here..."
                className="w-full h-64 bg-muted/30 border border-border/50 rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm leading-relaxed"
                required
              />
              {error && (
                <div className="text-red-400 text-xs flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <button 
                type="submit"
                disabled={adding || !newContent.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 group"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" /> Sync to AI Brain</>}
              </button>
            </form>
          </div>
        </div>

        {/* Knowledge List */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-card/50 border border-border/20 rounded-3xl animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-card/30 border border-dashed border-border rounded-[3rem]">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Empty Library</h3>
              <p className="text-muted-foreground">Add your first business context to train the AI.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-card border border-border/50 rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-x-16 -translate-y-16" />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm leading-relaxed text-slate-300 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Vectorized</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
