import { Eye, Lightbulb, Play, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    icon: Eye,
    num: "01",
    title: "感知",
    desc: "截图 + OCR 文字、通用元素识别、UI 层级清洗，拿到带坐标的可交互元素。",
    color: "sky",
  },
  {
    icon: Lightbulb,
    num: "02",
    title: "规划",
    desc: "结合目标与历史，思考下一步，只输出一个动作；必要时先加载技能获取经验。",
    color: "purple",
  },
  {
    icon: Play,
    num: "03",
    title: "执行",
    desc: "实机模式下先在真机执行，成功才落入画布；失败把设备真实报错喂回自愈。",
    color: "emerald",
  },
  {
    icon: CheckCircle2,
    num: "04",
    title: "校验",
    desc: "重新截图确认界面变化；没达预期就回退删除错误节点，重新感知规划。",
    color: "primary",
  },
];

const colorSet: Record<string, {
  bar: string; ring: string; bg: string; text: string; dot: string; iconBg: string;
}> = {
  sky: {
    bar: "bg-sky-400",
    ring: "ring-sky-200 dark:ring-sky-500/20",
    bg: "bg-sky-50 dark:bg-sky-500/5",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-400 shadow-sky-400/50",
    iconBg: "bg-sky-100 dark:bg-sky-500/15",
  },
  purple: {
    bar: "bg-purple-400",
    ring: "ring-purple-200 dark:ring-purple-500/20",
    bg: "bg-purple-50 dark:bg-purple-500/5",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-400 shadow-purple-400/50",
    iconBg: "bg-purple-100 dark:bg-purple-500/15",
  },
  emerald: {
    bar: "bg-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-500/20",
    bg: "bg-emerald-50 dark:bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-400 shadow-emerald-400/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  primary: {
    bar: "bg-primary-400",
    ring: "ring-primary-200 dark:ring-primary-500/20",
    bg: "bg-primary-50 dark:bg-primary-500/5",
    text: "text-primary-600 dark:text-primary-400",
    dot: "bg-primary-400 shadow-primary-400/50",
    iconBg: "bg-primary-100 dark:bg-primary-500/15",
  },
};

export const HowItWorks = () => {
  return (
    <section id="how" className="scroll-mt-16 py-24 bg-zinc-50 dark:bg-zinc-950/50 transition-colors">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-20 max-w-2xl mx-auto text-center"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-500 dark:text-primary-400">
            工作原理
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl transition-colors">
            观察 — 思考 — 行动，单步推进
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 transition-colors">
            小X 每一轮只做一件事：看清当前界面，规划下一个动作，执行后立刻校验。错了就回退重规划，对了再走下一步。
          </p>
        </motion.div>

        {/* ── Horizontal Process Flow ── */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[15%] right-[15%] h-0.5 bg-zinc-200 dark:bg-white/10" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const c = colorSet[step.color];
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="relative flex flex-col items-center text-center group"
                >
                  {/* Step dot on the line */}
                  <div className="relative z-10 mb-6">
                    {/* Outer ring */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${c.bg} ring-1 ${c.ring} shadow-sm transition-shadow group-hover:shadow-md`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                        <Icon className={`h-5 w-5 ${c.text}`} />
                      </div>
                      {/* Step number badge */}
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-[10px] font-bold text-zinc-500">
                        {step.num}
                      </span>
                    </motion.div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 transition-colors max-w-[240px]">
                    {step.desc}
                  </p>

                  {/* Desktop arrow between steps */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-[60px] -right-5 items-center text-zinc-300 dark:text-zinc-600">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-16"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary-500/20 bg-primary-50/50 dark:bg-primary-500/5 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              最终留在画布上的，都是<strong className="text-primary-600 dark:text-primary-400 font-semibold">经过实机验证、确实有效</strong>的步骤 — 一条可复用、可再次运行的自动化工作流。
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
