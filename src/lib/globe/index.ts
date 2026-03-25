import Phenomenon from "phenomenon";
import { flatPosition, spherePosition } from "./projections";
import {
	dotFragment,
	dotVertex,
	markerFragment,
	markerVertex,
} from "./shaders";
import type { GlobeOptions, GlobeRenderState, Marker } from "./types";

function buildMarkerData(
	markers: Marker[],
	fallbackColor: [number, number, number],
) {
	const count = markers.length;
	const flat = new Float32Array(count * 3);
	const sphere = new Float32Array(count * 3);
	const sizes = new Float32Array(count);
	const phases = new Float32Array(count);
	const colors = new Float32Array(count * 3);

	for (let i = 0; i < count; i++) {
		const m = markers[i];
		const [lat, lon] = m.location;
		const [fx, fy, fz] = flatPosition(lat, lon);
		flat[i * 3] = fx;
		flat[i * 3 + 1] = fy;
		flat[i * 3 + 2] = fz;

		const [sx, sy, sz] = spherePosition(lat, lon, 1.01);
		sphere[i * 3] = sx;
		sphere[i * 3 + 1] = sy;
		sphere[i * 3 + 2] = sz;

		sizes[i] = 4 + m.size * 80;
		phases[i] = Math.random() * Math.PI * 2;

		const c = m.color ?? fallbackColor;
		colors[i * 3] = c[0];
		colors[i * 3 + 1] = c[1];
		colors[i * 3 + 2] = c[2];
	}

	return { flat, sphere, sizes, phases, colors, count };
}

