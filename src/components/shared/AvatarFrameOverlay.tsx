import { useId } from "react";

const CX = 50;
const CY = 50;
const R = 46;
const SW = 9;

function toRad(deg: number) {
	return (deg * Math.PI) / 180;
}

function pt(angleDeg: number) {
	return {
		x: CX + R * Math.cos(toRad(angleDeg)),
		y: CY + R * Math.sin(toRad(angleDeg)),
	};
}

function arcPath(startDeg: number, endDeg: number, ccw = false) {
	const s = pt(startDeg);
	const e = pt(endDeg);
	let sweep = endDeg - startDeg;
	if (ccw) {
		if (sweep > 0) sweep -= 360;
		sweep = Math.abs(sweep);
	} else {
		if (sweep < 0) sweep += 360;
	}
	const large = sweep > 180 ? 1 : 0;
	const sweepFlag = ccw ? 0 : 1;
	return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} ${sweepFlag} ${e.x} ${e.y}`;
}

type FrameConfig = {
	color: string;
	startDeg: number;
	endDeg: number;
	label: string;
};

const FRAMES: Record<string, FrameConfig> = {
	open_to_work: {
		color: "var(--bi-salary)",
		startDeg: 380,
		endDeg: 215,
		label: "#OPENTOWORK",
	},
	hiring: {
		color: "var(--color-primary)",
		startDeg: 380,
		endDeg: 215,
		label: "#HIRING",
	},
};

export function AvatarFrameOverlay({
	frame,
	sizePx,
}: {
	frame: string;
	sizePx: number;
}) {
	const uid = useId();
	const config = FRAMES[frame];
	if (!config) return null;

	const showText = sizePx >= 80;
	const d = arcPath(config.startDeg, config.endDeg);
	const textD = arcPath(config.endDeg, config.startDeg, true);

	const maskId = `fm-${uid}`;
	const blurId = `fb-${uid}`;
	const pathId = `fp-${uid}`;
	const shadowId = `fs-${uid}`;

	return (
		<svg
			viewBox="0 0 100 100"
			className="absolute inset-0 size-full pointer-events-none"
			aria-hidden
		>
			<defs>
				<filter id={blurId}>
					<feGaussianBlur stdDeviation="3" />
				</filter>

				<mask id={maskId}>
					<path
						d={d}
						fill="none"
						stroke="white"
						strokeWidth={SW}
						strokeLinecap="butt"
						pathLength={1}
						strokeDasharray="0.88"
						strokeDashoffset="-0.06"
						filter={`url(#${blurId})`}
					/>
				</mask>

				<path id={pathId} d={textD} fill="none" />

				{showText && (
					<filter id={shadowId}>
						<feDropShadow
							dx={0}
							dy={0.5}
							stdDeviation={0.8}
							floodColor="#000"
							floodOpacity={0.6}
						/>
					</filter>
				)}
			</defs>

			<path
				d={d}
				fill="none"
				stroke={config.color}
				strokeWidth={SW}
				strokeLinecap="butt"
				mask={`url(#${maskId})`}
			/>

			{showText && (
				<text
					fill="white"
					fontSize={7}
					fontWeight={700}
					fontFamily="var(--font-sans)"
					letterSpacing={1.5}
					dominantBaseline="central"
					filter={`url(#${shadowId})`}
				>
					<textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
						{config.label}
					</textPath>
				</text>
			)}
		</svg>
	);
}
