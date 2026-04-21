import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UploadCloud, X, CheckCircle2, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadModalProps {
  onUploadSuccess: () => void;
}

export const UploadModal = ({ onUploadSuccess }: UploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 15) {
        toast({
          variant: "destructive",
          title: "Capacity Exceeded",
          description: "For security integrity, batches are limited to 15 assets.",
        });
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      setUploadState('idle');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (files.length + newFiles.length > 15) {
        toast({
          variant: "destructive",
          title: "Capacity Exceeded",
          description: "Batch limit reached. Please upload 15 files or fewer.",
        });
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      setUploadState('idle');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploadState('uploading');
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await api.post('/documents/upload', formData, {
        onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / (p.total || 1))),
      });

      if (response.data.errorCount > 0) {
        setUploadState('error');
        toast({ variant: "destructive", title: "Partial Sync", description: "Some packets were lost during transmission." });
      } else {
        setUploadState('success');
        toast({ title: "Vault Sync Complete", description: "All assets have been successfully encrypted and stored." });
        setTimeout(() => {
          setOpen(false);
          setFiles([]);
          setUploadState('idle');
          onUploadSuccess();
        }, 2000);
      }
    } catch (error) {
      setUploadState('error');
      toast({ variant: "destructive", title: "Sync Failed", description: "The encrypted uplink could not be established." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="relative h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] transition-all group overflow-hidden border-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <UploadCloud className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
          <span>Upload Assets</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-slate-200/50 dark:border-slate-800/50 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] p-0 flex flex-col">
        {/* Top Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Secure Transfer</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">End-to-End Encrypted Vaulting</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {uploadState === 'idle' || uploadState === 'error' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 pt-2">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative border-2 border-dashed rounded-[32px] p-10 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
                    ${isDragOver ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02]' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <Input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                  <div className={`w-16 h-16 rounded-[24px] mb-4 flex items-center justify-center transition-all duration-500 ${isDragOver ? 'bg-indigo-600 text-white shadow-xl rotate-12' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Upload Data Matrix</h3>
                  <p className="text-sm text-slate-500 font-bold">Files selected: <span className="text-indigo-600">{files.length}</span> / 15</p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selected Assets</p>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {files.map((f, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl group hover:border-indigo-500/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <FileText className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[200px]">{f.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{(f.size / 1024 / 1024).toFixed(2)} MB • READY</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><X className="w-3.5 h-3.5" /></Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="80" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="10" fill="transparent" />
                    <motion.circle cx="96" cy="96" r="80" className="stroke-indigo-600" strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={502} initial={{ strokeDashoffset: 502 }} animate={{ strokeDashoffset: 502 - (progress / 100) * 502 }} transition={{ duration: 0.5 }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {uploadState === 'success' ? (
                      <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/30"><CheckCircle2 className="w-10 h-10 text-white" /></div>
                    ) : (
                      <span className="text-4xl font-black text-indigo-700 dark:text-indigo-400">{progress}%</span>
                    )}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{uploadState === 'success' ? 'Vaulting Secured' : 'Syncing Neural Bridge'}</h3>
                <p className="text-slate-500 font-bold max-w-[280px]">{uploadState === 'success' ? 'All files have been successfully ingested into the core vault.' : 'Establishing a high-bandwidth encrypted pipeline...'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Footer — only shown when idle or on error; hidden during uploading/success */}
        {(uploadState === 'idle' || uploadState === 'error') && (
          <div className="px-8 py-6 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/50 shrink-0">
            <Button
              onClick={handleUpload}
              disabled={files.length === 0}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-3xl shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span>Initiate Neural Transfer</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
