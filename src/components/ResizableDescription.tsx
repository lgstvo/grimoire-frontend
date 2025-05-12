import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export const ResizableDescription = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [width, setWidth] = useState(500);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setIsAnimating(false);
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 150 && newWidth < 600) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleToggle = () => {
    setIsAnimating(true);
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative h-full flex">
      {/* Sidebar */}
      <div
        className={`relative bg-gray-700 text-white h-full flex flex-col ${
          isAnimating ? 'transition-[width] duration-300 ease-in-out' : ''
        }`}
        style={{
            width: isOpen ? `${width}px` : '150px',
        }}
      >
        {/* Resize bar */}
        {isOpen && (
          <div
            className="absolute left-0 top-0 h-full w-2 bg-gray-600 cursor-ew-resize"
            onMouseDown={() => {
              isResizing.current = true;
            }}
          />
        )}

        {/* Content */}
        <div
          className={`flex-1 p-4 transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <h2 className="text-lg font-bold mb-2">Descrição</h2>
          <p>Desc</p>
        </div>

        {/* External toggle button absolutely positioned on the left edge */}
        <button
          onClick={handleToggle}
          className="absolute top-4 right-full z-20 bg-gray-700 border border-gray-500 rounded-l p-1 hover:bg-gray-600"
        >
          {isOpen ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>
    </div>
  );
};
