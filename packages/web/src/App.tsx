import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/shared/components/ui/button';
import { ButtonDemo } from '@/shared/components/ui/button-demo';

function App() {
  const [count, setCount] = useState(0);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className={cn('min-h-screen bg-background flex items-center justify-center')}>
      <div className={cn('max-w-4xl p-8 rounded-lg border bg-card text-card-foreground shadow-lg')}>
        <h1 className="text-3xl font-bold mb-4 text-foreground">Sherpy Flow UI Refactor</h1>
        <p className="text-muted-foreground mb-6">React 19 + Vite + TypeScript + Tailwind CSS</p>

        <div className="flex gap-4 mb-6">
          <Button onClick={() => setCount((count) => count + 1)}>Count is {count}</Button>
          <Button variant="outline" onClick={() => setShowDemo(!showDemo)}>
            {showDemo ? 'Hide' : 'Show'} Button Demo
          </Button>
        </div>

        {showDemo && <ButtonDemo />}
      </div>
    </div>
  );
}

export default App;
