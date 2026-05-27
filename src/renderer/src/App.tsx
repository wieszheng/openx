import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DashboardPage } from '@/pages/dashboard'
import { GlobalVariablesPage } from '@/pages/global-variables'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppsPage } from '@/pages/apps'
import { MirrorPage } from '@/pages/mirror'
import { ScreenshotPage } from '@/pages/screenshot'
import { SettingsPage } from '@/pages/settings'
import { FilesPage } from '@/pages/files'
import { WorkflowPage } from '@/pages/workflow'
import { ReactFlowProvider } from '@xyflow/react'

function App(): React.JSX.Element {
  const [activeMenu, setActiveMenu] = useState('home')

  const renderContent = () => {
    switch (activeMenu) {
      case 'workflow':
        return <ReactFlowProvider><WorkflowPage /></ReactFlowProvider>
      case 'global-variables':
        return <GlobalVariablesPage />
      case 'apps':
        return <AppsPage />
      case 'mirror':
        return <MirrorPage />
      case 'screenshot':
        return <ScreenshotPage />
      case 'files':
        return <FilesPage />
      case 'settings':
        return <SettingsPage />
      case 'home':
      default:
        return <DashboardPage />
    }
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex bg-card overflow-hidden text-foreground">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

        <div className="flex-1 flex flex-col bg-background rounded-xl shadow-sm overflow-hidden min-w-0">
          <Header />

          <main className="flex-1 p-4 overflow-hidden relative flex flex-col">
            {renderContent()}
          </main>
        </div>
      </div>
      <Toaster position='top-center'/>
    </TooltipProvider>
  )
}

export default App
