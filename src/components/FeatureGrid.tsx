import { MonitorSmartphone, Code2, Scissors, Video, Package, Zap, Eye, RotateCcw, BookOpen } from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: <Zap className="h-6 w-6 text-yellow-400" />,
    title: "自然语言编排",
    description: "用一句话描述目标，小X 自动拆解为观察—思考—行动循环，生成可执行的自动化节点链，无需手动拖拽。",
    accent: "purple",
    tags: ["AI Agent"],
  },
  {
    icon: <RotateCcw className="h-6 w-6 text-orange-400" />,
    title: "实机自愈回退",
    description: "动作先在真机执行、成功才落画布；上一步没达预期时自动回退删除错误节点，重新感知换方式规划。",
    accent: "purple",
    tags: ["边做边验"],
  },
  {
    icon: <Eye className="h-6 w-6 text-sky-400" />,
    title: "多模态屏幕感知",
    description: "并行 OCR 文字识别 + 通用元素检测，补齐无文字图标的定位；UI 层级清洗把数十 KB dump 压成精简控件列表。",
    accent: "sky",
    tags: ["OCR · 元素识别 · UI 层级"],
  },
  {
    icon: <BookOpen className="h-6 w-6 text-purple-400" />,
    title: "渐进式技能",
    description: "内置可复用的任务经验包，系统提示只列技能清单，Agent 按需加载完整指南，不占常驻上下文。",
    accent: "purple",
    tags: ["load_skill"],
  },
  {
    icon: <MonitorSmartphone className="h-6 w-6 text-primary-500" />,
    title: "屏幕镜像",
    description: "内置 scrcpy 实现超低延迟 Android 屏幕镜像；HarmonyOS 通过 UiDriver 实现嵌入与独立弹窗两种模式。",
    accent: "green",
    tags: ["Android · scrcpy", "HarmonyOS · UiDriver"],
  },
  {
    icon: <Scissors className="h-6 w-6 text-pink-400" />,
    title: "截图 + 标注编辑",
    description: "一键截取设备屏幕，内置基于 Konva 的画布编辑器，支持矩形、箭头、文字等多种标注工具，自动保存至导出目录。",
    accent: "green",
    tags: ["Android & HarmonyOS"],
  },
  {
    icon: <Video className="h-6 w-6 text-blue-400" />,
    title: "录屏",
    description: "灵动岛风格实时录制指示器，一键开始/停止录制；Android muxer 合成 MP4，HarmonyOS 调用系统自带录屏。",
    accent: "green",
    tags: ["Android · mp4-muxer", "HarmonyOS · 系统录屏"],
  },
  {
    icon: <Package className="h-6 w-6 text-green-400" />,
    title: "应用管理",
    description: "支持 APK / HAP 安装，一键卸载、启动、停止、清除数据/缓存、禁用/启用，图标展示，系统应用过滤。",
    accent: "green",
    tags: ["Android · APK", "HarmonyOS · HAP"],
  },
  {
    icon: <Code2 className="h-6 w-6 text-amber-400" />,
    title: "文件管理 / 全局变量",
    description: "浏览设备文件系统，支持上传下载删除与新建目录；持久化项目级键值变量，供自动化流程共享配置。",
    accent: "green",
    tags: ["Android & HarmonyOS"],
  },
];

const accentStyles: Record<string, { iconBg: string; iconRing: string; hoverBorder: string }> = {
  purple: {
    iconBg: "bg-purple-50 dark:bg-purple-500/10",
    iconRing: "ring-purple-200 dark:ring-purple-500/20",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-500/30",
  },
  sky: {
    iconBg: "bg-sky-50 dark:bg-sky-500/10",
    iconRing: "ring-sky-200 dark:ring-sky-500/20",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-500/30",
  },
  green: {
    iconBg: "bg-zinc-50 dark:bg-white/5",
    iconRing: "ring-zinc-200 dark:ring-white/10",
    hoverBorder: "hover:border-zinc-300 dark:hover:border-zinc-700",
  },
};

const tagColor = (tag: string) => {
  if (tag.startsWith("Android") && tag.includes("HarmonyOS")) return "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
  if (tag.startsWith("Android")) return "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
  if (tag.startsWith("HarmonyOS")) return "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400";
  if (tag === "Android & HarmonyOS") return "border-primary-500/30 bg-primary-500/5 text-primary-600 dark:text-primary-400";
  return "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400";
};

export const FeatureGrid = () => {
  return (
    <section id="features" className="scroll-mt-16 py-24 bg-zinc-50 dark:bg-zinc-950/50 transition-colors">
      <div className="container mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-2xl mx-auto text-center"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-500 dark:text-primary-400">
            核心能力
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl transition-colors">
            不止是设备管理
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 transition-colors">
            2.0 把一个会观察、会思考、会动手的自动化 Agent，建在成熟的双平台设备管理底座之上。
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const accent = accentStyles[feature.accent] || accentStyles.green;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/5 dark:bg-white/[0.02] ${accent.hoverBorder} p-6 shadow-sm dark:shadow-none transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:bg-white/[0.04]`}
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ring-1 ring-inset ${accent.iconBg} ${accent.iconRing} transition-colors`}>
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-colors">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 transition-colors">
                  {feature.description}
                </p>
                {feature.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-3">
                    {feature.tags.map((tag) => (
                      <span key={tag} className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
