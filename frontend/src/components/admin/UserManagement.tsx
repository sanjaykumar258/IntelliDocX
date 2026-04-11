import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, ShieldAlert, BadgeCheck, PowerOff, Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = isLengthValid && hasUppercase && hasNumber && hasSpecial;

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setIsSubmitting(true);
    try {
      const organizationId = currentUser?.organizationId || '';
      await api.post('/users', { name, email, password, role, organizationId });
      
      toast({ title: "Success", description: "User provisioned successfully", className: "bg-green-500 text-white border-0" });
      setOpen(false);
      fetchUsers();
      setName(''); setEmail(''); setPassword('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.response?.data?.message || "Failed to create user" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`Revoke access for ${userName}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast({ title: "Access Revoked", description: `Successfully removed user ${userName}`, className: "bg-slate-900 text-white border-0 dark:bg-slate-100 dark:text-slate-900" });
      fetchUsers();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete user" });
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const slideUp = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-indigo-500" />
            Access Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Control who can access your organization's workspace.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/25 transition-all overflow-hidden relative group h-11 px-6 rounded-xl">
              <span className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
              <UserPlus className="w-4 h-4 mr-2" />
              Provision User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Platform User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-5 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500" placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500" placeholder="john@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Key</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500" placeholder="••••••••" />
                {password.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs space-y-2 font-medium">
                    <p className={isLengthValid ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                      <span className="mr-2">{isLengthValid ? '✓' : '○'}</span> At least 8 characters
                    </p>
                    <p className={hasUppercase ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                      <span className="mr-2">{hasUppercase ? '✓' : '○'}</span> One uppercase letter
                    </p>
                    <p className={hasNumber ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                      <span className="mr-2">{hasNumber ? '✓' : '○'}</span> One number
                    </p>
                    <p className={hasSpecial ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>
                      <span className="mr-2">{hasSpecial ? '✓' : '○'}</span> One special character
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clearance Level</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-indigo-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 font-medium">
                    <SelectItem value="SUPER_ADMIN"><span className="text-red-600 dark:text-red-400 font-bold">Super Admin</span></SelectItem>
                    <SelectItem value="ADMIN"><span className="text-purple-600 dark:text-purple-400 font-bold">Admin</span></SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                    <SelectItem value="IT_MANAGER">IT Manager</SelectItem>
                    <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="GUEST">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all" disabled={!isPasswordValid || !name || !email || isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy User Profile"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Directory Table */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p className="font-medium animate-pulse">Loading identity directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <ShieldAlert className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Workspace is empty</p>
            <p className="text-sm mt-1">Provision your first user to populate the directory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Identity</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Contact</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Access Level</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">State</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody 
                className="divide-y divide-slate-100 dark:divide-slate-800/50"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence>
                  {users.map((u) => (
                    <motion.tr 
                      key={u.id}
                      variants={slideUp}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 relative"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-500/20">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-2">
                            {u.name}
                            <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 opacity-50" />
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                          u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 ring-1 ring-red-500/20' : 
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 ring-1 ring-purple-500/20' : 
                          u.role === 'MANAGER' || u.role === 'HR_MANAGER' || u.role === 'IT_MANAGER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-500/20' : 
                          u.role === 'TEAM_LEAD' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 ring-1 ring-teal-500/20' : 
                          u.role === 'GUEST' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-amber-500/20' : 
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-500/20'
                        }`}>
                          {u.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`relative flex h-2 w-2`}>
                            {u.status === 'ACTIVE' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{u.status?.toLowerCase() || 'Active'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={currentUser?.id === u.id}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title="Revoke Access"
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
