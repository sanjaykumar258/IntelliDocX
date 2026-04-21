import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useDispatch } from 'react-redux';
import { updateUserProfile } from '@/features/auth/authSlice';
import { api } from '@/api/client';

export function ModeToggle() {
  const { setTheme } = useTheme()
  const dispatch = useDispatch()

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
    try {
      await api.patch('/users/me', { theme: mode });
      dispatch(updateUserProfile({ theme: mode }));
    } catch (err) {
      console.error('Failed to sync theme', err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass shadow-xl p-2 w-32 border border-slate-200 dark:border-slate-800 rounded-xl">
        <DropdownMenuItem onClick={() => handleThemeChange("light")} className="rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 py-2.5 px-3 mb-1">
          <Sun className="h-4 w-4 mr-3 text-amber-500" />
          <span className="font-semibold text-sm">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 py-2.5 px-3 mb-1">
          <Moon className="h-4 w-4 mr-3 text-indigo-400" />
          <span className="font-semibold text-sm">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")} className="rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 py-2.5 px-3">
          <div className="h-4 w-4 mr-3 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200" />
          <span className="font-semibold text-sm">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
