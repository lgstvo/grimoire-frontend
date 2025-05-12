import { Canvas } from './components/Canvas';
import { SideBar } from './components/SideBar';
import { ResizableDescription } from './components/ResizableDescription';

function App() {
  return (
    <div className="flex h-screen">
      <aside className="">
        <SideBar />
      </aside>
      <main className="flex-1 flex items-center justify-center bg-gray-800 overflow-x-hidden">
        <Canvas />
      </main>
      <ResizableDescription />
    </div>
  );
}

export default App;