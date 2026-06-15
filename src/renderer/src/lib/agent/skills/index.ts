/**
 * 内置技能包 —— 借鉴 Claude Code Skills 的渐进式披露设计
 *
 * 每个技能封装一类移动端自动化任务的领域知识与最佳实践步骤。
 * system prompt 只暴露 name+description 清单（见 ../prompts.ts），
 * 模型判断相关时通过 load_skill(name) 动作拉取 instructions 注入上下文。
 *
 * 技能正文用 Agent 已掌握的动作（action-* / get_* / run_live_action）描述步骤，
 * 不引入新动作，仅提供"怎么做"的经验，降低模型在常见任务上的试错。
 */
import type { Skill } from '../types'

export const SKILLS: Skill[] = [
  {
    name: 'app-launch-and-verify',
    description: '可靠地冷启动一个应用并确认其已进入主界面',
    whenToUse: '任务需要"打开/启动某 App"，尤其是需要确保 App 真正加载完成再继续操作时',
    instructions: `# 技能：启动应用并验证就绪

可靠地启动应用并确认进入主界面，避免在加载未完成时就盲目操作。

## 步骤

1. **确认包名**：若不确定目标 App 的 packageName，先调用 get_installed_apps 查找；不要凭记忆猜包名（鸿蒙微信是 com.tencent.wechat，安卓是 com.tencent.mm）。
2. **冷启动**：用 action-launch-app，参数 { packageName, cold: true }。冷启动会先 force-stop，确保从干净状态进入。
3. **等待加载**：紧接一个 control-delay（首屏建议 3000-5000ms；启动画面/广告较多的 App 可更久）。
4. **校验就绪**：调用 get_ocr_result 或 get_device_screenshot，确认主界面特征元素已出现（如底部 Tab 栏文字、首页标题）。若界面仍是启动页/白屏，再 control-delay 等待后重新校验，不要急于下一步。

## 注意
- 启动后第一步操作前务必校验，因为 action-launch-app 返回成功只代表命令下发成功，不代表界面已就绪。`
  },
  {
    name: 'tap-icon-without-text',
    description: '点击没有文字的纯图标按钮（返回箭头、菜单、设置齿轮、关闭叉号等）',
    whenToUse: '需要点击的目标是图标而非文字，OCR 找不到对应文字时',
    instructions: `# 技能：定位并点击无文字图标

纯图标按钮没有文字，OCR 定位不到，必须通过 UI 层级或视觉确定坐标，严禁猜坐标。

## 步骤

1. **抓 UI 层级**：调用 get_ui_hierarchy，得到控件树（含每个控件的 type/description/bounds）。
2. **匹配目标控件**：按以下线索找到图标控件：
   - 控件类型/类名（如 Image、Button、ImageView）
   - 内容描述 content-desc（如 "返回"、"more"、"settings"、"close"）
   - 屏幕位置（返回键通常在顶部最左、菜单在顶部最右）
3. **算中心坐标**：控件 bounds 形如 [left,top][right,bottom]，点击坐标 = ((left+right)/2, (top+bottom)/2)。
4. **执行点击**：用 action-tap 传入算出的中心坐标。
5. **校验生效**：点击后调用 get_device_screenshot 或 get_ocr_result，确认界面发生了预期跳转/变化。若界面没变，说明定位错了，回到第 1 步重新找控件，而不是用相近坐标反复试。

## 兜底
- 若 get_ui_hierarchy 无法区分目标（如自定义绘制的图标），改用 get_device_screenshot 结合视觉判断坐标，但仍需第 5 步校验。`
  },
  {
    name: 'find-and-input-text',
    description: '在输入框中填写文字（搜索框、表单字段等）',
    whenToUse: '需要在某个输入框里输入内容，如搜索、登录、填表',
    instructions: `# 技能：定位输入框并输入文字

## 步骤

1. **定位输入框**：
   - 输入框有占位提示文字（如"搜索"、"请输入手机号"）→ 用 action-find-and-tap，targetText 填占位文字，action 选 input，text 填要输入的内容（一步完成定位+聚焦+输入）。
   - 输入框无文字特征 → 先 get_ui_hierarchy 找到输入控件（EditText/TextField 类）的 bounds 中心，用 action-tap 聚焦，再用 action-input-text 输入。
2. **校验输入**：输入后用 get_ocr_result 或 get_device_screenshot 确认文字已出现在输入框中。
3. **触发（按需）**：若任务要求提交/搜索，再点击对应按钮或用 action-key-event 发回车（安卓 keyCode 66）。

## 注意
- 严格遵循用户意图：用户只说"输入"就不要替他点搜索/提交；用户说"搜索 X"才需要触发。
- 输入框已有内容需替换时，先 action-clear-text 再输入。`
  },
  {
    name: 'scroll-to-find',
    description: '通过滚动/滑动在长列表或页面中查找当前屏幕不可见的目标',
    whenToUse: '目标元素当前截图/OCR 里找不到，可能需要向下或向上滚动才能看到',
    instructions: `# 技能：滚动查找屏幕外的目标

当目标不在当前可见区域时，用滚动逐步查找，避免一次滑过头。

## 步骤

1. **先确认确实不可见**：调用 get_ocr_result，确认目标文字当前确实不在屏幕上，再决定滚动。
2. **小步滚动**：用 action-swipe 做小幅滚动（向下查找：从屏幕中下部向上滑，如 (中心x, 屏高*0.7) → (中心x, 屏高*0.3)，duration 300）。不要一次滑太大，以免跳过目标。
3. **每滚一次就重新 OCR**：滚动后调用 get_ocr_result 检查目标是否出现。
4. **出现即停**：目标可见后，用 action-find-and-tap（有文字）或按 tap-icon-without-text 技能（无文字）点击它。
5. **到底判断**：若连续滚动多次（如 5 次）界面内容不再变化，说明已到列表底部仍未找到，应停止并如实报告未找到，不要无限滚动。

## 注意
- 不同方向：向上找用反方向滑动。横向列表用水平滑动。`
  },
  {
    name: 'verify-action-result',
    description: '校验上一步操作是否真正生效（坐标动作不报错，必须主动验证）',
    whenToUse: '执行了关键的点击/输入/跳转后，需要确认界面真的发生了预期变化',
    instructions: `# 技能：校验操作结果

坐标类动作（action-tap/swipe 等）即使点空、点错也返回成功，必须主动校验，否则会在错误状态上继续累积操作。

## 步骤

1. **明确预期**：执行动作前先想清楚"成功后界面应出现什么变化"（如：点登录后应出现首页、点返回后应回到上一页、输入后输入框应有文字）。
2. **取最新状态**：动作后调用 get_device_screenshot（看整体）或 get_ocr_result（找特征文字）。
3. **对比预期**：
   - 出现了预期特征 → 操作生效，继续下一步。
   - 界面未变或出现报错提示 → 操作未生效。分析原因：坐标点错？元素未加载？需要先等待？据此修正（重新感知定位 / 加 control-delay / 换定位方式）后重试。
4. **不要假装成功**：宁可多花一步校验，也不要在没有视觉确认的情况下推进。

## 适用时机
- 登录、提交、删除等不可逆或关键操作后，强烈建议校验。
- 简单的纯展示性点击可适当放宽。`
  }
]

// ── 查询 API ─────────────────────────────────────────────────────────────

const SKILL_BY_NAME = new Map<string, Skill>(SKILLS.map((s) => [s.name, s]))

export function getSkill(name: string): Skill | undefined {
  return SKILL_BY_NAME.get(name)
}

/** 渲染技能清单（name + description/whenToUse）供 system prompt 使用 */
export function skillsCatalogText(): string {
  if (SKILLS.length === 0) return ''
  return SKILLS.map((s) => {
    const when = s.whenToUse ? `（适用：${s.whenToUse}）` : ''
    return `- ${s.name}: ${s.description}${when}`
  }).join('\n')
}
