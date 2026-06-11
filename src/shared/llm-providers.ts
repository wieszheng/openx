/** 国内可用的 LLM 服务商预设（均为 OpenAI 兼容 Chat Completions 接口） */

export interface LlmProviderPreset {
  id: string
  name: string
  baseUrl: string
  model: string
  /** 是否支持 response_format: json_object */
  supportsJsonMode: boolean
  /** API Key 申请地址提示 */
  keyHint?: string
}

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek（推荐）',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    supportsJsonMode: true,
    keyHint: 'https://platform.deepseek.com',
  },
  {
    id: 'dashscope',
    name: '通义千问 DashScope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    supportsJsonMode: true,
    keyHint: 'https://dashscope.console.aliyun.com',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    supportsJsonMode: true,
    keyHint: 'https://open.bigmodel.cn',
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    supportsJsonMode: true,
    keyHint: 'https://platform.moonshot.cn',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    supportsJsonMode: true,
    keyHint: 'https://cloud.siliconflow.cn',
  },
  {
    id: 'baidu',
    name: '百度千帆',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    model: 'ernie-4.0-turbo-8k',
    supportsJsonMode: false,
    keyHint: 'https://console.bce.baidu.com/qianfan',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    model: '',
    supportsJsonMode: true,
  },
]

export const DEFAULT_LLM_PROVIDER_ID = 'deepseek'

export function getLlmProviderPreset(id?: string): LlmProviderPreset {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id) ?? LLM_PROVIDER_PRESETS[0]
}

export function resolveJsonMode(providerId?: string, baseUrl?: string): boolean {
  const preset = getLlmProviderPreset(providerId)
  if (providerId && providerId !== 'custom') return preset.supportsJsonMode
  if (baseUrl?.includes('deepseek.com')) return true
  if (baseUrl?.includes('dashscope.aliyuncs.com')) return true
  if (baseUrl?.includes('bigmodel.cn')) return true
  if (baseUrl?.includes('moonshot.cn')) return true
  if (baseUrl?.includes('siliconflow.cn')) return true
  if (baseUrl?.includes('baidubce.com')) return false
  return true
}
