import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  Building2, 
  Briefcase, 
  ListChecks,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    business_name: '',
    industry: '',
    services: [] as string[]
  });

  const [servicesInput, setServicesInput] = useState('');

  const nextStep = () => setStep(s => s + 1);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await client.patch(`/users/${user?.id}`, {
        ...profile,
        services: servicesInput.split(',').map(s => s.trim()).filter(Boolean)
      });
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Welcome to Vyavsay",
      subtitle: "Let's personalize your AI sales assistant in 30 seconds.",
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="What is your Business Name?"
                className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-6 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-lg font-medium"
                value={profile.business_name}
                onChange={e => setProfile({...profile, business_name: e.target.value})}
              />
            </div>
            <div className="relative group">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="What industry are you in? (e.g. Solar, Real Estate)"
                className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-6 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-lg"
                value={profile.industry}
                onChange={e => setProfile({...profile, industry: e.target.value})}
              />
            </div>
          </div>
          <button 
            disabled={!profile.business_name || !profile.industry}
            onClick={nextStep}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-3xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )
    },
    {
      title: "What do you sell?",
      subtitle: "The AI uses this to answer customer pricing and service inquiries.",
      icon: ListChecks,
      content: (
        <div className="space-y-6">
          <textarea 
            placeholder="List your products or services (comma separated)..."
            className="w-full h-48 bg-muted/30 border border-border/50 rounded-3xl p-6 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-lg resize-none"
            value={servicesInput}
            onChange={e => setServicesInput(e.target.value)}
          />
          <div className="flex gap-4">
            <button 
              onClick={() => setStep(1)}
              className="flex-1 bg-muted/50 hover:bg-muted text-foreground font-bold py-5 rounded-3xl transition-all"
            >
              Back
            </button>
            <button 
              disabled={!servicesInput.trim() || loading}
              onClick={handleComplete}
              className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-3xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Start using Vyavsay'} 
              {!loading && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-outfit relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-2xl shadow-primary/10">
            {React.createElement(steps[step - 1].icon, { className: "w-10 h-10 text-primary" })}
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tight">{steps[step - 1].title}</h1>
          <p className="text-muted-foreground text-xl leading-relaxed">{steps[step - 1].subtitle}</p>
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-card border border-border/50 rounded-[3.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
          {steps[step - 1].content}
        </motion.div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-3 mt-12">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-500 ${step === i + 1 ? 'w-12 bg-primary' : 'w-2 bg-muted'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
