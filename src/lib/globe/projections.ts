const DEG2RAD = Math.PI / 180;

export const GLOBE_RADIUS = 1.0;
export const FLAT_SCALE = (GLOBE_RADIUS * Math.PI) / 180;

export function flatPosition(
	lat: number,
	lon: number,
): [number, number, number] {
	return [lon * FLAT_SCALE, lat * FLAT_SCALE, 0];
}

export function spherePosition(
	lat: number,
	lon: number,
	radius = GLOBE_RADIUS,
): [number, number, number] {
	const latRad = lat * DEG2RAD;
	const lonRad = lon * DEG2RAD;
	return [
		radius * Math.cos(latRad) * Math.sin(lonRad),
		radius * Math.sin(latRad),
		radius * Math.cos(latRad) * Math.cos(lonRad),
	];
}
