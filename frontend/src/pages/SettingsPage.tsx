import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Building2, 
  Bell, 
  ShieldCheck, 
  Palette, 
  Camera,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  History
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateUser2FA, updateUserProfile } from '@/features/auth/authSlice';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { api } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '@/components/theme-provider';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export const SettingsPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accent') || '#6366f1');
  const { toast } = useToast();
  const dispatch = useDispatch();

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState((user as any)?.isTwoFactorEnabled || false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Fetch profile details
  useEffect(() => {
    if (activeTab === 'profile') {
      api.get('/users/me').then(res => {
        if (res.data.user) {
          setDisplayName(res.data.user.name);
          if (res.data.user.avatarUrl) setAvatar(res.data.user.avatarUrl);
        }
      }).catch((err) => {
        // If 401, token is stale — force re-login
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        console.error(err);
      });
    }
  }, [activeTab]);

  // Fetch sessions
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await api.get(`/auth/sessions${refreshToken ? '?refreshToken=' + refreshToken : ''}`);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast({ title: '✅ Session Revoked', description: 'The session has been terminated successfully.' });
      fetchSessions();
    } catch (e) {
      toast({ title: 'Error revoking session', variant: 'destructive' });
    }
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.delete('/auth/sessions/all', { data: { refreshToken } });
      toast({ title: '✅ All Other Sessions Revoked', description: 'All other active sessions have been terminated.', className: 'bg-primary text-white border-0' });
      await fetchSessions();
    } catch (e) {
      toast({ title: 'Error revoking sessions', variant: 'destructive' });
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleEnable2fa = async () => {
    try {
      const { data } = await api.post('/auth/2fa/enable');
      setQrCodeUrl(data.qrCode);
      setIs2faModalOpen(true);
    } catch (e) {
      toast({ title: 'Error generating 2FA', variant: 'destructive' });
    }
  };

  const handleVerify2fa = async () => {
    if (!otpToken || otpToken.length !== 6) {
       toast({ title: 'Invalid Token format', variant: 'destructive' });
       return;
    }
    try {
      await api.post('/auth/2fa/verify', { token: otpToken });
      setIsTwoFactorEnabled(true);
      dispatch(updateUser2FA(true));
      setIs2faModalOpen(false);
      setOtpToken('');
      toast({ title: '✅ 2FA Enabled successfully', className: 'bg-emerald-600 text-white border-0' });
    } catch (e) {
      toast({ title: 'Invalid code, try again', variant: 'destructive' });
    }
  };

  const handleDisable2fa = async () => {
    if (!window.confirm("Are you sure you want to disable 2FA? This lowers your account security.")) return;
    const token = window.prompt("Enter your current 6-digit Authenticator code to disable:");
    if (!token) return;
    try {
      await api.post('/auth/2fa/disable', { token });
      setIsTwoFactorEnabled(false);
      dispatch(updateUser2FA(false));
      toast({ title: '✅ 2FA Disabled successfully', className: 'bg-rose-600 text-white border-0' });
    } catch (e) {
      toast({ title: 'Verification failed', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!displayName || displayName.trim().length < 2) {
      toast({ title: 'Name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // If there's a new avatar file, upload it first via multipart form data
      let uploadedAvatarUrl = avatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await api.post('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedAvatarUrl = uploadRes.data.avatarUrl;
      }

      // Now save the profile (name + avatar url)
      const { data } = await api.patch('/users/me', { 
        name: displayName.trim(), 
        avatar: uploadedAvatarUrl 
      });

      const updatedName = data.user?.name || displayName;
      const updatedAvatar = data.user?.avatarUrl ?? uploadedAvatarUrl;

      // Add cache-busting timestamp for image refresh
      const cacheBustedAvatar = updatedAvatar 
        ? (updatedAvatar.startsWith('data:') ? updatedAvatar : `${updatedAvatar.split('?')[0]}?t=${Date.now()}`)
        : null;

      // Update local state
      setAvatar(cacheBustedAvatar);
      setDisplayName(updatedName);
      setAvatarFile(null);

      // Update Redux state so Header + Navbar reflect changes IMMEDIATELY
      dispatch(updateUserProfile({
        name: updatedName,
        avatarUrl: cacheBustedAvatar,
      }));

      toast({ 
        title: '✅ Profile Updated', 
        description: 'Your display name and profile image have been saved.', 
        className: 'bg-emerald-600 text-white border-0' 
      });
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Failed to save profile';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store file for multipart upload on save
      setAvatarFile(file);
      // Preview the image immediately using data URL
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
      toast({ title: '📷 Image selected', description: 'Click "Save Changes" to apply.' });
    }
  };

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
    try {
      await api.patch('/users/me', { theme: mode });
      dispatch(updateUserProfile({ theme: mode }));
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  };

  const handleAccentColorChange = async (color: string) => {
    setAccentColor(color);
    localStorage.setItem('accent', color);
    document.documentElement.style.setProperty('--app-accent', color);
    // Convert hex to HSL for dynamic Tailwind `--primary` mapping
    const hexToHSL = (H: string) => {
      let r = 0, g = 0, b = 0;
      if (H.length === 4) {
        r = parseInt(H[1] + H[1], 16);
        g = parseInt(H[2] + H[2], 16);
        b = parseInt(H[3] + H[3], 16);
      } else if (H.length === 7) {
        r = parseInt(H.substring(1, 3), 16);
        g = parseInt(H.substring(3, 5), 16);
        b = parseInt(H.substring(5, 7), 16);
      }
      r /= 255; g /= 255; b /= 255;
      const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
      let h = 0, s = 0, l = 0;
      if (delta === 0) h = 0;
      else if (cmax === r) h = ((g - b) / delta) % 6;
      else if (cmax === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      l = (cmax + cmin) / 2;
      s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
      s = +(s * 100).toFixed(1);
      l = +(l * 100).toFixed(1);
      return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
    };
    document.documentElement.style.setProperty('--primary', hexToHSL(color));

    try {
      await api.patch('/users/me', { accentColor: color });
      dispatch(updateUserProfile({ accentColor: color }));
    } catch (err) {
      console.error('Failed to save accent color', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Manage your account preferences and global security configuration.
        </p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-1 sticky top-24">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden",
                activeTab === tab.id 
                  ? "bg-white dark:bg-slate-900 shadow-md ring-1 ring-slate-200 dark:ring-slate-800" 
                  : "hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-slate-500 dark:text-slate-400"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                />
              )}
              <tab.icon className={cn(
                "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                activeTab === tab.id ? "text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              )} />
              <span className={cn(
                "text-sm font-bold tracking-tight",
                activeTab === tab.id ? "text-slate-900 dark:text-white" : ""
              )}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6"
        >
          {activeTab === 'profile' && (
            <Card className="glass overflow-hidden border-none shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Account Intelligence</CardTitle>
                <CardDescription>Identity and profile personalization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl overflow-hidden">
                      {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : user?.name?.charAt(0)}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group-hover:scale-110">
                      <Camera className="w-4 h-4 text-primary" />
                      <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                    </label>
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{displayName || user?.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                        {user?.role}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">ID: {user?.id?.slice(-8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Email Address</Label>
                    <Input defaultValue={user?.email || ''} readOnly className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed" />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} isLoading={isSaving} className="bg-primary hover:bg-primary rounded-xl px-8 shadow-lg shadow-primary/20">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="glass border-none shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Communication Protocol</CardTitle>
                <CardDescription>Configure how you receive real-time updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Document Uploads', desc: 'Notify when new documents are added to your org' },
                  { title: 'Workflow Transitions', desc: 'Updates on document approvals and status changes' },
                  { title: 'Security Alerts', desc: 'Critical alerts regarding blockchain and access integrity' },
                  { title: 'Internal Messaging', desc: 'Notifications for document group chats' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={i < 3} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <div className="grid gap-6">
              <Card className="glass border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Global Access Guard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-primary">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold tracking-tight">Two-Factor Authentication</p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Enhanced Security Protocol</p>
                      </div>
                    </div>
                    {isTwoFactorEnabled ? (
                      <Button variant="outline" onClick={handleDisable2fa} className="rounded-xl border-emerald-500 text-emerald-600 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 transition-colors">
                         Enabled
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleEnable2fa} className="rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white">
                         Enable 2FA
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pl-1">
                      <History className="w-3 h-3" />
                      Active Identities
                    </h4>
                    {sessionsLoading ? <p className="text-xs text-slate-400 pl-1">Loading sessions...</p> : sessions.length === 0 && <p className="text-xs text-slate-400 pl-1">No active sessions.</p>}
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold">{session.device}</p>
                          <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                            {session.location} • {formatDistanceToNow(new Date(session.time), { addSuffix: true })}
                          </p>
                        </div>
                        {session.isCurrent ? (
                           <span className="text-[10px] font-black text-green-500 uppercase">Current</span>
                        ) : (
                          <Button variant="ghost" onClick={() => handleRevokeSession(session.id)} size="sm" className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 p-0 font-bold">Terminate</Button>
                        )}
                      </div>
                     ))}
                  </div>
                </CardContent>
              </Card>
              
              <Button 
                onClick={handleRevokeAllSessions} 
                variant="outline" 
                isLoading={isRevokingAll}
                className="w-full rounded-2xl border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold py-6 group"
              >
                <CheckCircle2 className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                Revoke All Active Identity Tokens
              </Button>
            </div>
          )}

          {activeTab === 'organization' && (
            <Card className="glass border-none shadow-xl border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight">Organization Profile</CardTitle>
                <CardDescription>Enterprise entity configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Corporation Name</Label>
                    <Input defaultValue="IntelliDocX Corp" placeholder="Org Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Global Storage Provider</Label>
                    <Input defaultValue="MinIO Central - Node S3" readOnly className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-mono" />
                  </div>
                 </div>
                 <div className="pt-4 p-4 rounded-2xl bg-slate-950 text-white shadow-inner">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Blockchain Integrity</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 border-r border-white/10 pr-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network Status</p>
                        <p className="text-sm font-bold">Ganache Localnet</p>
                      </div>
                      <div className="space-y-1 pl-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Digital Signatures</p>
                        <p className="text-sm font-bold">Active & Verified</p>
                      </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="glass border-none shadow-xl overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[64px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
               <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight">Visual Aesthetics</CardTitle>
                <CardDescription>Personalize your interface experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pb-12">
                 <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Theme Preferences</Label>
                    <div className="grid grid-cols-3 gap-4">
                       {(['light', 'dark', 'system'] as const).map((mode) => {
                         const isActive = theme === mode;
                         return (
                           <button
                             key={mode}
                             onClick={() => handleThemeChange(mode)}
                             className={cn(
                               'flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all shadow-md relative group',
                               isActive 
                                 ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-slate-900' 
                                 : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                             )}
                           >
                             <div className={cn(
                               'w-full h-12 rounded-lg mb-1 border-t-2 overflow-hidden flex flex-col',
                               isActive ? 'border-primary' : 'border-slate-200 dark:border-slate-800'
                             )}>
                               <div className={cn('flex-1', mode === 'dark' || (mode === 'system' && isActive) ? 'bg-slate-900' : 'bg-slate-100')} />
                               <div className={cn('h-1/3', mode === 'dark' || (mode === 'system' && isActive) ? 'bg-slate-800' : 'bg-slate-200')} />
                             </div>
                             <span className={cn(
                               'text-xs font-bold capitalize transition-colors',
                               isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                             )}>
                               {mode}
                             </span>
                             {isActive && (
                               <div className="absolute top-2 right-2">
                                 <CheckCircle2 className="w-4 h-4 text-primary" />
                               </div>
                             )}
                           </button>
                         );
                       })}
                     </div>
                 </div>
                 
                 <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Global Accent Color</Label>
                    <div className="flex gap-4">
                      {['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#10b981'].map((color) => (
                        <button 
                          key={color} 
                          onClick={() => handleAccentColorChange(color)}
                          className={cn("w-10 h-10 rounded-full shadow-lg border-2 ring-2 transition-all", accentColor === color ? 'border-primary ring-primary/50 scale-110' : 'border-white dark:border-slate-900 ring-transparent hover:ring-primary')} 
                          style={{ backgroundColor: color }} 
                        />
                      ))}
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <Dialog open={is2faModalOpen} onOpenChange={setIs2faModalOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl glass">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Configure 2FA
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your Authenticator app (Google, Microsoft, Authy) and enter the 6-digit PIN to enable.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
             <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-200">
               {qrCodeUrl ? (
                 <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
               ) : (
                 <div className="w-48 h-48 flex items-center justify-center text-slate-400">Loading...</div>
               )}
             </div>
             
             <div className="w-full max-w-xs space-y-2">
               <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1 text-center block">Authentication PIN</Label>
               <Input 
                 autoFocus
                 className="text-center font-mono text-2xl tracking-[0.5em] h-14" 
                 value={otpToken}
                 onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                 placeholder="000000"
                 maxLength={6}
               />
             </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setIs2faModalOpen(false)}>Cancel</Button>
            <Button onClick={handleVerify2fa} className="bg-primary hover:bg-primary text-white rounded-xl shadow-md">
               Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
