import React, { useEffect, useRef, useState } from 'react';

const centerX = 250;
const centerY = 250;
const radius = 180;
const totalPoints = 13;
const POINT_DETECTION_RADIUS = 20;
const POINT_RADIUS = 6;
const LINE_DELETION_THRESHOLD = 8;

type Point = { x: number; y: number };
type Connection = [number, number];
type AnimatedConnection = {
  from: number;
  to: number;
  progress: number;
};

const getRotatedPoints = (angleDeg: number): Point[] => {
  const angleRad = (angleDeg * Math.PI) / 180;
  return Array.from({ length: totalPoints }, (_, i) => {
    const theta = (2 * Math.PI * i) / totalPoints + angleRad;
    return {
      x: centerX + radius * Math.cos(theta),
      y: centerY + radius * Math.sin(theta),
    };
  });
};

export const Canvas = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [animatedConnections, setAnimatedConnections] = useState<AnimatedConnection[]>([]);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [rotationAngle, setRotationAngle] = useState(300);
  const [hoveredLine, setHoveredLine] = useState<Connection | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const isRotatingRef = useRef(false);
  const startedOnLineRef = useRef(false);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const velocityRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const rotatedPoints = getRotatedPoints(rotationAngle);

  const getAngleFromCenter = (x: number, y: number) => {
    const dx = x - centerX;
    const dy = y - centerY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const pointNearAnyLine = (x: number, y: number) => {
    return connections.some(([from, to]) => {
      const p1 = rotatedPoints[from];
      const p2 = rotatedPoints[to];
      const distance = distancePointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      return distance < LINE_DELETION_THRESHOLD;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const distance = Math.hypot(x - centerX, y - centerY);

    const clickedNearLine = pointNearAnyLine(x, y);
    const clickedNearPoint = rotatedPoints.some(
      (pt) => Math.hypot(pt.x - x, pt.y - y) < POINT_DETECTION_RADIUS
    );

    if (clickedNearLine) {
      startedOnLineRef.current = true;
      return;
    }

    if (clickedNearPoint) return;

    if (distance >= radius - 30 && distance <= radius + 40) {
      isRotatingRef.current = true;
      lastAngleRef.current = getAngleFromCenter(x, y);
      lastTimestampRef.current = performance.now();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const handleMouseMoveGlobal = (e: MouseEvent) => {
    if (!isRotatingRef.current || lastAngleRef.current === null) return;
    if (startedOnLineRef.current) return;

    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentAngle = getAngleFromCenter(x, y);
    const deltaAngle = currentAngle - lastAngleRef.current;

    const now = performance.now();
    const deltaTime = now - (lastTimestampRef.current ?? now);

    if (deltaTime > 0) {
      velocityRef.current = deltaAngle / (deltaTime / 16);
    }

    setRotationAngle((prev) => (prev + deltaAngle) % 360);
    lastAngleRef.current = currentAngle;
    lastTimestampRef.current = now;
  };

  const handleMouseUpGlobal = () => {
    if (startedOnLineRef.current) {
      startedOnLineRef.current = false;
      return;
    }

    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      lastAngleRef.current = null;
      lastTimestampRef.current = null;
      startInertia();
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  const handleMouseMoveSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingFrom !== null) {
      setMousePos({ x, y });
    }

    const nearPoint = rotatedPoints.some(
      (pt) => Math.hypot(pt.x - x, pt.y - y) < POINT_DETECTION_RADIUS
    );

    if (draggingFrom !== null || nearPoint) {
      setHoveredLine(null);
      return;
    }

    const hovered = connections.find(([from, to]) => {
      const p1 = rotatedPoints[from];
      const p2 = rotatedPoints[to];
      const distance = distancePointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      return distance < LINE_DELETION_THRESHOLD;
    });

    setHoveredLine(hovered ?? null);
  };

  const handleMouseUpSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingFrom !== null) {
      const targetIndex = rotatedPoints.findIndex(
        (pt) => Math.hypot(pt.x - mouseX, pt.y - mouseY) < POINT_DETECTION_RADIUS
      );

      if (
        targetIndex !== -1 &&
        targetIndex !== draggingFrom &&
        !connections.some(
          ([a, b]) =>
            (a === draggingFrom && b === targetIndex) ||
            (a === targetIndex && b === draggingFrom)
        )
      ) {
        animateConnection(draggingFrom, targetIndex);
      }

      setDraggingFrom(null);
      setMousePos(null);
      return;
    }

    if (hoveredLine) {
      setConnections((prev) =>
        prev.filter(
          ([a, b]) =>
            !(
              (a === hoveredLine[0] && b === hoveredLine[1]) ||
              (a === hoveredLine[1] && b === hoveredLine[0])
            )
        )
      );
      setHoveredLine(null);
    }
  };

  const animateConnection = (from: number, to: number) => {
    const startTime = performance.now();
    const duration = 300;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setAnimatedConnections((prev) =>
        prev.map((conn) =>
          conn.from === from && conn.to === to ? { ...conn, progress } : conn
        )
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setConnections((prev) => [...prev, [from, to]]);
        setAnimatedConnections((prev) =>
          prev.filter((conn) => !(conn.from === from && conn.to === to))
        );
      }
    };

    setAnimatedConnections((prev) => [...prev, { from, to, progress: 0 }]);
    requestAnimationFrame(animate);
  };

  const startInertia = () => {
    let velocity = velocityRef.current;
    const decay = 0.95;

    const step = () => {
      if (Math.abs(velocity) < 0.01) return;
      setRotationAngle((prev) => (prev + velocity) % 360);
      velocity *= decay;
      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const distancePointToSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clearAll = () => {
    setConnections([]);
    setAnimatedConnections([]);
    setHoveredLine(null);
  };

  return (
    <div className="flex flex-col items-center gap-4 relative touch-none">
      <svg
        ref={svgRef}
        width={500}
        height={500}
        className="bg-white border"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveSvg}
        onMouseUp={handleMouseUpSvg}
      >
        {connections.map(([from, to], idx) => {
          const isHovered =
            hoveredLine &&
            ((hoveredLine[0] === from && hoveredLine[1] === to) ||
              (hoveredLine[0] === to && hoveredLine[1] === from));
          return (
            <line
              key={`${from}-${to}-${idx}`}
              x1={rotatedPoints[from].x}
              y1={rotatedPoints[from].y}
              x2={rotatedPoints[to].x}
              y2={rotatedPoints[to].y}
              stroke={isHovered ? 'rgba(255, 0, 0, 0.75)' : 'rgba(240, 237, 83, 0.88)'}
              strokeWidth={isHovered ? 4 : 2}
              style={{
                filter: isHovered ? 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.75))' : 'none',
                transition: 'stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease',
              }}
            />
          );
        })}

        {animatedConnections.map(({ from, to, progress }, idx) => {
          const p1 = rotatedPoints[from];
          const p2 = rotatedPoints[to];
          const x = p1.x + (p2.x - p1.x) * progress;
          const y = p1.y + (p2.y - p1.y) * progress;

          return (
            <line
              key={`animated-${from}-${to}-${idx}`}
              x1={p1.x}
              y1={p1.y}
              x2={x}
              y2={y}
              stroke="rgba(240, 237, 83, 0.88)"
              strokeWidth={2}
            />
          );
        })}

        {draggingFrom !== null && mousePos && (
          <line
            x1={rotatedPoints[draggingFrom].x}
            y1={rotatedPoints[draggingFrom].y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="gray"
            strokeWidth={2}
            strokeDasharray="4"
          />
        )}

        {rotatedPoints.map((point, idx) => (
          <circle
            key={idx}
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            fill={
              idx === 0
                ? 'black'
                : draggingFrom === idx
                ? 'blue'
                : 'gray'
            }
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingFrom(idx);
            }}
            className="cursor-pointer"
          />
        ))}
      </svg>

      <button
        onClick={clearAll}
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        Limpar Tudo
      </button>
    </div>
  );
};
