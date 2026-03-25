import type { DotData } from "./dots";

export interface Marker {
	location: [number, number];
	size: number;
	color?: [number, number, number];
}

export interface GlobeRenderState {
	phi?: number;
	theta?: number;
	morph?: number;
	zoom?: number;
	pan?: [number, number];
}

export interface GlobeOptions {
	width: number;
	height: number;
	onRender: (state: GlobeRenderState) => GlobeRenderState | undefined;
	phi: number;
	theta: number;
	dotData: DotData;
	dotColor: [number, number, number];
	markerColor: [number, number, number];
	markers: Marker[];
	devicePixelRatio: number;
	dark: number;
	morph?: number;
	context?: WebGLContextAttributes;
}
