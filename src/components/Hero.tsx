import { Download, Star, Brain, Eye, Lightbulb, Play, CheckCircle2, Zap, Cpu, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";

type StepType = "think" | "perceive" | "act" | "verify" | "done";

interface DemoStep {
  type: StepType;
  label: string;
  text: string;
}

const demoSteps: DemoStep[] = [
  { type: "think",    label: "思考", text: "当前在桌面，需要先确认微信包名" },
  { type: "perceive", label: "感知", text: "get_installed_apps → 发现包名 com.tencent.mm" },
  { type: "act",      label: "动作", text: "action-launch-app → 冷启动微信应用" },
  { type: "perceive", label: "感知", text: "get_ocr_result → 识别到「我」Tab，坐标 (540, 2280)" },
  { type: "act",      label: "动作", text: "action-find-and-tap → 点击「我」标签" },
  { type: "verify",   label: "校验", text: "重新截图确认 — 已成功进入「我」页面 ✓" },
  { type: "act",      label: "动作", text: "action-screenshot → 截取当前屏幕并保存" },
  { type: "done",     label: "完成", text: "工作流已生成 4 个节点，全部通过实机验证" },
];

const stepConfig: Record<StepType, { icon: typeof Brain; color: string; bg: string; glow: string; border: string }> = {
  think:    { icon: Brain,       color: "text-amber-400",   bg: "bg-amber-500/8",  glow: "shadow-amber-500/20",   border: "border-l-amber-400" },
  perceive: { icon: Eye,         color: "text-sky-400",     bg: "bg-sky-500/8",    glow: "shadow-sky-500/20",     border: "border-l-sky-400" },
  act:      { icon: Play,        color: "text-emerald-400", bg: "bg-emerald-500/8", glow: "shadow-emerald-500/20", border: "border-l-emerald-400" },
  verify:   { icon: CheckCircle2, color: "text-violet-400",  bg: "bg-violet-500/8",  glow: "shadow-violet-500/20",   border: "border-l-violet-400" },
  done:     { icon: Zap,         color: "text-primary-400", bg: "bg-primary-500/8", glow: "shadow-primary-500/20", border: "border-l-primary-400" },
};

// Simulated phone screen states matching agent steps
const phoneStates = [
  { label: "桌面",      desc: "等待指令..." },
  { label: "桌面",      desc: "分析中..." },
  { label: "应用列表",   desc: "查找微信..." },
  { label: "微信启动中", desc: "冷启动..." },
  { label: "微信主页",   desc: "扫描界面..." },
  { label: "微信主页",   desc: "点击「我」" },
  { label: "我",        desc: "校验成功" },
  { label: "我",        desc: "截图保存" },
  { label: "完成",      desc: "工作流就绪" },
];

export const Hero = () => {
  const [version, setVersion] = useState("v2.0.0");
  const [stars, setStars] = useState<number | null>(null);
  const [demoIndex, setDemoIndex] = useState(-1);
  const [showCompletion, setShowCompletion] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [demoIndex]);

  // Demo typing effect
  useEffect(() => {
    if (demoIndex >= demoSteps.length) {
      const t = setTimeout(() => {
        setShowCompletion(true);
        setTimeout(() => {
          setDemoIndex(-1);
          setShowCompletion(false);
        }, 3500);
      }, 1200);
      return () => clearTimeout(t);
    }
    const delay = demoIndex === -1 ? 1200 : demoIndex === 0 ? 1000 : 750;
    const t = setTimeout(() => setDemoIndex((prev) => prev + 1), delay);
    return () => clearTimeout(t);
  }, [demoIndex]);

  useEffect(() => {
    fetch("https://api.github.com/repos/wieszheng/openx/releases/latest")
      .then((res) => res.json())
      .then((data) => { if (data?.tag_name) setVersion(data.tag_name); })
      .catch(() => {});
    fetch("https://api.github.com/repos/wieszheng/openx")
      .then((res) => res.json())
      .then((data) => { if (typeof data?.stargazers_count === "number") setStars(data.stargazers_count); })
      .catch(() => {});
  }, []);

  const currentStep = demoIndex >= 0 && demoIndex < demoSteps.length ? demoSteps[demoIndex] : null;
  const phoneState = demoIndex >= 0 && demoIndex < phoneStates.length ? phoneStates[demoIndex] : phoneStates[0];
  const progress = demoIndex >= 0 ? Math.round((demoIndex / demoSteps.length) * 100) : 0;
  const isComplete = showCompletion;

  return (
    <section className="relative overflow-hidden pt-24 pb-32">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="h-[40rem] w-[60rem] rounded-full bg-primary-400/20 dark:bg-primary-500/10 blur-[100px] transition-colors"
        />
      </div>

      <div className="container mx-auto max-w-6xl px-6 text-center">
        {/* Top section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <a
            href="https://github.com/wieszheng/openx/releases"
            target="_blank"
            rel="noreferrer"
            className="group mx-auto mb-8 flex max-w-fit items-center justify-center gap-3 rounded-full border border-primary-200/50 bg-primary-50/50 p-1 pr-4 shadow-sm backdrop-blur-md transition-all hover:border-primary-300/50 hover:bg-primary-100/50 hover:shadow-primary-500/20 dark:border-primary-500/20 dark:bg-primary-500/10 dark:shadow-[0_0_1000px_0_var(--color-primary-500)] dark:hover:bg-primary-500/20"
          >
            <span className="relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors dark:bg-primary-500">
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
              />
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
              </span>
              <span className="relative font-bold leading-none">{version} 最新更新</span>
            </span>
            <span className="text-sm font-medium text-primary-900/80 transition-colors dark:text-primary-200"> 🎉  · 智能编排 Agent 小X 已上线 </span>
            <ArrowRight className="h-4 w-4 text-primary-500 opacity-50 drop-shadow-sm transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-primary-400" />
          </a>
          <h1 className="text-balance bg-gradient-to-br from-zinc-900 via-primary-600 to-primary-800 dark:from-white dark:via-primary-300 dark:to-primary-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
            一句话，编排移动端自动化
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed transition-colors">
            用自然语言描述你的目标，AI Agent「小X」自动观察界面、思考、动手——
            多模态感知（OCR / 元素识别 / UI 层级），实机边做边验、错了就回退，
            最终沉淀为可复用的自动化节点链。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#setup"
              className="flex w-full sm:w-auto justify-center items-center gap-2 rounded-full bg-primary-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 dark:bg-primary-500 hover:bg-primary-500 dark:hover:bg-primary-400 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="h-4 w-4" />
              立即安装
            </a>
            <a
              href="https://github.com/wieszheng/openx"
              target="_blank"
              rel="noreferrer"
              className="group flex w-full sm:w-auto justify-center items-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur-md transition-all hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-95"
            >
              <Star className="h-4 w-4 text-zinc-500 dark:text-zinc-400 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors" />
              Star on GitHub
              {stars !== null && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:ring-0 dark:bg-white/10 dark:text-zinc-300 transition-colors">
                  {stars}
                </span>
              )}
            </a>
          </div>
        </motion.div>

        {/* ── Demo Window: Dual Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative mx-auto mt-16 w-full max-w-4xl"
        >
          {/* Ambient glow behind the active step */}
          {currentStep && (
            <motion.div
              key={demoIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute -inset-8 rounded-3xl blur-2xl transition-colors -z-10 ${stepConfig[currentStep.type].bg}`}
            />
          )}

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-0 lg:h-[460px]">
            {/* ── Left Panel: Phone Mockup ── */}
            <div className="relative hidden lg:flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                {/* Phone frame */}
                <div className="w-[220px] rounded-[2rem] border-[3px] border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 p-2 shadow-2xl">
                  {/* Notch */}
                  <div className="mx-auto mb-3 h-5 w-1/2 rounded-b-2xl bg-zinc-300 dark:bg-zinc-700" />
                  {/* Screen */}
                  <div className="aspect-[9/19.5] rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden relative border border-zinc-200 dark:border-zinc-700/50">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-3 py-1.5 text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">
                      <span>9:41</span>
                      <span>📶 🔋</span>
                    </div>
                    {/* App content area */}
                    <div className="flex flex-col items-center justify-center h-full -mt-4 px-4 text-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={demoIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.35 }}
                          className="flex flex-col items-center gap-2"
                        >
                          {/* App icon placeholder */}
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-colors ${
                            isComplete ? "bg-gradient-to-br from-primary-400 to-primary-600" :
                            demoIndex < 2 ? "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800" :
                            "bg-gradient-to-br from-emerald-400 to-emerald-600"
                          }`}>
                            {isComplete ? <CheckCircle2 className="h-7 w-7 text-white" /> :
                             demoIndex < 2 ? <Cpu className="h-7 w-7 text-zinc-400 dark:text-zinc-500" /> :
                             <Zap className="h-7 w-7 text-white" />}
                          </div>
                          <p className={`text-xs font-bold transition-colors ${
                            isComplete ? "text-primary-500 dark:text-primary-400" : "text-zinc-600 dark:text-zinc-300"
                          }`}>
                            {phoneState.label}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{phoneState.desc}</p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                  {/* Home indicator */}
                  <div className="mx-auto mt-2 h-1 w-1/3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </motion.div>

              {/* Connection line to agent panel */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-1">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex flex-col gap-0.5"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ x: [0, 4, 0], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      className="h-1 w-1 rounded-full bg-primary-400"
                    />
                  ))}
                </motion.div>
              </div>
            </div>

            {/* ── Right Panel: Agent Terminal ── */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-2xl backdrop-blur-xl ring-1 ring-zinc-200/50 dark:border-white/10 dark:bg-zinc-900/70 dark:ring-white/5 transition-colors">
              {/* ── Header ── */}
              <div className="flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-5 py-3 dark:border-white/10 dark:bg-zinc-900/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="h-4 w-px bg-zinc-300 dark:bg-white/10" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary-500 to-primary-700">
                      <Brain className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">小X Agent</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/50"
                    />
                    <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                      {isComplete ? "已完成" : demoIndex >= 0 ? "运行中" : "就绪"}
                    </span>
                  </div>
                  {/* Step counter */}
                  {demoIndex >= 0 && !isComplete && (
                    <span className="rounded-full bg-zinc-100 dark:bg-white/5 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {progress}%
                    </span>
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <div ref={scrollRef} className="p-5 h-[430px] flex flex-col overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {/* User message bubble */}
                <div className="flex justify-end mb-4">
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-500/10 border border-primary-500/20 px-4 py-2.5"
                  >
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">你的指令</p>
                    <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      打开微信，进入「我」页面并截图
                    </p>
                  </motion.div>
                </div>

                {/* Agent response area */}
                <div className="space-y-3">
                  {/* Already shown steps */}
                  {demoSteps.map((step, i) => {
                    if (i > demoIndex) return null;
                    const cfg = stepConfig[step.type];
                    const Icon = cfg.icon;
                    const isLatest = i === demoIndex && !isComplete;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex gap-3"
                      >
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                            isLatest
                              ? `${cfg.bg} border-current ${cfg.color} shadow-sm ${cfg.glow}`
                              : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-zinc-500"
                          }`}>
                            <Icon className={`h-3.5 w-3.5 ${isLatest ? cfg.color : ""}`} />
                          </div>
                          {i < demoSteps.length - 1 && (
                            <div className={`w-px flex-1 min-h-[8px] mt-1 transition-colors ${
                              i < demoIndex ? "bg-primary-500/30" : "bg-zinc-200 dark:bg-white/5"
                            }`} />
                          )}
                        </div>

                        {/* Step content */}
                        <div className={`flex-1 rounded-xl border px-3.5 py-2.5 transition-all ${
                          isLatest
                            ? `${cfg.bg} border-current/20 shadow-sm`
                            : "bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-100 dark:border-white/5"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${isLatest ? cfg.color : "text-zinc-400 dark:text-zinc-500"}`}>
                              {step.label}
                            </span>
                            {isLatest && (
                              <span className="flex gap-1">
                                <motion.span
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="h-1 w-1 rounded-full bg-current"
                                />
                                <motion.span
                                  animate={{ opacity: [1, 0.2, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="h-1 w-1 rounded-full bg-current"
                                />
                                <motion.span
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                  className="h-1 w-1 rounded-full bg-current"
                                />
                              </span>
                            )}
                          </div>
                          <p className={`text-[13px] leading-relaxed ${
                            isLatest ? "text-zinc-700 dark:text-zinc-200 font-medium" : "text-zinc-500 dark:text-zinc-400"
                          }`}>
                            {step.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Idle state */}
                  {demoIndex < 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                        <div className="flex items-center gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ scaleY: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="h-3 w-0.5 rounded-full bg-primary-400/60"
                            />
                          ))}
                        </div>
                        <span className="text-xs">等待指令...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Completion overlay */}
                <AnimatePresence>
                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="-mx-5 -mb-5 mt-4 border-t border-primary-500/20 bg-primary-500/5 px-5 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20">
                          <CheckCircle2 className="h-4 w-4 text-primary-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">工作流构建完成</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">所有步骤已通过实机验证，生成 4 个可复用节点</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Platform badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-xs font-medium text-purple-500 dark:text-purple-400">
            <span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px] shadow-purple-500/50" />
            自然语言编排
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/50" />
            Android · ADB
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px] shadow-blue-500/50" />
            HarmonyOS · HDC
          </span>
        </motion.div>
      </div>
    </section>
  );
};
