import { useState } from 'react'
import { Button } from './components/ui/button'

function App(): React.JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div className="h-screen bg-foreground flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl! text-background">Sup nerds!</h1>

      <Button onClick={() => setCount(count + 1)}>{count}</Button>

      <Button onClick={() => setCount(0)}>Reset Count</Button>
    </div>
  )
}

export default App
