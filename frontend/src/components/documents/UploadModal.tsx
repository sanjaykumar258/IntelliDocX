import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UploadCloud, X, CheckCircle2, AlertCircle, FileText, Files } from 'lucide-react';
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
      setFiles(prev => [...prev, ...newFiles]);
      setUploadState('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
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
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/documents/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        },
      });

      const { successCount, errorCount, results } = response.data;

      if (errorCount > 0) {
        setUploadState('error');
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: `Uploaded ${successCount} files, but ${errorCount} failed. Check logs for details.`,
        });
        // We might want to keep the modal open or show which ones failed
      } else {
        setUploadState('success');
        toast({
          title: "Upload Successful",
          description: `${successCount} documents have been securely vaulted.`,
          className: "bg-green-500 text-white border-none"
        });
        
        setTimeout(() => {
          setOpen(false);
          setFiles([]);
          setUploadState('idle');
          onUploadSuccess();
        }, 1500);
      }

    } catch (error) {
      setUploadState('error');
      const err = error as any;
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.response?.data?.message || "There was a problem transferring files.",
      });
    }
  };

  const circleLength = 283;
  const strokeDashoffset = circleLength - (progress / 100) * circleLength;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && uploadState === 'uploading') return;
      setOpen(val);
      if (!val) {
        setTimeout(() => {
          setFiles([]);
          setUploadState('idle');
          setProgress(0);
        }, 300);
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/25 transition-all overflow-hidden relative group h-11 px-6 rounded-xl">
          <span className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
          <UploadCloud className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
          Upload Documents
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-2xl p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-center">Transfer Assets</DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {uploadState === 'idle' || uploadState === 'error' ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div
                  className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group
                    ${isDragOver 
                      ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 scale-[1.02]' 
                      : uploadState === 'error'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 outline-none animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input id="file-upload" type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                  
                  <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragOver ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:group-hover:bg-indigo-500/10'}`}>
                    {files.length > 0 ? (
                      <Files className={`w-8 h-8 transition-colors duration-300 ${isDragOver ? 'text-indigo-600' : 'text-indigo-500'}`} />
                    ) : (
                      <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${isDragOver ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500'}`} />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {files.length > 0 ? `${files.length} Files Selected` : 'Upload Data Matrix'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Drag and drop your files here, or click to browse</p>
                </div>

                {files.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    <AnimatePresence>
                      {files.map((f, i) => (
                        <motion.div 
                          key={`${f.name}-${i}`}
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded-xl shrink-0">
                              <FileText className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="w-8 h-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={files.length === 0} 
                  className="w-full h-12 text-base font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 rounded-2xl transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                >
                  {files.length > 1 ? `Initiate Transfer (${files.length} Assets)` : 'Initiate Transfer'}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="relative w-32 h-32 mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="45" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                    <motion.circle 
                      cx="64" 
                      cy="64" 
                      r="45" 
                      className={`stroke-indigo-500 transition-all duration-300 ease-out`}
                      strokeWidth="6" 
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={circleLength}
                      strokeDashoffset={strokeDashoffset}
                      initial={{ strokeDashoffset: circleLength }}
                      animate={{ strokeDashoffset: uploadState === 'success' ? 0 : strokeDashoffset }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {uploadState === 'success' ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                        <CheckCircle2 className="w-10 h-10 text-indigo-500" />
                      </motion.div>
                    ) : (
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{progress}%</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {uploadState === 'success' ? 'Transfer Complete!' : 'Establishing Uplink...'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center px-6">
                  {uploadState === 'success' 
                    ? `Successfully encoded ${files.length} ${files.length === 1 ? 'asset' : 'assets'} into the core network.` 
                    : `Syncing ${files.length} ${files.length === 1 ? 'payload' : 'payloads'} with end-to-end encryption...`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

