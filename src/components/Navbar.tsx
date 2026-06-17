import { Github, Sun, Moon } from "lucide-react";
import React from "react";
import { Logo } from "./Logo";

export const Navbar = ({ theme, setTheme }: { theme: "dark" | "light"; setTheme: (t: "dark" | "light") => void }) => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 dark:border-white/10 dark:bg-black/50 backdrop-blur-md transition-colors duration-300">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20 text-white">
            <Logo className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">OpenX</span>
          <span className="ml-1 rounded-md border border-primary-500/30 bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-bold text-primary-500 dark:text-primary-400">v2.0</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <a href="#how" className="hover:text-zinc-900 dark:hover:text-white transition-colors">工作原理</a>
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">核心能力</a>
          <a href="#screenshots" className="hover:text-zinc-900 dark:hover:text-white transition-colors">功能截图</a>
          <a href="#compat" className="hover:text-zinc-900 dark:hover:text-white transition-colors">兼容性</a>
          <a href="#setup" className="hover:text-zinc-900 dark:hover:text-white transition-colors">安装</a>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/50 dark:border-white/10 dark:bg-white/5 text-zinc-600 dark:text-white transition-colors hover:bg-zinc-100 dark:hover:bg-white/10"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://github.com/wieszheng/openx"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 dark:bg-primary-500 hover:bg-primary-500 dark:hover:bg-primary-400 transition-all hover:scale-105 active:scale-95"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
};
