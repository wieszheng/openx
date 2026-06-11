import { useState } from 'react'
import { useAgentStore } from '@/stores/agent'
import { useDevicesStore } from '@/stores/devices'
import { getBaseUrl } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PlanThinkLog } from './plan-think-log'
import { toast } from 'sonner'
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react'

const EXAMPLE = `打开设置
点击WLAN
等待2秒
确认已连接`

export function PlanPanel() {
  const [intent, setIntent] = useState('')
  const { planning, draft } = useAgentStore()
  const selectedDeviceId = useDevicesStore((s) => s.selectedId)

  async function handleGenerate() {
    const description = intent.trim()
    if (!description) {
      toast.error('请输入用例描述')
      return
    }

    const res = await window.api?.agent?.plan({
      intent: { description, deviceId: selectedDeviceId ?? undefined, baseUrl: getBaseUrl() },
    })

    if (!res?.ok) {
      toast.error(res?.error ?? '生成失败')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 space-y-2 border-b shrink-0">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          用例描述
        </label>
        <Textarea
          className="text-xs min-h-[88px] resize-y font-mono"
          placeholder={EXAMPLE}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          disabled={planning}
        />
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          disabled={planning || !intent.trim()}
          onClick={() => void handleGenerate()}
        >
          {planning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {planning ? '编排中…' : '智能编排'}
        </Button>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          步骤将流式写入画布（横向排列）
        </p>

        {draft && !planning && draft.uncertainties.length > 0 && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-2 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              请在画布中补充
            </div>
            {draft.uncertainties.map((u, i) => (
              <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400">{u.question}</p>
            ))}
          </div>
        )}
      </div>

      <PlanThinkLog />
    </div>
  )
}
