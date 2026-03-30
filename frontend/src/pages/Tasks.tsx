import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { 
  Calendar, 
  Clock, 
  MoreVertical,
  Plus,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await client.get('/tasks');
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await client.patch(`/tasks/${id}`, { is_completed: !currentStatus });
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full animate-pulse">Loading task manager...</div>;

  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl">Action Items</h1>
          <p className="text-muted-foreground text-lg">Tasks automatically extracted by AI from customer conversations.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-6"><Plus className="w-5 h-5" /> New Task</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="premium-card">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Clock className="w-5 h-5 text-blue-500" /></div>
            <h3 className="font-semibold text-lg">To Do</h3>
          </div>
          <p className="text-3xl font-display font-bold">{pendingTasks.length}</p>
        </div>
        <div className="premium-card">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-whatsapp/10 rounded-lg"><CheckCircle2 className="w-5 h-5 text-whatsapp" /></div>
            <h3 className="font-semibold text-lg">Completed</h3>
          </div>
          <p className="text-3xl font-display font-bold">{completedTasks.length}</p>
        </div>
        <div className="premium-card">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg"><AlertCircle className="w-5 h-5 text-amber-500" /></div>
            <h3 className="font-semibold text-lg">Due Soon</h3>
          </div>
          <p className="text-3xl font-display font-bold">
            {pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date(Date.now() + 86400000)).length}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Pending Tasks <span className="text-muted-foreground text-sm font-normal">({pendingTasks.length})</span>
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {pendingTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-card border border-border rounded-2xl p-5 flex items-center gap-6 group hover:border-primary/40 transition-all hover:bg-card/80"
                >
                  <button 
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center hover:border-primary/50 transition-colors shrink-0 group-hover:scale-110"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary/0 group-hover:bg-primary/20 transition-all" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1 truncate text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
                      <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> AI Extracted</span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-muted/50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"><MoreVertical className="w-5 h-5 text-muted-foreground" /></button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {completedTasks.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
              Recently Completed
            </h2>
            <div className="space-y-2 opacity-60">
              {completedTasks.map((task) => (
                <div key={task.id} className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-6">
                  <button 
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className="w-6 h-6 rounded-full bg-whatsapp flex items-center justify-center border border-whatsapp"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </button>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-through text-muted-foreground">{task.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
