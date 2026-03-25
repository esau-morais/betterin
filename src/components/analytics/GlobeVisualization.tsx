import {
	GlobeSimpleIcon,
	MapTrifoldIcon,
	MinusIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import type { DotData } from "#/lib/globe";
import createGlobe, { generateLandDots } from "#/lib/globe";
import { FLAT_SCALE } from "#/lib/globe/projections";
import { useTheme } from "#/lib/use-theme";

type GlobeLocation = {
	lat: number;
	lon: number;
	count: number;
	label: string;
};

const PAN_MAX_X = 180 * FLAT_SCALE;
const PAN_MAX_Y = 90 * FLAT_SCALE;

let dotDataCache: Promise<DotData> | null = null;
function getDotData(): Promise<DotData> {
	if (!dotDataCache) dotDataCache = generateLandDots(0.3);
	return dotDataCache;
}

function regionColor(lon: number, dark: boolean): [number, number, number] {
	if (lon < -30) return dark ? [0.4, 0.65, 0.95] : [0.2, 0.4, 0.85];
	if (lon < 60) return dark ? [0.35, 0.75, 0.6] : [0.15, 0.5, 0.35];
	return dark ? [0.55, 0.45, 0.85] : [0.35, 0.25, 0.7];
}

export function GlobeVisualization({
	locations,
}: {
	locations: GlobeLocation[];
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<"globe" | "flat">("globe");
	const targetMorphRef = useRef(1);
	const currentMorphRef = useRef(1);
	const phiRef = useRef(0);
	const thetaRef = useRef(0.2);
	const [isDragging, setIsDragging] = useState(false);
	const isDraggingRef = useRef(false);
	const autoRotateRef = useRef(true);
	const pointerStartRef = useRef({ x: 0, y: 0 });
	const phiStartRef = useRef(0);
	const thetaStartRef = useRef(0);
	const scaleRef = useRef(1);
	const panRef = useRef<[number, number]>([0, 0]);
	const panStartRef = useRef<[number, number]>([0, 0]);
	const [size, setSize] = useState(280);
	const [dotData, setDotData] = useState<DotData | null>(null);

	const { theme } = useTheme();
	const isDark = theme === "dark";

	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		let cancelled = false;
		getDotData().then((data) => {
			if (!cancelled) setDotData(data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		targetMorphRef.current = view === "globe" ? 1 : 0;
		scaleRef.current = 1;
		panRef.current = [0, 0];
		if (prefersReducedMotion) {
			currentMorphRef.current = targetMorphRef.current;
		}
	}, [view, prefersReducedMotion]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			setSize(entry.contentRect.width);
		});
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const onWheel = (e: WheelEvent) => {
			if (!e.ctrlKey) return;
			e.preventDefault();
			const delta = e.deltaY * -0.002;
			scaleRef.current = Math.max(0.5, Math.min(3, scaleRef.current + delta));
		};

		canvas.addEventListener("wheel", onWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", onWheel);
	}, []);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			setIsDragging(true);
			isDraggingRef.current = true;
			pointerStartRef.current = { x: e.clientX, y: e.clientY };
			phiStartRef.current = phiRef.current;
			thetaStartRef.current = thetaRef.current;
			panStartRef.current = [...panRef.current];
			autoRotateRef.current = false;
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isDraggingRef.current) return;
			const dx = e.clientX - pointerStartRef.current.x;
			const dy = e.clientY - pointerStartRef.current.y;

			if (currentMorphRef.current < 0.5) {
				const panScale = 0.005;
				const newX = panStartRef.current[0] + dx * panScale;
				const newY = panStartRef.current[1] - dy * panScale;
				panRef.current = [
					Math.max(-PAN_MAX_X, Math.min(PAN_MAX_X, newX)),
					Math.max(-PAN_MAX_Y, Math.min(PAN_MAX_Y, newY)),
				];
			} else {
				phiRef.current = phiStartRef.current + dx * 0.005;
				thetaRef.current = Math.max(
					-Math.PI / 2,
					Math.min(Math.PI / 2, thetaStartRef.current + dy * 0.005),
				);
			}
		},
		[],
	);

	const handlePointerUp = useCallback(() => {
		setIsDragging(false);
		isDraggingRef.current = false;
	}, []);

	const handleZoomIn = useCallback(() => {
		scaleRef.current = Math.min(3, scaleRef.current + 0.3);
	}, []);

	const handleZoomOut = useCallback(() => {
		scaleRef.current = Math.max(0.5, scaleRef.current - 0.3);
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !dotData) return;

		const maxCount = Math.max(...locations.map((l) => l.count), 1);
		const markers = locations
			.filter((l) => l.lat !== 0 || l.lon !== 0)
			.map((l) => ({
				location: [l.lat, l.lon] as [number, number],
				size: 0.03 + (l.count / maxCount) * 0.12,
				color: regionColor(l.lon, isDark),
			}));

		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		const globe = createGlobe(canvas, {
			devicePixelRatio: dpr,
			width: size * dpr,
			height: size * dpr,
			phi: 0,
			theta: 0.2,
			dark: isDark ? 1 : 0,
			dotData,
			dotColor: isDark ? [0.18, 0.36, 0.6] : [0.1, 0.25, 0.6],
			markerColor: isDark ? [0.3, 0.6, 1.0] : [0.15, 0.39, 0.92],
			markers,
			morph: currentMorphRef.current,
			onRender: (state) => {
				const target = targetMorphRef.current;
				const current = currentMorphRef.current;

				if (prefersReducedMotion) {
					currentMorphRef.current = target;
				} else {
					const diff = target - current;
					if (Math.abs(diff) > 0.001) {
						currentMorphRef.current += diff * 0.08;
					} else {
						currentMorphRef.current = target;
					}
				}

				state.morph = currentMorphRef.current;
				state.theta = thetaRef.current;
				state.zoom = scaleRef.current;
				state.pan = panRef.current;

				if (autoRotateRef.current && currentMorphRef.current > 0.5) {
					phiRef.current += 0.001;
				}
				state.phi = phiRef.current;

				return state;
			},
		});

		return () => {
			globe.destroy();
		};
	}, [locations, isDark, size, prefersReducedMotion, dotData]);

	return (
		<div className="relative -mx-4 -mt-4 overflow-hidden rounded-t-xl">
			<div ref={containerRef} className="relative w-full">
				<canvas
					ref={canvasRef}
					className={
						isDragging ? "w-full cursor-grabbing" : "w-full cursor-grab"
					}
					style={{ height: size * 0.75 }}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerLeave={handlePointerUp}
				/>
			</div>

			<div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 pb-8 bg-gradient-to-b from-card/90 to-transparent">
				<h2 className="text-base font-semibold">Viewer locations</h2>
				<div className="flex items-center gap-1.5">
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							onClick={handleZoomOut}
							aria-label="Zoom out"
							className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors focus-ring"
						>
							<MinusIcon className="size-3.5" />
						</button>
						<button
							type="button"
							onClick={handleZoomIn}
							aria-label="Zoom in"
							className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors focus-ring"
						>
							<PlusIcon className="size-3.5" />
						</button>
					</div>
					<ToggleGroup
						type="single"
						value={view}
						spacing={1}
						onValueChange={(v) => {
							if (v === "globe" || v === "flat") setView(v);
						}}
						className="rounded-lg border border-border/50 p-0.5 backdrop-blur-sm"
					>
						<Tooltip>
							<ToggleGroupItem
								value="globe"
								aria-label="Globe view"
								className="size-7 rounded-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
								asChild
							>
								<TooltipTrigger>
									<GlobeSimpleIcon className="size-3.5" />
								</TooltipTrigger>
							</ToggleGroupItem>
							<TooltipContent>Globe view</TooltipContent>
						</Tooltip>
						<Tooltip>
							<ToggleGroupItem
								value="flat"
								aria-label="Flat map view"
								className="size-7 rounded-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
								asChild
							>
								<TooltipTrigger>
									<MapTrifoldIcon className="size-3.5" />
								</TooltipTrigger>
							</ToggleGroupItem>
							<TooltipContent>Flat map view</TooltipContent>
						</Tooltip>
					</ToggleGroup>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/90 to-transparent pointer-events-none" />
		</div>
	);
}
