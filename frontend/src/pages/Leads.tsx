import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { 
  MoreVertical, 
  Search,
  Plus,
  ArrowRight,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const stages = ['new', 'interested', 'quoted', 'negotiating', 'closed'];

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await client.get('/leads');
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    try {
      await client.patch(`/leads/${leadId}`, { stage: newStage });
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    } catch (err) {
      console.error('Failed to update stage', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full animate-pulse">Loading board...</div>;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto overflow-hidden flex flex-col h-full">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl">Leads Pipeline</h1>
            <span className="bg-primary/10 text-primary text-xs font-black px-2 py-1 rounded-full uppercase tracking-widest mt-1">Beta</span>
          </div>
          <p className="text-muted-foreground text-lg">AI automatically scores and segments incoming WhatsApp prospects.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter leads..." 
              className="bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Lead</button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 pr-4 -mx-2 px-2 flex-1 scrollbar-hide">
        {stages.map((stage) => (
          <div key={stage} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-bold uppercase tracking-widest text-xs text-muted-foreground">{stage}</h3>
                <span className="bg-muted px-2 py-0.5 rounded-md text-[10px] font-bold text-muted-foreground">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              <button className="p-1 hover:bg-muted/50 rounded-md transition-colors"><MoreVertical className="w-3 h-3 text-muted-foreground" /></button>
            </div>

            <div className="flex-1 bg-card/20 rounded-2xl border border-dashed border-border/50 p-3 space-y-4 overflow-y-auto">
              {leads.filter(l => l.stage === stage).map((lead) => (
                <motion.div
                  layoutId={lead.id}
                  key={lead.id}
                  className="bg-card border border-border p-5 rounded-2xl shadow-lg relative group cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter",
                      lead.score === 'high' ? "bg-red-500/10 text-red-500" :
                      lead.score === 'medium' ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                    )}>
                      {lead.score} Priority
                    </div>
                    {lead.score === 'high' && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                  </div>

                  <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{lead.customer_name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
                    {lead.summary || 'No summary background provided.'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-card flex items-center justify-center text-[10px] font-bold">
                        {lead.customer_name?.[0]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {stage !== 'closed' && (
                         <button 
                          onClick={() => updateLeadStage(lead.id, stages[stages.indexOf(stage) + 1])}
                          className="p-2 bg-muted/40 hover:bg-primary/20 hover:text-primary rounded-xl transition-all"
                         >
                           <ArrowRight className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {leads.filter(l => l.stage === stage).length === 0 && (
                <div className="h-24 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-20">
                  Empty Stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leads;
