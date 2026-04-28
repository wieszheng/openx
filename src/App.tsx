import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { AboutPage } from "@/components/pages/about-page"
import { AutomationPage } from "@/components/pages/automation-page"
import { BuildHistoryPage } from "@/components/pages/build-history-page"
import { CasesPage } from "@/components/pages/cases-page"
import { DocsPage } from "@/components/pages/docs-page"
import { ExecutionReportPage } from "@/components/pages/execution-report-page"
import { HomePage } from "@/components/pages/home-page"
import { TestPlanPage } from "@/components/pages/test-plan-page"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = ["首页", "用例", "测试计划", "自动化", "构建历史"]

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [targetPage, setTargetPage] = useState<string | null>(null)
  const activePage = targetPage || navItems[activeIndex]

  const handleNavigate = (page: string) => {
    setTargetPage(page)
  }

  const handleBack = () => {
    setTargetPage(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 right-0 left-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              O
            </div>
            <div>
              <p className="font-heading text-base font-semibold leading-none">OpenX</p>
              <p className="text-xs text-muted-foreground">智能自动化平台</p>
            </div>
          </div>

          <nav className="mx-4 hidden md:block lg:mx-8">
            <div className="inline-flex items-center gap-0.5 rounded-full bg-muted/80 p-1 shadow-inner">
              {navItems.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`inline-flex h-8 min-w-[80px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-center text-sm leading-none font-medium transition-all duration-200 ${
                    activeIndex === index
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-active={activeIndex === index}
                >
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-4">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto px-2 py-1.5">
                  <Avatar size="sm">
                    <AvatarFallback>SW</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 hidden text-sm sm:inline">Shwe Zheng</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人资料</DropdownMenuItem>
                <DropdownMenuItem>账号设置</DropdownMenuItem>
                <DropdownMenuItem>通知中心</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-20 pb-4 md:px-6">
        {activePage === "首页" && <HomePage />}
        {activePage === "用例" && <CasesPage />}
        {activePage === "测试计划" && <TestPlanPage />}
        {activePage === "自动化" && <AutomationPage />}
        {activePage === "文档" && <DocsPage />}
        {activePage === "构建历史" && <BuildHistoryPage onView={handleNavigate} />}
        {activePage === "执行报告" && <ExecutionReportPage onBack={handleBack} />}
        {activePage === "关于" && <AboutPage />}
      </main>
    </div>
  )
}

export default App
