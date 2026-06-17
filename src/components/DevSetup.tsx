import { Terminal, Package, CheckCircle2, Copy, Check, Brain } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const buildCommands = {
  mac: "npm run build:mac",
  win: "npm run build:win",
  linux: "npm run build:linux",
};

const envVars = [
  { env: "大模型 API", isMain: true, desc: "在应用「设置」中配置 OpenAI 兼容接口的 API Key / BaseURL / 模型，驱动小X 智能编排（默认适配通义千问等）" },
  { env: "OPENX_ADB_PATH", desc: "自定义 adb 路径，缺省使用系统 PATH 中的 adb" },
  { env: "OPENX_HDC_PATH", desc: "自定义 hdc 路径，缺省自动查找 DevEco Studio SDK" },
  { env: "OPENX_SCRCPY_SERVER_PATH", desc: "scrcpy-server.jar 路径，屏幕镜像与录屏功能必需" },
];

export const DevSetup = () => {
  const [activeTab, setActiveTab] = useState<"mac" | "win" | "linux">("mac");
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedBuild, setCopiedBuild] = useState(false);

  const copyToClipboard = async (text: string, type: 'install' | 'build') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'install') {
        setCopiedInstall(true);
        setTimeout(() => setCopiedInstall(false), 2000);
      } else {
        setCopiedBuild(true);
        setTimeout(() => setCopiedBuild(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <section id="setup" className="scroll-mt-16 py-24 bg-white dark:bg-transparent relative overflow-hidden transition-colors">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -z-10 translate-x-1/2 -translate-y-1/3">
        <div className="h-[30rem] w-[40rem] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-[120px] transition-colors" />
      </div>

      <div className="container mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 max-w-2xl mx-auto text-center"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-500 dark:text-primary-400">
            快速开始
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4 transition-colors">
            分钟级上手
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed transition-colors">
            开发模式一条命令启动；生产包跨平台打包发布。
          </p>
        </motion.div>

        <div className="flex flex-col gap-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Local Startup Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:shadow-none dark:border-white/5 dark:bg-zinc-900/40 p-6 flex flex-col backdrop-blur-sm transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 transition-colors">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white tracking-tight transition-colors">开发模式</h3>
                  <p className="text-xs text-zinc-500">克隆仓库后安装依赖即可启动</p>
                </div>
              </div>
              
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-white/5 dark:bg-black/60 p-4 font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-300 transition-colors flex-1 relative group">
                <button
                  onClick={() => copyToClipboard("git clone https://github.com/wieszheng/openx.git\ncd openx\nnpm install\nnpm run dev", 'install')}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-white/50 dark:bg-black/50 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-zinc-200/50 dark:border-white/5"
                  title="Copy code"
                  aria-label="Copy installation commands"
                >
                  {copiedInstall ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <div className="text-xs text-zinc-500 mb-1"># 克隆仓库</div>
                <div className="flex gap-3">
                  <span className="text-pink-500 dark:text-pink-400 shrink-0 select-none transition-colors">❯</span>
                  <span className="select-all">git clone https://github.com/wieszheng/openx.git</span>
                </div>
                <div className="flex gap-3 mt-1">
                  <span className="text-pink-500 dark:text-pink-400 shrink-0 select-none transition-colors">❯</span>
                  <span className="select-all">cd openx</span>
                </div>
                <div className="text-xs text-zinc-500 mt-2 mb-1"># 安装依赖</div>
                <div className="flex gap-3">
                  <span className="text-pink-500 dark:text-pink-400 shrink-0 select-none transition-colors">❯</span>
                  <span className="select-all">npm install</span>
                </div>
                <div className="text-xs text-zinc-500 mt-2 mb-1"># 启动开发模式（热更新）</div>
                <div className="flex gap-3">
                  <span className="text-pink-500 dark:text-pink-400 shrink-0 select-none transition-colors">❯</span>
                  <span className="select-all">npm run dev</span>
                </div>
              </div>
            </motion.div>

            {/* Build Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:shadow-none dark:border-white/5 dark:bg-zinc-900/40 p-6 flex flex-col backdrop-blur-sm transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white tracking-tight transition-colors">跨平台打包构建</h3>
                  <p className="text-xs text-zinc-500">将应用编译为独立可执行文件</p>
                </div>
              </div>
              
              <div className="flex flex-col rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50/50 dark:border-white/5 dark:bg-black/60 transition-colors flex-1">
                <div className="flex border-b border-zinc-200 dark:border-white/5 transition-colors">
                  {(["mac", "win", "linux"] as const).map((os) => (
                    <button
                      key={os}
                      onClick={() => setActiveTab(os)}
                      className={`flex-1 py-2.5 text-xs text-center font-medium transition-colors ${
                        activeTab === os
                          ? "bg-zinc-200/50 text-zinc-900 dark:bg-white/10 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 hover:bg-white dark:hover:text-zinc-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {os === "mac" ? "macOS" : os === "win" ? "Windows" : "Linux"}
                    </button>
                  ))}
                </div>
                <div className="p-4 font-mono text-sm text-zinc-800 dark:text-zinc-300 flex-1 flex flex-col justify-center transition-colors relative group">
                  <div className="text-xs text-zinc-500 mb-1">
                    # 构建 {activeTab === "mac" ? "macOS dmg / pkg" : activeTab === "win" ? "Windows exe / nsis" : "Linux AppImage / deb"}
                  </div>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 items-center"
                  >
                    <span className="text-emerald-500 dark:text-emerald-400 shrink-0 select-none transition-colors">❯</span>
                    <span className="select-all">{buildCommands[activeTab]}</span>
                  </motion.div>
                  <div className="text-xs text-zinc-500 mt-2"># 产物输出至 dist/ 目录</div>
                  <button
                    onClick={() => copyToClipboard(buildCommands[activeTab], 'build')}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-white/50 dark:bg-black/50 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-zinc-200/50 dark:border-white/5"
                    title="Copy code"
                    aria-label="Copy build command"
                  >
                    {copiedBuild ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Agent & Env Vars */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:shadow-none dark:border-white/5 dark:bg-zinc-900/40 p-6 sm:p-8 flex-1 backdrop-blur-sm transition-colors"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 transition-colors">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight transition-colors">Agent & 工具包配置</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1 transition-colors">
                  智能编排需配置大模型 API（在应用「设置」中填写 Key / BaseURL / 模型）；设备工具路径可通过环境变量覆盖。
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {envVars.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  key={item.env}
                  className={`flex flex-col rounded-xl border p-5 transition-colors gap-2 h-full justify-between ${
                    item.isMain
                      ? "border-purple-500/20 bg-purple-50/50 dark:border-purple-500/20 dark:bg-purple-500/5 hover:bg-purple-100/50 dark:hover:bg-purple-500/10"
                      : "border-zinc-200 bg-zinc-50/50 dark:border-white/5 dark:bg-black/40 hover:bg-zinc-100/50 dark:hover:bg-black/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.isMain ? "text-purple-500" : "text-emerald-500"}`} />
                    <code className={`text-sm font-semibold transition-colors ${item.isMain ? "text-purple-600 dark:text-purple-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                      {item.env}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-500 transition-colors">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
