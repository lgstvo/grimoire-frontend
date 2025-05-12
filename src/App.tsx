import { Canvas } from './components/Canvas';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-1/6 p-4 border-r">Menu</aside>
      <main className="flex-1 flex items-center justify-center">
        <Canvas />
      </main>
      <aside className="w-1/4 p-4 border-l">Descrição</aside>
    </div>
  );
}

export default App;