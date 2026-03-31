import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  MoreVertical, 
  Send,
  Bot,
  Hash,
  MessageSquare,
  Pause,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Conversations: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo.id);
    }
  }, [selectedConvo]);

  const fetchConversations = async () => {
    try {
      const res = await client.get('/conversations');
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await client.get(`/conversations/${id}/messages`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const togglePause = async (id: string, currentStatus: boolean) => {
    try {
      await client.patch(`/conversations/${id}`, { ai_paused: !currentStatus });
      setSelectedConvo({ ...selectedConvo, ai_paused: !currentStatus });
      setConversations(conversations.map(c => c.id === id ? { ...c, ai_paused: !currentStatus } : c));
    } catch (err) {
      console.error('Failed to toggle pause');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo) return;

    try {
      await client.post(`/conversations/${selectedConvo.id}/messages`, {
        content: replyText,
      });
      
      const newMessage = {
        id: Math.random().toString(),
        sender: 'business_owner',
        content: replyText,
        created_at: new Date().toISOString()
      };
      
      setMessages([...messages, newMessage]);
      setReplyText('');
    } catch (err) {
      console.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Syncing chats...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 overflow-hidden font-outfit">
      {/* Sidebar List */}
      <div className="w-96 flex flex-col gap-4">
        <div className="flex items-center gap-4 px-2">
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{conversations.length}</span>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedConvo(convo)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden",
                selectedConvo?.id === convo.id 
                  ? "bg-primary/5 border-primary/30 shadow-md" 
                  : "bg-card/40 border-border hover:bg-card hover:border-border/80 shadow-sm"
              )}
            >
              {selectedConvo?.id === convo.id && (
                <motion.div 
                  layoutId="active-chat-indicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                />
              )}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-xl font-bold border border-border group-hover:border-primary/30 transition-colors shadow-inner">
                  {convo.customer_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                      {convo.customer_name || 'Unknown'}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate leading-relaxed">
                    {convo.summary || 'Detecting intent...'}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shadow-sm",
                        convo.wb_leads?.[0]?.score === 'high' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        convo.wb_leads?.[0]?.score === 'medium' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      )}>
                        {convo.wb_leads?.[0]?.score || 'new'}
                      </span>
                      {convo.ai_paused && (
                         <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                           <Pause className="w-2.5 h-2.5" /> Paused
                         </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 font-medium">
                      <Hash className="w-2.5 h-2.5" /> {convo.customer_jid.split('@')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 glass rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative border border-white/5">
        <AnimatePresence mode="wait">
          {selectedConvo ? (
            <motion.div 
              key="chat-active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col h-full bg-slate-950/20"
            >
              {/* Chat Header */}
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-card/10 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-blue-400 border border-white/10 flex items-center justify-center font-bold text-white shadow-lg">
                    {selectedConvo.customer_name?.[0] || '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-none mb-1.5">{selectedConvo.customer_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", selectedConvo.ai_paused ? "bg-amber-500" : "bg-green-500")} /> 
                      {selectedConvo.ai_paused ? 'Human Takeover Mode' : 'AI Active via Baileys'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => togglePause(selectedConvo.id, selectedConvo.ai_paused)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm group",
                      selectedConvo.ai_paused 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20" 
                        : "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
                    )}
                  >
                    {selectedConvo.ai_paused ? <><Play className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Resume AI</> : <><Pause className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Pause AI</>}
                  </button>
                  <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10 text-muted-foreground"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      msg.sender === 'customer' ? "items-start" : "items-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] p-5 rounded-2xl text-sm leading-relaxed shadow-lg relative group transition-all",
                      msg.sender === 'customer' 
                        ? "bg-muted/40 text-foreground border border-white/5 rounded-tl-none hover:bg-muted/60" 
                        : "bg-primary text-primary-foreground rounded-tr-none shadow-primary/20 hover:scale-[1.01]"
                    )}>
                      {msg.content}
                      <span className={cn(
                        "text-[10px] block mt-3 opacity-60 font-medium tracking-tight",
                        msg.sender === 'customer' ? "text-right" : "text-left"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {(msg.sender === 'ai' || msg.sender === 'business_owner') && (
                      <span className={cn(
                        "text-[10px] font-bold mt-2 flex items-center gap-1.5 uppercase tracking-widest px-1",
                        msg.sender === 'ai' ? "text-primary" : "text-muted-foreground"
                      )}>
                        {msg.sender === 'ai' ? <><Bot className="w-3.5 h-3.5" /> AI Autoreply</> : "Manual Reply"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form 
                onSubmit={handleSendMessage}
                className="p-8 bg-card/20 backdrop-blur-2xl border-t border-white/5 flex items-center gap-4"
              >
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a manual response here..."
                  className="flex-1 bg-muted/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium text-sm placeholder:text-muted-foreground/50 shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim()}
                  className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl shadow-primary/40 group/send"
                >
                  <Send className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-8"
            >
              <div className="w-32 h-32 bg-card border border-white/5 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative">
                <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-2xl animate-pulse" />
                <MessageSquare className="w-16 h-16 text-muted-foreground/20 relative z-10" />
              </div>
              <div className="max-w-sm space-y-3">
                <h3 className="text-3xl font-bold tracking-tight">Select a Lead</h3>
                <p className="text-muted-foreground text-lg leading-relaxed font-medium">Pick a conversation from the left to view their intent summary and take manual control if needed.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Conversations;
