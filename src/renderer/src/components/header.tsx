import { Minus, Square, X, Maximize2, ChevronsUpDown, Smartphone, Tablet, Monitor, Sun, Moon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface Device {
  id: string
  name: string
  icon: React.ReactNode
}

const devices: Device[] = [
  { id: 'iphone-14', name: 'iPhone 14', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'iphone-15', name: 'iPhone 15', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'ipad-pro', name: 'iPad Pro', icon: <Tablet className="w-4 h-4" /> },
  { id: 'ipad-mini', name: 'iPad Mini', icon: <Tablet className="w-4 h-4" /> },
  { id: 'responsive', name: '响应式', icon: <Monitor className="w-4 h-4" /> },
]

export function Header(): React.JSX.Element {
  const { theme, setTheme } = useTheme()
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Device>(devices[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMaximized = async () => {
      if (!window.api?.window?.isMaximized) return
      const maximized = await window.api.window.isMaximized()
      setIsMaximized(maximized)
    }
    checkMaximized()

    const interval = setInterval(checkMaximized, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMinimize = () => {
    window.api?.window?.minimize?.()
  }

  const handleMaximize = () => {
    window.api?.window?.maximize?.()
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    window.api?.window?.close?.()
  }

  return (
    <header className="drag-region h-10 flex items-center select-none">
      {/* 账户选择器 */}
      <div className="no-drag relative ml-2 mt-2" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 transition-colors"
        >
          <ChevronsUpDown className="w-4.5 h-4.5 text-muted-foreground" />
          <span className="text-sm">{selectedAccount.name}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  setSelectedAccount(device)
                  setIsDropdownOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${selectedAccount.id === device.id ? 'text-primary font-medium' : ''
                  }`}
              >
                {device.icon}
                {device.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 窗口控制按钮 */}
      <div className="no-drag flex items-center ml-auto gap-1 mt-1">
        {/* 主题切换滑块 */}
        <div className="mx-5">
          <div
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`relative flex items-center w-[64px] h-[35px] rounded-xl p-0.5 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-background border border-border' : 'bg-accent/50 border'
              }`}
          >
            {/* 滑块 */}
            <div
              className={`
              absolute top-1/2 -translate-y-1/2
              w-[28px] h-[28px] rounded-lg
              flex items-center justify-center
              transition-all duration-300 ease-in-out
              ${theme === 'dark'
                  ? 'right-0.5 bg-zinc-700'
                  : 'left-0.5 bg-white shadow-sm border border-border'
                }
            `}
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-primary" />
              )}
            </div>
          </div>
        </div>


        {/* 最小化 */}
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* 最大化/还原 */}
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* 关闭 */}
        <button
          onClick={handleClose}
          className="w-8.5 h-8 flex items-center justify-center hover:bg-destructive transition-colors group"
          aria-label="关闭"
        >
          <X className="w-4 h-4 group-hover:text-destructive-foreground" />
        </button>
      </div>
    </header>
  )
}
