import { useEffect, useRef } from "react";
import { createGradient, type GradientInstance } from "#/lib/gradient";
import { useTheme } from "#/lib/use-theme";
import { cn } from "#/lib/utils";
import darkPng from "/assets/login-gradient-dark.png?url";
import darkWebp from "/assets/login-gradient-dark.webp?url";
import lightPng from "/assets/login-gradient-light.png?url";
import lightWebp from "/assets/login-gradient-light.webp?url";

const SNAPSHOT_CLASS = "absolute inset-0 size-full object-cover";

export function MeshGradient({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gradientRef = useRef<GradientInstance>(null);
	const { theme } = useTheme();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		gradientRef.current = createGradient(canvas, {
			onFirstRender: () => {
				canvas.classList.remove("blur-md", "opacity-0", "scale-105");
			},
		});

		return () => {
			gradientRef.current?.destroy();
			gradientRef.current = null;
		};
	}, []);

	useEffect(() => {
		gradientRef.current?.updateColors();
	}, []);

	return (
		<div className={cn("absolute inset-0 overflow-hidden", className)}>
			<picture className="dark:hidden">
				<source srcSet={lightWebp} type="image/webp" />
				<img
					alt=""
					aria-hidden="true"
					src={lightPng}
					className={SNAPSHOT_CLASS}
				/>
			</picture>
			<picture className="hidden dark:block">
				<source srcSet={darkWebp} type="image/webp" />
				<img
					alt=""
					aria-hidden="true"
					src={darkPng}
					className={SNAPSHOT_CLASS}
				/>
			</picture>

			<canvas
				ref={canvasRef}
				className="absolute inset-0 size-full cursor-grab opacity-0 blur-md scale-105 transition-[opacity,filter,transform] duration-2000 ease-out mask-r-from-background mask-r-from-50% active:cursor-grabbing outline-none"
				{...(theme === "dark" ? { "data-js-darken-top": "" } : {})}
				aria-hidden="true"
				tabIndex={-1}
			/>

			<div
				className="pointer-events-none absolute inset-0 bg-white/30 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:via-30% lg:to-white/40 dark:bg-black/40 dark:lg:bg-gradient-to-r dark:lg:to-black/50"
				aria-hidden="true"
			/>
		</div>
	);
}