export default function createGlobe(
	canvas: HTMLCanvasElement,
	opts: GlobeOptions,
): Phenomenon {
	const { dotData, markers } = opts;
	const markerData = buildMarkerData(markers, opts.markerColor);

	const contextType = canvas.getContext("webgl2")
		? "webgl2"
		: canvas.getContext("webgl")
			? "webgl"
			: "experimental-webgl";

	let initialZ = 0;
	let currentMorph = opts.morph ?? 1;

	const p = new Phenomenon({
		canvas,
		contextType,
		context: {
			alpha: true,
			stencil: false,
			antialias: true,
			depth: false,
			preserveDrawingBuffer: false,
			...opts.context,
		},
		settings: {
			devicePixelRatio: opts.devicePixelRatio || 1,
			clearColor: [0, 0, 0, 0],
			position: { x: 0, y: 0, z: 2.2 },
			onSetup: (gl: WebGLRenderingContext) => {
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			},
			onRender: (renderer: Phenomenon) => {
				if (initialZ === 0) {
					const m = renderer.uniforms.uModelMatrix.value as number[];
					initialZ = m[14];
				}

				let state: GlobeRenderState = {};
				if (opts.onRender) {
					state = opts.onRender(state) || state;
				}

				const morph = state.morph ?? opts.morph ?? 1;
				const phi = state.phi ?? opts.phi;
				const theta = state.theta ?? opts.theta;
				const zoom = state.zoom ?? 1;
				const pan = state.pan ?? [0, 0];

				currentMorph = morph;

				const cosPhi = Math.cos(phi);
				const sinPhi = Math.sin(phi);
				const cosTheta = Math.cos(theta);
				const sinTheta = Math.sin(theta);

				const FLAT_Z_SCALE = 1.1;
				const baseZ = initialZ / zoom;
				const flatZ = (initialZ * FLAT_Z_SCALE) / zoom;
				const zDist = baseZ + (flatZ - baseZ) * (1 - morph);

				// prettier-ignore
				const rotationMatrix = [
					cosPhi,
					sinPhi * sinTheta,
					-sinPhi * cosTheta,
					0,
					0,
					cosTheta,
					sinTheta,
					0,
					sinPhi,
					-cosPhi * sinTheta,
					cosPhi * cosTheta,
					0,
					0,
					0,
					0,
					1,
				];

				const modelMatrix = new Array(16);
				for (let i = 0; i < 16; i++) {
					const identity = i % 5 === 0 ? 1 : 0;
					modelMatrix[i] = identity + (rotationMatrix[i] - identity) * morph;
				}

				const panWeight = 1 - morph;
				modelMatrix[12] = pan[0] * panWeight;
				modelMatrix[13] = pan[1] * panWeight;
				modelMatrix[14] = zDist;

				renderer.uniforms.uModelMatrix.value = modelMatrix;
			},
		},
	});

	if (dotData.count > 0) {
		(p as Phenomenon & { add: (k: string, s: unknown) => void }).add("dots", {
			vertex: dotVertex,
			fragment: dotFragment,
			mode: 0,
			geometry: { vertices: [{ x: 0, y: 0, z: 0 }] },
			multiplier: dotData.count,
			attributes: [
				{
					name: "aFlatPosition",
					size: 3,
					data: (i: number) => [
						dotData.flatPositions[i * 3],
						dotData.flatPositions[i * 3 + 1],
						dotData.flatPositions[i * 3 + 2],
					],
				},
				{
					name: "aSpherePosition",
					size: 3,
					data: (i: number) => [
						dotData.spherePositions[i * 3],
						dotData.spherePositions[i * 3 + 1],
						dotData.spherePositions[i * 3 + 2],
					],
				},
			],
			uniforms: {
				uMorph: { type: "float", value: [opts.morph ?? 1] },
				uPointSize: {
					type: "float",
					value: [3.0 * (opts.devicePixelRatio || 1)],
				},
				uColor: { type: "vec3", value: [...opts.dotColor] },
				uMaxDist: { type: "float", value: [10.0] },
			},
			onRender: ({
				uniforms,
			}: {
				uniforms: Record<string, { value: unknown }>;
			}) => {
				uniforms.uMorph.value = [currentMorph];
			},
		});
	}

	if (markerData.count > 0) {
		(p as Phenomenon & { add: (k: string, s: unknown) => void }).add(
			"markers",
			{
				vertex: markerVertex,
				fragment: markerFragment,
				mode: 0,
				geometry: { vertices: [{ x: 0, y: 0, z: 0 }] },
				multiplier: markerData.count,
				attributes: [
					{
						name: "aFlatPosition",
						size: 3,
						data: (i: number) => [
							markerData.flat[i * 3],
							markerData.flat[i * 3 + 1],
							markerData.flat[i * 3 + 2],
						],
					},
					{
						name: "aSpherePosition",
						size: 3,
						data: (i: number) => [
							markerData.sphere[i * 3],
							markerData.sphere[i * 3 + 1],
							markerData.sphere[i * 3 + 2],
						],
					},
					{
						name: "aSize",
						size: 1,
						data: (i: number) => [markerData.sizes[i]],
					},
					{
						name: "aPhase",
						size: 1,
						data: (i: number) => [markerData.phases[i]],
					},
					{
						name: "aColor",
						size: 3,
						data: (i: number) => [
							markerData.colors[i * 3],
							markerData.colors[i * 3 + 1],
							markerData.colors[i * 3 + 2],
						],
					},
				],
				uniforms: {
					uMorph: { type: "float", value: [opts.morph ?? 1] },
					uMaxDist: { type: "float", value: [15.0] },
					uTime: { type: "float", value: [0] },
				},
				onRender: ({
					uniforms,
				}: {
					uniforms: Record<string, { value: unknown }>;
				}) => {
					uniforms.uMorph.value = [currentMorph];
					const currentTime = uniforms.uTime.value as number[];
					uniforms.uTime.value = [currentTime[0] + 0.016];
				},
			},
		);
	}

	return p;
}

export type { DotData } from "./dots";
export { generateLandDots } from "./dots";
export type { GlobeOptions, GlobeRenderState, Marker } from "./types";
