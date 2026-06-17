import { Github } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-white/10 dark:bg-black py-12 transition-colors">
      <div className="container mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20 text-white">
            <Logo className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-zinc-900 dark:text-white tracking-tight block transition-colors">OpenX</span>
            <span className="text-xs text-zinc-500">Android & HarmonyOS Device Management</span>
          </div>
        </div>

        <div className="text-sm text-zinc-500 text-center">
          <p>Apache 2.0 License · <a href="https://github.com/wieszheng/openx" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">GitHub</a></p>
          <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">Built with Electron · React · TailwindCSS · scrcpy</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            Created with ♥ by{" "}
            <a href="https://github.com/wieszheng" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors">
              wieszheng
            </a>
          </span>
          <a
            href="https://github.com/wieszheng/openx"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors p-1"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
