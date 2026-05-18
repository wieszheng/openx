import { Home, Settings, Key, ArrowDownWideNarrow } from 'lucide-react'

interface MenuItem {
  id: string
  icon: React.ReactNode
  label: string
}

const menuItems: MenuItem[] = [
  { id: 'home', icon: <Home className="w-5 h-5" />, label: '首页' },
  { id: 'global-variables', icon: <Key className="w-5 h-5" />, label: '全局变量' }
]

interface SidebarProps {
  activeMenu?: string
  onMenuChange?: (menuId: string) => void
}

export function Sidebar({ activeMenu = 'home', onMenuChange }: SidebarProps): React.JSX.Element {
  return (
    <aside className="w-14 flex flex-col items-center py-4">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-4">
        <ArrowDownWideNarrow className="w-5 h-5 text-primary-foreground" />
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
                ${
                  isActive
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
          className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
