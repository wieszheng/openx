import { Home, Settings, Key, LayoutPanelLeft, Camera, Monitor, FolderOpen } from 'lucide-react'
import React from 'react'

// 检测是否为 macOS——用于显示原生 Traffic Light 占位区
const isMac = typeof window !== 'undefined' && window.electron?.process?.platform === 'darwin'

interface MenuItem {
  id: string
  icon: React.ReactNode
  label: string
}

const menuItems: MenuItem[] = [
  { id: 'home', icon: <Home className="w-5 h-5" />, label: '首页' },
  { id: 'apps', icon: <LayoutPanelLeft className="w-5 h-5" />, label: '应用列表' },
  { id: 'screenshot', icon: <Camera className="w-5 h-5" />, label: '截图' },
  { id: 'mirror', icon: <Monitor className="w-5 h-5" />, label: '屏幕镜像' },
  { id: 'files', icon: <FolderOpen className="w-5 h-5" />, label: '文件管理' },
  { id: 'global-variables', icon: <Key className="w-5 h-5" />, label: '全局变量' }
]

interface SidebarProps {
  activeMenu?: string
  onMenuChange?: (menuId: string) => void
}

export function Sidebar({ activeMenu = 'home', onMenuChange }: SidebarProps): React.JSX.Element {
  return (
    <aside className="w-14 flex flex-col items-center py-3">
      {/* macOS Traffic Light 占位区：为原生红绿灯窗口控制按钮留白 */}
      {isMac && <div className="h-[16px] w-full shrink-0" />}

      {/* Logo */}
      <div className="w-9.5 h-9.5 flex items-center justify-center mb-3">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" stroke="oklch(0.508 0.118 165.612)" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="34" r="14" fill="oklch(0.508 0.118 165.612)" stroke="none"></circle><path d="M 60 20 L 86 46 M 86 20 L 60 46" stroke-width="18"></path><path d="M 16 76 Q 38 52 56 76 T 88 72" stroke-width="18"></path></svg>
        {/* <svg viewBox="0 0 100 100" width="1024" height="1300" xmlns="http://www.w3.org/2000/svg"><svg x="0" y="0" width="100" height="100"><svg viewBox="0 0 100 100" fill="none" stroke="oklch(0.508 0.118 165.612)" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(45 50 50)" stroke-width="8"></ellipse><ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-45 50 50)" stroke-width="8"></ellipse></svg></svg><text x="50" y="118" font-size="16" font-weight="600" font-family="sans-serif" text-anchor="middle" fill="oklch(0.508 0.118 165.612)" letter-spacing="0.2em">OpenX</text></svg> */}
        {/* <svg width="1024" height="1024" viewBox="0 0 100 100" fill="none" stroke="oklch(0.508 0.118 165.612)" stroke-linecap="round" stroke-linejoin="round"  xmlns="http://www.w3.org/2000/svg"><path d="M 20 50 L 35 20 L 80 20" stroke-width="6"></path><path d="M 80 50 L 65 80 L 20 80" stroke-width="6"></path><path d="M 35 35 L 65 65 M 35 65 L 65 35" stroke-width="6"></path></svg> */}
      </div>

      {/* 菜单项 */}
      <nav className="flex flex-col gap-2 w-full px-2">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange?.(item.id)}
              className={`
                relative w-full h-11 flex items-center justify-center rounded-xl transition-all duration-200
                ${isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }
              `}
              title={item.label}
            >
              {item.icon}

              {/* 激活态指示条 */}
              {isActive && <span className="absolute left-0 w-1 h-8 rounded-r-full bg-primary" />}
            </button>
          )
        })}
      </nav>

      {/* 底部功能 */}
      <div className="mt-auto flex flex-col gap-2">
        {/* 设置 */}
        <button
          className={`w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200                 ${activeMenu === 'settings'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          title="设置"
          onClick={() => onMenuChange?.('settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
