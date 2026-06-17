import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const tabs = [
  { id: "mirror", label: "屏幕镜像", caption: "屏幕镜像 — 内置 scrcpy 实现 Android 超低延迟实时镜像" },
  { id: "mirror1", label: "镜像控制", caption: "镜像控制 — 支持嵌入模式与独立弹窗，可调分辨率与比特率" },
  { id: "apps", label: "应用管理", caption: "应用管理 — APK / HAP 安装、卸载、启停、清除数据一应俱全" },
  { id: "screenshot", label: "截图编辑", caption: "截图编辑 — 内置 Konva 画布，支持矩形、箭头、文字多种标注" },
  { id: "record", label: "录屏", caption: "录屏 — Android mp4-muxer 合成 MP4 · HarmonyOS 调用系统自带录屏" },
  { id: "settings", label: "设置", caption: "设置 — 大模型 API、导出目录、工具路径，工具链健康一目了然" },
];

export const Screenshots = () => {
  const [active, setActive] = useState("mirror");
  const current = tabs.find((t) => t.id === active)!;

  return (
    <section id="screenshots" className="scroll-mt-16 py-24 bg-white dark:bg-transparent transition-colors">
      <div className="container mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-2xl mx-auto text-center"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-500 dark:text-primary-400">
            功能截图
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl transition-colors">
            看看实际效果
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 transition-colors">
            真实应用截图，所见即所得。
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${
                active === tab.id
                  ? "border-primary-500/40 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                  : "border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900/50 backdrop-blur-sm transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={`images/${active}.png`}
                  alt={current.label}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-2 border-t border-zinc-200 dark:border-white/10 px-5 py-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shadow-[0_0_6px] shadow-primary-500/50" />
            {current.caption}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
