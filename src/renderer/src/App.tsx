import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DashboardPage } from '@/pages/dashboard'
import { GlobalVariablesPage } from '@/pages/global-variables'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

function App(): React.JSX.Element {
  const [activeMenu, setActiveMenu] = useState('home')

  const renderContent = () => {
    switch (activeMenu) {
      case 'global-variables':
        return <GlobalVariablesPage />
      case 'home':
      default:
        return <DashboardPage />
    }
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex bg-card overflow-hidden text-foreground">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

        <div className="flex-1 flex flex-col bg-background border border-border/50 rounded-xl shadow-sm overflow-hidden min-w-0">
          <Header />

          <main className="flex-1 p-6 overflow-hidden relative flex flex-col">
            {renderContent()}
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
