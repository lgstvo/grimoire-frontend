import { useState } from 'react';
import { Canvas } from './components/Canvas';
import { SideBar } from './components/SideBar';
import { ResizableDescription } from './components/ResizableDescription';

function App() {
  const [spellInfo, setSpellInfo] = useState<{
    title: string;
    description: string;
    mainColor: string;
    isMatch: boolean;
  }>({
    title: 'Unknown Spell',
    description: 'Draw to discover a spell.',
    mainColor: 'rgb(255, 0, 0)',
    isMatch: false,
  });

  return (
    <div className="flex h-screen">
      <aside>
        <SideBar />
      </aside>
      <main className="flex-1 flex items-center justify-center bg-gray-800 overflow-x-hidden">
        <Canvas spellInfo={spellInfo} setSpellInfo={setSpellInfo} />
      </main>
      <ResizableDescription spellInfo={spellInfo} />
    </div>
  );
}

export default App;
