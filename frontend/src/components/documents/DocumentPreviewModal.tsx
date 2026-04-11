import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  mimeType: string;
  onDownload: (id: string) => void;
}

export const DocumentPreviewModal = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  mimeType,
  onDownload
}: DocumentPreviewModalProps) => {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    
    const fetchPreview = async () => {
      if (isOpen && documentId) {
        setLoading(true);
        try {
          const response = await api.get(`/documents/${documentId}/download?inline=true`, { 
            responseType: 'blob' 
          });
          const blob = new Blob([response.data], { type: mimeType });
          objectUrl = window.URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        } catch (error) {
          console.error("Preview load failed", error);
          setPreviewUrl(null);
        } finally {
          setLoading(false);
        }
      } else {
        setPreviewUrl(null);
      }
    };
    
    fetchPreview();
    
    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, documentId, mimeType]);

  const isPDF = mimeType.includes('pdf');
  const isImage = mimeType.includes('image') || mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg');

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-slate-900/95 border-slate-800 backdrop-blur-3xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPDF ? 'bg-rose-500/20 text-rose-400' : isImage ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {isPDF ? <FileText size={20} /> : isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <DialogTitle className="text-white font-bold leading-tight truncate max-w-[400px]">
                {documentTitle}
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                {mimeType} • PREVIEW MODE
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white hover:bg-white/10"
                onClick={() => onDownload(documentId)}
            >
              <Download size={16} className="mr-2" /> Download
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                onClick={onClose}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-slate-950/50 overflow-hidden">
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10"
              >
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400 font-mono text-sm tracking-widest animate-pulse">LOADING ASSET CONTENT</p>
              </motion.div>
            )}
          </AnimatePresence>

          {previewUrl && (
            <div className="w-full h-full">
              {isPDF ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-full border-none"
                  onLoad={() => setLoading(false)}
                  title={documentTitle}
                />
              ) : isImage ? (
                <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                    <img 
                        src={previewUrl} 
                        alt={documentTitle} 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                        onLoad={() => setLoading(false)}
                    />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
                    <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                        <FileText size={48} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Preview Unavailable</h3>
                    <p className="text-slate-400 max-w-sm mb-8">
                        This file format ({mimeType}) cannot be rendered directly in the browser. 
                        Please download the file to view its content.
                    </p>
                    <Button 
                        onClick={() => onDownload(documentId)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-xl h-12 shadow-lg shadow-indigo-500/20"
                    >
                        <Download size={18} className="mr-2" /> Download Document
                    </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
