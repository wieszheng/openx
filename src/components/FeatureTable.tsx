import { Check, Minus } from "lucide-react";
import { motion } from "motion/react";

const matrix = [
  { feature: "智能编排 Agent", android: "✅ 自然语言 → 自动化节点链", harmony: "✅ 自然语言 → 自动化节点链" },
  { feature: "多模态感知", android: "✅ OCR · 元素识别 · UI 层级清洗", harmony: "✅ OCR · 元素识别 · UI 层级清洗" },
  { feature: "实机执行与自愈回退", android: "✅", harmony: "✅" },
  { feature: "设备发现与管理", android: "✅ ADB 自动追踪", harmony: "✅ HDC 自动追踪" },
  { feature: "屏幕镜像（嵌入/弹窗）", android: "✅ scrcpy", harmony: "✅ UiDriver" },
  { feature: "截图 + 标注编辑", android: "✅ Konva 画布编辑器", harmony: "✅ Konva 画布编辑器" },
  { feature: "录屏", android: "✅ mp4-muxer 合成 MP4", harmony: "✅ 系统自带录屏" },
  { feature: "应用安装 / 卸载", android: "✅ APK", harmony: "✅ HAP" },
  { feature: "文件管理", android: "✅ 上传/下载/删除/新建目录", harmony: "✅ 上传/下载/删除/新建目录" },
  { feature: "全局变量管理", android: "✅ 持久化键值存储", harmony: "✅ 持久化键值存储" },
  { feature: "应用内自动更新", android: "✅ electron-updater", harmony: "✅ electron-updater" },
];

export const FeatureTable = () => {
  return (
    <section id="compat" className="scroll-mt-16 py-24 bg-zinc-50 dark:bg-zinc-950/50 transition-colors">
      <div className="container mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-500 dark:text-primary-400">
            功能支持矩阵
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl transition-colors">
            双平台覆盖
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 transition-colors">
            明确了解每项功能在 Android 和 HarmonyOS 上的支持情况。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:shadow-none dark:border-white/10 dark:bg-zinc-900/50 backdrop-blur-sm transition-colors"
        >
          <div className="grid grid-cols-4 border-b border-zinc-200 bg-zinc-50/80 dark:border-white/10 dark:bg-white/5 py-4 px-6 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
            <div className="col-span-2">功能</div>
            <div className="col-span-1 text-center text-emerald-500">Android</div>
            <div className="col-span-1 text-center text-blue-500">HarmonyOS</div>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-white/5 transition-colors">
            {matrix.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-4 items-center py-4 px-6 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
              >
                <div className="col-span-2 font-medium text-zinc-800 dark:text-zinc-200">{row.feature}</div>
                <div className="col-span-1 flex justify-center text-zinc-600 dark:text-zinc-400">
                  {row.android.includes("✅") ? (
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-500 hidden sm:inline">{row.android.replace("✅", "").trim()}</span>
                    </span>
                  ) : (
                    <Minus className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                  )}
                </div>
                <div className="col-span-1 flex justify-center text-zinc-600 dark:text-zinc-400">
                  {row.harmony.includes("✅") ? (
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Check className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-500 hidden sm:inline">{row.harmony.replace("✅", "").trim()}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400 dark:text-zinc-600">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
