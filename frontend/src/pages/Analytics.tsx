import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Zap,
  ArrowUpRight,
  PieChart,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await client.get('/analytics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full animate-pulse">Loading analytics...</div>;

  const leadDistribution = [
    { label: 'High Intent', count: data?.leadsByScore?.high || 0, color: 'bg-red-500' },
    { label: 'Warm Leads', count: data?.leadsByScore?.medium || 0, color: 'bg-amber-500' },
    { label: 'General', count: data?.leadsByScore?.low || 0, color: 'bg-blue-500' },
  ];

  const totalLeads = data?.totalLeads || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground text-lg">AI-powered insights into your sales conversion funnel.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground">
          <Activity className="w-4 h-4 text-whatsapp" /> Real-time tracking
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: MessageSquare, label: 'Chat Volume', value: data?.totalMessages || 0, color: 'text-primary' },
          { icon: Users, label: 'Total Leads', value: data?.totalLeads || 0, color: 'text-green-500' },
          { icon: Zap, label: 'AI Replies', value: data?.aiMessagesCount || 0, color: 'text-purple-500' },
          { icon: TrendingUp, label: 'Conversations', value: data?.totalConversations || 0, color: 'text-blue-500' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="premium-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-card border border-border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h3>
            <p className="text-3xl font-display font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 premium-card flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Lead Stage Distribution</h2>
            <button className="text-xs font-bold text-primary flex items-center gap-1">View Report <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          <div className="flex-1 flex items-end gap-4 h-[300px] pt-4">
            {Object.entries(data?.leadsByStage || {}).map(([stage, count]: any) => (
              <div key={stage} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / totalLeads) * 200 + 20}px` }}
                    className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-xl border border-primary/50 relative group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-shadow"
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">{stage}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2"><PieChart className="w-5 h-5 text-accent" /> Intent Scoring</h2>
          </div>
          <div className="space-y-6">
            {leadDistribution.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{Math.round((item.count / totalLeads) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.count / totalLeads) * 100}%` }}
                    className={`h-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
