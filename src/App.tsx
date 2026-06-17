/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { FeatureGrid } from './components/FeatureGrid';
import { Screenshots } from './components/Screenshots';
import { FeatureTable } from './components/FeatureTable';
import { DevSetup } from './components/DevSetup';
import { Footer } from './components/Footer';

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white selection:bg-primary-500/30 transition-colors duration-300 font-sans">
      <Navbar theme={theme} setTheme={setTheme} />
      
      <main>
        <Hero />
        <hr className="border-zinc-200 dark:border-white/10" />
        <HowItWorks />
        <hr className="border-zinc-200 dark:border-white/10" />
        <FeatureGrid />
        <hr className="border-zinc-200 dark:border-white/10" />
        <Screenshots />
        <hr className="border-zinc-200 dark:border-white/10" />
        <FeatureTable />
        <hr className="border-zinc-200 dark:border-white/10" />
        <DevSetup />
      </main>

      <Footer />
    </div>
  );
}
