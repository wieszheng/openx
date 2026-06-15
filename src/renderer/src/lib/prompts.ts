/**
 * AI Agent 工作流编排提示词配置
 *
 * 说明：动作清单/参数 schema 的系统提示词已迁移为「从 ActionSpace 自动生成」，
 * 见 lib/agent/prompts.ts 的 buildSystemPrompt()。本文件只保留与 UI 相关的
 * 欢迎语与预设用例，避免与 shared/workflow.ts 的节点定义重复漂移。
 */

// ── 欢迎消息 ──────────────────────────────────────────────────────────────
export const WELCOME_MESSAGE = `你好！我是你的智能工作流编排 Copilot。我可以根据你的描述自动构建自动化节点链条。如果开启"实机交互"，我还能即时调取截图与布局树，甚至在你的设备上单步测试自愈。请问今天需要编排什么任务？`

// ── 预设用例 ─────────────────────────────────────────────────────────────
export interface PresetExample {
  title: string
  prompt: string
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    title: '启动微信并截图',
    prompt: '冷启动微信（com.tencent.wechat），等待5秒加载，然后截取当前屏幕，最后返回主屏幕。'
  },
  {
    title: '打开文心切换到我的页面',
    prompt: '冷启动文心APP，点击左上角返回图标按钮，底部切换我的Tab，确认我的页面有去创作按钮，截图'
  }
]


