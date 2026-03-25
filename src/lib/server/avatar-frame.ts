import type Sharp from "sharp";

const CX = 200;
const CY = 200;
const R = 184;
const SW = 36;

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
		color: "#059669",
		startDeg: 380,
		endDeg: 215,
		label: "#OPENTOWORK",
	},
	hiring: {
		color: "#2563EB",
		startDeg: 380,
		endDeg: 215,
		label: "#HIRING",
	},
};

export function generateFrameSvg(frame: string): Buffer | null {
	const config = FRAMES[frame];
	if (!config) return null;

	const d = arcPath(config.startDeg, config.endDeg);
	const textD = arcPath(config.endDeg, config.startDeg, true);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <filter id="blur">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
    <mask id="arcMask">
      <path d="${d}" fill="none" stroke="white" stroke-width="${SW}" stroke-linecap="butt" pathLength="1" stroke-dasharray="0.88" stroke-dashoffset="-0.06" filter="url(#blur)"/>
    </mask>
    <path id="textPath" d="${textD}" fill="none"/>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3.2" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <path d="${d}" fill="none" stroke="${config.color}" stroke-width="${SW}" stroke-linecap="butt" mask="url(#arcMask)"/>
  <text fill="white" font-size="28" font-weight="700" font-family="sans-serif" letter-spacing="6" dominant-baseline="central" filter="url(#shadow)">
    <textPath href="#textPath" startOffset="50%" text-anchor="middle">${config.label}</textPath>
  </text>
</svg>`;

	return Buffer.from(svg);
}

export async function compositeWithFrame(
	original: Buffer,
	frame: string,
): Promise<Buffer> {
	const svgBuffer = generateFrameSvg(frame);
	if (!svgBuffer) return original;

	const sharp: typeof Sharp = (await import("sharp")).default;
	return sharp(original)
		.composite([{ input: svgBuffer, blend: "over" }])
		.webp({ quality: 85 })
		.toBuffer();
}
