import { GLOBE_RADIUS } from "./projections";
import texture from "./texture";

export interface DotData {
	flatPositions: Float32Array;
	spherePositions: Float32Array;
	count: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

const DEG2RAD = Math.PI / 180;
const FLAT_SCALE = (GLOBE_RADIUS * Math.PI) / 180;

export async function generateLandDots(dotDensity = 0.3): Promise<DotData> {
	const img = await loadImage(texture);
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2d context");
	ctx.drawImage(img, 0, 0);
	const imageData = ctx.getImageData(0, 0, img.width, img.height);
	const pixels = imageData.data;

	function isLand(lon: number, lat: number): boolean {
		const x = ((lon + 180) / 360) * img.width;
		const y = ((90 - lat) / 180) * img.height;
		const px = Math.floor(x) % img.width;
		const py = Math.min(Math.floor(y), img.height - 1);
		const idx = (py * img.width + px) * 4;
		return (pixels[idx] ?? 0) > 0;
	}

	const rows = 180;
	const latStep = 180 / rows;
	const dotsPerRow = Math.round(Math.PI * 2 * GLOBE_RADIUS * dotDensity * 100);
	const lonStep = 360 / dotsPerRow;
	const tempFlat: number[] = [];
	const tempSphere: number[] = [];

	for (let row = 0; row < rows; row++) {
		const lat = 90 - row * latStep - latStep / 2;
		const lonOffset = (row % 2) * (lonStep / 2);

		for (let d = 0; d < dotsPerRow; d++) {
			const lon = -180 + d * lonStep + lonOffset;
			if (isLand(lon, lat)) {
				tempFlat.push(lon * FLAT_SCALE, lat * FLAT_SCALE, 0);

				const latRad = lat * DEG2RAD;
				const lonRad = lon * DEG2RAD;
				tempSphere.push(
					GLOBE_RADIUS * Math.cos(latRad) * Math.sin(lonRad),
					GLOBE_RADIUS * Math.sin(latRad),
					GLOBE_RADIUS * Math.cos(latRad) * Math.cos(lonRad),
				);
			}
		}
	}

	return {
		flatPositions: new Float32Array(tempFlat),
		spherePositions: new Float32Array(tempSphere),
		count: tempFlat.length / 3,
	};
}
