import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Megaphone, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AnnouncementsWidget = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get('/hr/announcements').then(res => setAnnouncements(res.data)).catch(() => {});
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="shimmer-line absolute inset-0" />
      </div>
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Announcements</h3>
          <p className="text-[10px] font-semibold text-slate-400">From HR Department</p>
        </div>
      </div>

      <div className="space-y-3">
        {announcements.slice(0, 3).map((ann) => (
          <button
            key={ann.id}
            onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
            className="w-full text-left p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all group"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ann.title}</p>
              <span className="shrink-0 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(ann.publishedAt), { addSuffix: true })}
              </span>
            </div>
            {expanded === ann.id ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{ann.body}</p>
            ) : (
              <p className="text-[10px] text-slate-400 truncate">{ann.body}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
