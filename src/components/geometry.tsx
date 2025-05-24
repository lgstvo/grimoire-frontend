
export const centerX = 250;
export const centerY = 250;
export const radius = 180;
export const totalPoints = 13;

export type Point = { x: number; y: number };
export type Connection = [number, number];
export type AnimatedConnection = {
	from: number;
	to: number;
	progress: number;
};

export type CanvasState = {
	matrix: number[][];  // adjacency matrix
	centerPointState: 0 | 1 | 2;
};

export const getRotatedPoints = (angleDeg: number): Point[] => {
	const angleRad = (angleDeg * Math.PI) / 180;
	return Array.from({ length: totalPoints }, (_, i) => {
		const theta = (2 * Math.PI * i) / totalPoints + angleRad;
		return {
			x: centerX + radius * Math.cos(theta),
			y: centerY + radius * Math.sin(theta),
		};
	});
};

export const getRelativePosition = (
	e: MouseEvent | TouchEvent,
	svgRef: SVGSVGElement
) => {
	const rect = svgRef.getBoundingClientRect();
	const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
	const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
	return {
		x: clientX - rect.left,
		y: clientY - rect.top,
	};
};

export const getAngleFromCenter = (x: number, y: number) => {
	const dx = x - centerX;
	const dy = y - centerY;
	return Math.atan2(dy, dx) * (180 / Math.PI);
};