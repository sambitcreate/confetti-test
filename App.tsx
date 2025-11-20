import React from 'react';
import { SlingshotCanvas } from '@/components/SlingshotCanvas';
import { Button } from '@/components/ui/button';

const App: React.FC = () => {
  return (
    <main>
      <SlingshotCanvas />
      <div className="absolute bottom-4 left-4">
        <Button>Click me</Button>
      </div>
    </main>
  );
};

export default App;
