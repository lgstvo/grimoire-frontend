import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ResizableDescriptionProps {
  spellInfo: {
    title: string;
    description: string;
    mainColor: string;
    isMatch: boolean;
  };
}

export const ResizableDescription = ({ spellInfo }: ResizableDescriptionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [width, setWidth] = useState(200);
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

  useEffect(() => {
    setIsAnimating(true);
    if (spellInfo.isMatch) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [spellInfo.isMatch]);


  return (
    <div className="fixed top-0 right-0 h-full z-50 flex">
      {/* Sidebar */}
      <div
        className={`relative bg-gray-700 text-white h-full flex flex-col ${
          isAnimating ? 'transition-[width] duration-300 ease-in-out' : ''
        }`}
        style={{
          width: isOpen ? `${width}px` : '10px',
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
          <h2 className="text-lg font-bold mb-2">{spellInfo.title}</h2>
          <p>{spellInfo.description}</p>
        </div>

        {/* External toggle button */}
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
