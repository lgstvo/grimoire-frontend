import React, { useEffect, useRef, useState } from 'react';
import * as Geometry from './geometry'

const POINT_DETECTION_RADIUS = 20;
const POINT_RADIUS = 8;
const LINE_DELETION_THRESHOLD = 8;


interface CanvasProps {
	spellInfo: {
		title: string;
		description: string;
		mainColor: string;
		isMatch: boolean;
	};
		setSpellInfo: React.Dispatch<React.SetStateAction<{
		title: string;
		description: string;
		mainColor: string;
		isMatch: boolean;
	}>>;
}

export const Canvas = ({ spellInfo, setSpellInfo }: CanvasProps) => {
	const [connections, setConnections] = useState<Geometry.Connection[]>([]);
	const [animatedConnections, setAnimatedConnections] = useState<Geometry.AnimatedConnection[]>([]);
	const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
	const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
	const [rotationAngle, setRotationAngle] = useState(300);
	const [hoveredLine, setHoveredLine] = useState<Geometry.Connection | null>(null);
	const [centerPointState, setCenterPointState] = useState<0 | 1 | 2>(0);
	const [mainColor, setMainColor] = useState<string>('rgb(255, 252, 61)');
	const [centerPointHovered, setCenterPointHovered] = useState(false);
	const [lineWiggles, setLineWiggles] = useState<Map<string, { dx1: number; dy1: number; dx2: number; dy2: number }>>(new Map());
	const [canvasState, setCanvasState] = useState<Geometry.CanvasState>({
		matrix: [],
		centerPointState: 0
	});
	const [isWiggling, setIsWiggling] = useState<boolean>(true);
	const [lineBeingDeleted, setLineBeingDeleted] = useState<Geometry.Connection | null>(null);

	const svgRef = useRef<SVGSVGElement>(null);
	const isRotatingRef = useRef(false);
	const startedOnLineRef = useRef(false);
	const lastAngleRef = useRef<number | null>(null);
	const lastTimestampRef = useRef<number | null>(null);
	const velocityRef = useRef<number>(0);
	const animationFrameRef = useRef<number | null>(null);

	const rotatedPoints = Geometry.getRotatedPoints(rotationAngle);

	const toggleCenterPointState = () => {
		setCenterPointState((prev) => (prev + 1) % 3 as 0 | 1 | 2);
	};

	const pointNearAnyLine = (x: number, y: number) => {
		return connections.some(([from, to]) => {
			const p1 = rotatedPoints[from];
			const p2 = rotatedPoints[to];
			const distance = distancePointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
			return distance < LINE_DELETION_THRESHOLD;
		});
	};

	const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		const pos = Geometry.getRelativePosition(e.nativeEvent, svgRef.current!);
		const { x, y } = pos;
		const distance = Math.hypot(x - Geometry.centerX, y - Geometry.centerY);

		const clickedNearLine = pointNearAnyLine(x, y);
		const clickedNearPoint = rotatedPoints.some(
			(pt) => Math.hypot(pt.x - x, pt.y - y) < POINT_DETECTION_RADIUS
		);

		if (clickedNearLine) {
			startedOnLineRef.current = true;
			const hovered = connections.find(([from, to]) => {
				const p1 = rotatedPoints[from];
				const p2 = rotatedPoints[to];
				const distance = distancePointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
				return distance < LINE_DELETION_THRESHOLD;
			});
			setLineBeingDeleted(hovered ?? null);
			return;
		}


		if (clickedNearPoint) return;

		if (distance >= Geometry.radius - 30 && distance <= Geometry.radius + 40) {
			isRotatingRef.current = true;
			lastAngleRef.current = Geometry.getAngleFromCenter(x, y);
			lastTimestampRef.current = performance.now();
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		}
	};

	const buildAdjacencyMatrix = (connections: Geometry.Connection[], pointCount: number) => {
		const matrix = Array.from({ length: pointCount }, () => Array(pointCount).fill(0));

		connections.forEach(([from, to]) => {
			matrix[from][to] = 1;
			matrix[to][from] = 1;
		});

		return matrix;
	};

	const handleMouseMoveGlobal = (e: MouseEvent | TouchEvent) => {
		if (!isRotatingRef.current || lastAngleRef.current === null) return;
		if (startedOnLineRef.current) return;

		const pos = Geometry.getRelativePosition(e, svgRef.current!);
		const { x, y } = pos;

		const currentAngle = Geometry.getAngleFromCenter(x, y);
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

	const handleMouseUpGlobal = (_e: MouseEvent | TouchEvent) => {
		if (startedOnLineRef.current) {
			startedOnLineRef.current = false;
			setLineBeingDeleted(null);
			return;
		}

		if (isRotatingRef.current) {
			isRotatingRef.current = false;
			lastAngleRef.current = null;
			lastTimestampRef.current = null;
			startInertia();
		}
	};

	//use effect responsible for getting position for drawing lines
	useEffect(() => {
		const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMoveGlobal(e);
		const handleUp = (e: MouseEvent | TouchEvent) => handleMouseUpGlobal(e);

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
		window.addEventListener('touchmove', handleMove, { passive: false });
		window.addEventListener('touchend', handleUp);

		return () => {
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
			window.removeEventListener('touchmove', handleMove);
			window.removeEventListener('touchend', handleUp);
		};
	}, []);

	useEffect(() => {
		const matrix = buildAdjacencyMatrix(connections, rotatedPoints.length);

		setCanvasState({
			matrix,
			centerPointState,
		});

		console.log('Canvas State:', canvasState);
	}, [connections, centerPointState, centerPointHovered, rotatedPoints.length]);

	//use effect responsible for wiggle animation
	useEffect(() => {
		if (!isWiggling) {
			setLineWiggles(new Map());
			return;
		}

		let rafId: number;

		const animateWiggle = () => {
			setLineWiggles(() => {
				const updated = new Map<string, { dx1: number; dy1: number; dx2: number; dy2: number }>();
				connections.forEach(([from, to], idx) => {
					const key = `${from}-${to}-${idx}`;
					const amp = 1.5;
					updated.set(key, {
						dx1: (Math.random() - 0.5) * amp,
						dy1: (Math.random() - 0.5) * amp,
						dx2: (Math.random() - 0.5) * amp,
						dy2: (Math.random() - 0.5) * amp,
					});
				});
				return updated;
			});
			rafId = requestAnimationFrame(animateWiggle);
		};

		animateWiggle();
		return () => cancelAnimationFrame(rafId);
	}, [connections, isWiggling]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch('http://localhost:4000/canvasState', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(canvasState),
				});
				const data = await response.json();
				console.log('Server response:', data);

				setSpellInfo({
					title: data.title,
					description: data.description,
					mainColor: data.mainColor,
					isMatch: data.isMatch,
				});

				if (data.isMatch) {
					setMainColor(data.mainColor);
					setIsWiggling(false);
				} else {
					setMainColor('rgb(255, 0, 0)');
					setIsWiggling(true);
				}
			} catch (error) {
				console.error('Error fetching data:', error);
				setIsWiggling(true);
			}
		};

		fetchData();
	}, [canvasState]);

	const handleMouseMoveSvg = (e: React.MouseEvent | React.TouchEvent) => {
		const pos = Geometry.getRelativePosition(e.nativeEvent, svgRef.current!);
		const { x, y } = pos;

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

	const handleMouseUpSvg = (e: React.MouseEvent | React.TouchEvent) => {
		const pos = Geometry.getRelativePosition(e.nativeEvent, svgRef.current!);
		const { x: mouseX, y: mouseY } = pos;

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

		if (lineBeingDeleted) {
			setConnections((prev) =>
				prev.filter(
				([a, b]) =>
					!(
					(a === lineBeingDeleted[0] && b === lineBeingDeleted[1]) ||
					(a === lineBeingDeleted[1] && b === lineBeingDeleted[0])
					)
				)
			);
			setHoveredLine(null);
			setLineBeingDeleted(null);
			startedOnLineRef.current = false;
			return;
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

	const animateRotationTo = (target: number) => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		const normalize = (angle: number) => ((angle % 360) + 360) % 360;
		const start = normalize(rotationAngle);
		target = normalize(target);

		let diff = target - start;
		if (diff > 180) diff -= 360;
		if (diff < -180) diff += 360;

		const duration = 500;
		const startTime = performance.now();

		const animate = (time: number) => {
			const elapsed = time - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress); // easeInOut

			const newAngle = normalize(start + diff * eased);
			setRotationAngle(newAngle);

			if (progress < 1) {
				animationFrameRef.current = requestAnimationFrame(animate);
			}
		};

		animationFrameRef.current = requestAnimationFrame(animate);
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
		setCenterPointState(0);
		console.clear();
	};

	return (
		<div className="flex flex-col items-center gap-4 relative touch-none">
			<svg
				ref={svgRef}
				width={500}
				height={500}
				className="touch-none"
				onMouseDown={handlePointerDown}
				onTouchStart={handlePointerDown}
				onMouseMove={handleMouseMoveSvg}
				onTouchMove={handleMouseMoveSvg}
				onMouseUp={handleMouseUpSvg}
				onTouchEnd={handleMouseUpSvg}
			>
				{connections.map(([from, to], idx) => {
					const isHovered =
						hoveredLine &&
						((hoveredLine[0] === from && hoveredLine[1] === to) ||
							(hoveredLine[0] === to && hoveredLine[1] === from));
					const key = `${from}-${to}-${idx}`;
					const wiggle = lineWiggles.get(key) ?? { dx1: 0, dy1: 0, dx2: 0, dy2: 0 };
					const x1 = rotatedPoints[from].x + wiggle.dx1;
					const y1 = rotatedPoints[from].y + wiggle.dy1;
					const x2 = rotatedPoints[to].x + wiggle.dx2;
					const y2 = rotatedPoints[to].y + wiggle.dy2;

					return (
						<line
							key={key}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							stroke={isHovered ? 'rgb(255, 0, 0)' : `${mainColor}`}
							strokeWidth={isHovered ? 4 : 2}
							style={{
								filter: isHovered ? 'drop-shadow(0 0 4px rgb(255, 0, 0))' : 'none',
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
							stroke={mainColor}
							strokeWidth={2}
						/>
					);
				})}

				<circle
					cx={Geometry.centerX}
					cy={Geometry.centerY}
					r={POINT_RADIUS}
					fill={mainColor}
					opacity={centerPointState > 0 ? 1 : 0}
					onClick={toggleCenterPointState}
					onMouseEnter={() => setCenterPointHovered(true)}
					onMouseLeave={() => setCenterPointHovered(false)}
					style={{
						cursor: 'pointer',
						filter: centerPointHovered
							? `drop-shadow(0 0 4px ${mainColor})`
							: 'none',
						transition: 'all 0.3s ease',
						stroke: centerPointHovered ? `${mainColor}` : 'transparent',
						strokeWidth: centerPointHovered ? 4 : 0,
						pointerEvents: 'auto', // garante que o SVG invisível continue clicável
					}}
				/>
				{centerPointState === 2 && (
					<circle
						cx={Geometry.centerX}
						cy={Geometry.centerY}
						r={POINT_RADIUS + 9}
						fill="none"
						stroke={mainColor}
						strokeWidth={2}
						strokeDasharray="4 2"
						pointerEvents="none"
					/>
				)}

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

			<div className="flex justify-center gap-x-6 mt-2 p-2 border w-full">
				<button
					onClick={clearAll}
					className="px-4 py-2 bg-githubgray text-white rounded hover:bg-red-600 transition"
				>
					Clear Canvas
				</button>
				<button
					onClick={() => animateRotationTo(300)}
					className="px-4 py-2 bg-githubgray text-white rounded hover:bg-red-600 transition"
				>
					Reset Rotation
				</button>
				<button
					onClick={() => {
						console.log('Canvas State:', canvasState);
					}}
					className="px-4 py-2 bg-githubgray text-white rounded hover:bg-red-600 transition"
				>
					Log
				</button>
			</div>


		</div>
	);
};
