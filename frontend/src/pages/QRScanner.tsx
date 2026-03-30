import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { 
  QrCode as QrIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Smartphone,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QRScanner: React.FC = () => {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const isRecoveringSession = useRef(false);
  const disconnectedPollsRef = useRef(0);
  const forcedResetRef = useRef(false);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (status === 'scanning' && user) {
      console.log('🔄 [QR] Starting polling for', user.id);
      
      const poll = async () => {
        try {
          const res = await client.get(`/sessions/${user.id}/status`);
          const data = res.data;
          const backendStatus = data.status as string;

          if (data.qrDataUrl) {
            setQrCodeUrl(data.qrDataUrl);
            disconnectedPollsRef.current = 0;
          }

          if (backendStatus === 'connected') {
            setPhone(data.phone);
            setStatus('connected');
            if (pollInterval) clearInterval(pollInterval);
            return;
          }

          // Both 'qr_pending' and 'connecting' are normal — don't interfere
          if (backendStatus === 'qr_pending' || backendStatus === 'connecting') {
            setStatus('scanning');
            disconnectedPollsRef.current = 0;
            return; // Let Baileys do its thing
          }

          // Only try to create a session if there's truly NO session
          if (backendStatus === 'no_session' && !isRecoveringSession.current) {
            isRecoveringSession.current = true;
            try {
              await client.post('/sessions', { userId: user.id });
            } finally {
              isRecoveringSession.current = false;
            }
            return;
          }

          // 'disconnected' — Baileys may be auto-reconnecting. Be patient!
          if (backendStatus === 'disconnected') {
            disconnectedPollsRef.current++;
            
            // Only after 30+ seconds (15 polls x 2s) of continuous disconnect, offer retry
            if (disconnectedPollsRef.current >= 15) {
              setError('Connection lost. Please try scanning the QR code again.');
              setStatus('error');
              if (pollInterval) clearInterval(pollInterval);
              return;
            }
            
            // Otherwise just wait — Baileys is reconnecting on the backend
            return;
          }

          if (backendStatus === 'error') {
            setError(data.message || 'Connection failed');
            setStatus('error');
            if (pollInterval) clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Polling failed', err);
          // Don't set error status here, let it retry
        }
      };

      // Poll every 2 seconds
      poll();
      pollInterval = setInterval(poll, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [status, user]);

  const startConnection = async () => {
    if (!user) return;
    isRecoveringSession.current = false;
    disconnectedPollsRef.current = 0;
    forcedResetRef.current = false;
    setError(null);
    setQrCodeUrl(null);
    setStatus('scanning');
    try {
      await client.post('/sessions', { userId: user.id });
    } catch (err) {
      console.error('Failed to start session', err);
      setError('Failed to start session. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-12 font-outfit">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Connect WhatsApp</h1>
        <p className="text-muted-foreground text-xl font-medium">Link your business phone to activate the AI Sales Copilot.</p>
      </div>

      <motion.div 
        layout
        className="bg-card border border-border/50 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl"
      >
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-16 flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <QrIcon className="w-12 h-12 text-primary" />
              </div>
              <div className="text-center max-w-sm space-y-3">
                <h3 className="text-2xl font-bold">Ready to sync?</h3>
                <p className="text-base text-muted-foreground">Click below to generate a secure QR code. You'll scan this from your phone's WhatsApp settings.</p>
              </div>
              <button 
                onClick={startConnection}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 text-xl"
              >
                Generate QR Code
              </button>
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center gap-10"
            >
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse border border-primary/20">
                  <Smartphone className="w-4 h-4" /> Waiting for Scan
                </div>
                <h3 className="text-3xl font-bold">Scan with your Phone</h3>
              </div>

              <div className="relative p-10 bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors z-20 pointer-events-none" />
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-[300px] h-[300px] relative z-10" />
                ) : (
                  <div className="w-[300px] h-[300px] flex items-center justify-center relative z-10">
                    <RefreshCw className="w-16 h-16 text-slate-200 animate-spin" />
                  </div>
                )}
              </div>

              <div className="max-w-md w-full bg-muted/30 border border-border/50 p-8 rounded-3xl flex gap-6">
                <div className="shrink-0 w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Info className="w-6 h-6" />
                </div>
                <div className="text-sm space-y-2 font-medium">
                  <p className="font-bold text-foreground text-base">Steps to connect:</p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-1.5 marker:text-primary">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings {'>'} Linked Devices</li>
                    <li>Tap on 'Link a Device' and scan the code</li>
                  </ol>
                </div>
              </div>

              <button 
                onClick={() => setStatus('idle')}
                className="text-muted-foreground hover:text-white transition-colors text-sm font-bold uppercase tracking-widest underline underline-offset-8 decoration-primary/30"
              >
                Cancel Process
              </button>
            </motion.div>
          )}

          {status === 'connected' && (
            <motion.div 
              key="connected"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-16 flex flex-col items-center gap-8"
            >
              <div className="w-28 h-28 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-4xl font-extrabold text-white">Device Linked!</h3>
                <p className="text-muted-foreground text-lg">Successfully connected with <span className="text-primary font-black">{phone}</span></p>
              </div>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-primary hover:bg-primary/90 text-white font-bold py-5 px-12 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 text-lg"
              >
                Launch Dashboard
              </button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-bold text-red-500">Connection Failed</h3>
                <p className="text-muted-foreground font-medium">{error}</p>
              </div>
              <button 
                onClick={startConnection}
                className="bg-card border border-border px-10 py-4 rounded-xl font-bold hover:bg-muted transition-all"
              >
                Retry Scan
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default QRScanner;
