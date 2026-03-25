export function normalizeColor(hexCode: number): [number, number, number] {
	return [
		((hexCode >> 16) & 255) / 255,
		((hexCode >> 8) & 255) / 255,
		(hexCode & 255) / 255,
	];
}

type UniformType = "float" | "int" | "vec2" | "vec3" | "vec4" | "mat4";

interface UniformOptions {
	type?: UniformType | "array" | "struct";
	value?: unknown;
	excludeFrom?: string;
	transpose?: boolean;
}

export const VERTEX_SHADER = `
varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  vec2 st = 1. - uvNorm.xy;

  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(position.x, position.y + tilt + incline + noise - offset, position.z);

  if (u_active_colors[0] == 1.) {
    v_color = u_baseColor;
  }

  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float layerNoise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(layerNoise, 4.));
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

export const NOISE_SHADER = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

export const BLEND_SHADER = `
vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}`;

export const FRAGMENT_SHADER = `
varying vec3 v_color;

void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy/resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`;

export class MiniGlUniform {
	type: string;
	value: unknown;
	excludeFrom?: string;
	transpose?: boolean;
	typeFn: string;

	constructor(opts: UniformOptions) {
		this.type = opts.type ?? "float";
		this.value = opts.value;
		this.excludeFrom = opts.excludeFrom;
		this.transpose = opts.transpose ?? false;
		this.typeFn =
			(
				{
					float: "1f",
					int: "1i",
					vec2: "2fv",
					vec3: "3fv",
					vec4: "4fv",
					mat4: "Matrix4fv",
				} as Record<string, string>
			)[this.type] ?? "1f";
	}

	update(location: WebGLUniformLocation | null) {
		if (this.value === undefined || !location) return;
		// handled externally by MiniGl.render via the gl context
	}

	getDeclaration(name: string, type: string, length?: number): string {
		if (this.excludeFrom === type) return "";

		if (this.type === "array") {
			const arr = this.value as MiniGlUniform[];
			return (
				arr[0].getDeclaration(name, type, arr.length) +
				`\nconst int ${name}_length = ${arr.length};`
			);
		}

		if (this.type === "struct") {
			let structName = name.replace("u_", "");
			structName = structName.charAt(0).toUpperCase() + structName.slice(1);
			const fields = Object.entries(this.value as Record<string, MiniGlUniform>)
				.map(([fieldName, uniform]) =>
					uniform.getDeclaration(fieldName, type).replace(/^uniform/, ""),
				)
				.join("");
			return `uniform struct ${structName} {\n${fields}\n} ${name}${length && length > 0 ? `[${length}]` : ""};`;
		}

		return `uniform ${this.type} ${name}${length && length > 0 ? `[${length}]` : ""};`;
	}
}

class MiniGl {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	meshes: MiniGlMesh[] = [];
	width = 0;
	height = 0;

	commonUniforms: Record<string, MiniGlUniform>;

	constructor(canvas: HTMLCanvasElement, width?: number, height?: number) {
		this.canvas = canvas;
		const ctx = canvas.getContext("webgl", { antialias: true });
		if (!ctx) throw new Error("WebGL not supported");
		this.gl = ctx;

		if (width && height) this.setSize(width, height);

		const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
		this.commonUniforms = {
			projectionMatrix: new MiniGlUniform({ type: "mat4", value: identity }),
			modelViewMatrix: new MiniGlUniform({ type: "mat4", value: identity }),
			resolution: new MiniGlUniform({ type: "vec2", value: [1, 1] }),
			aspectRatio: new MiniGlUniform({ type: "float", value: 1 }),
		};
	}

	setSize(w: number, h: number) {
		this.width = w;
		this.height = h;
		this.canvas.width = w;
		this.canvas.height = h;
		this.gl.viewport(0, 0, w, h);
		this.commonUniforms.resolution.value = [w, h];
		this.commonUniforms.aspectRatio.value = w / h;
	}

	setOrthographicCamera(e = 0, t = 0, n = 0, near = -2000, far = 2000) {
		this.commonUniforms.projectionMatrix.value = [
			2 / this.width,
			0,
			0,
			0,
			0,
			2 / this.height,
			0,
			0,
			0,
			0,
			2 / (near - far),
			0,
			e,
			t,
			n,
			1,
		];
	}

	render() {
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clearDepth(1);
		for (const mesh of this.meshes) mesh.draw();
	}

	createMaterial(
		vertexSource: string,
		fragmentSource: string,
		uniforms: Record<string, MiniGlUniform>,
	): MiniGlMaterial {
		return new MiniGlMaterial(this, vertexSource, fragmentSource, uniforms);
	}

	createPlaneGeometry(): MiniGlPlaneGeometry {
		return new MiniGlPlaneGeometry(this);
	}

	createMesh(
		geometry: MiniGlPlaneGeometry,
		material: MiniGlMaterial,
	): MiniGlMesh {
		const mesh = new MiniGlMesh(this, geometry, material);
		this.meshes.push(mesh);
		return mesh;
	}
}

interface AttributeInstance {
	attribute: MiniGlAttribute;
	location: number;
}

interface UniformInstance {
	uniform: MiniGlUniform;
	location: WebGLUniformLocation | null;
}

class MiniGlMaterial {
	program: WebGLProgram;
	uniformInstances: UniformInstance[] = [];

	constructor(
		minigl: MiniGl,
		vertexShaders: string,
		fragments: string,
		uniforms: Record<string, MiniGlUniform>,
	) {
		const gl = minigl.gl;

		function compileShader(type: number, source: string): WebGLShader {
			const shader = gl.createShader(type);
			if (!shader) throw new Error("Failed to create shader");
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error(gl.getShaderInfoLog(shader));
			}
			return shader;
		}

		function getUniformDeclarations(
			u: Record<string, MiniGlUniform>,
			type: string,
		): string {
			return Object.entries(u)
				.map(([name, uniform]) => uniform.getDeclaration(name, type))
				.join("\n");
		}

		const prefix = "\nprecision highp float;\n";

		const vertexSource = `
			${prefix}
			attribute vec4 position;
			attribute vec2 uv;
			attribute vec2 uvNorm;
			${getUniformDeclarations(minigl.commonUniforms, "vertex")}
			${getUniformDeclarations(uniforms, "vertex")}
			${vertexShaders}
		`;

		const fragmentSource = `
			${prefix}
			${getUniformDeclarations(minigl.commonUniforms, "fragment")}
			${getUniformDeclarations(uniforms, "fragment")}
			${fragments}
		`;

		const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
		const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

		this.program = gl.createProgram()!;
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(this.program));
		}

		gl.useProgram(this.program);
		this.attachUniforms(undefined, minigl.commonUniforms);
		this.attachUniforms(undefined, uniforms);
	}

	attachUniforms(
		name: string | undefined,
		uniforms: Record<string, MiniGlUniform> | MiniGlUniform,
	) {
		if (name === undefined) {
			for (const [key, u] of Object.entries(
				uniforms as Record<string, MiniGlUniform>,
			)) {
				this.attachUniforms(key, u);
			}
		} else if (uniforms instanceof MiniGlUniform) {
			if (uniforms.type === "array") {
				const arr = uniforms.value as MiniGlUniform[];
				for (let i = 0; i < arr.length; i++) {
					this.attachUniforms(`${name}[${i}]`, arr[i]);
				}
			} else if (uniforms.type === "struct") {
				const struct = uniforms.value as Record<string, MiniGlUniform>;
				for (const [field, u] of Object.entries(struct)) {
					this.attachUniforms(`${name}.${field}`, u);
				}
			} else {
				this.uniformInstances.push({
					uniform: uniforms,
					location: this.program
						? (uniforms as MiniGlUniform).value !== undefined
							? null
							: null
						: null,
				});
			}
		}
	}
}

class MiniGlAttribute {
	target: number;
	size: number;
	type: number;
	normalized: boolean;
	buffer: WebGLBuffer;
	values?: Float32Array | Uint16Array;

	private gl: WebGLRenderingContext;

	constructor(
		gl: WebGLRenderingContext,
		opts: {
			target: number;
			size: number;
			type?: number;
			normalized?: boolean;
		},
	) {
		this.gl = gl;
		this.target = opts.target;
		this.size = opts.size;
		this.type = opts.type ?? gl.FLOAT;
		this.normalized = opts.normalized ?? false;
		this.buffer = gl.createBuffer()!;
	}

	update() {
		if (this.values === undefined) return;
		this.gl.bindBuffer(this.target, this.buffer);
		this.gl.bufferData(this.target, this.values, this.gl.STATIC_DRAW);
	}

	attach(name: string, program: WebGLProgram): number {
		const loc = this.gl.getAttribLocation(program, name);
		if (this.target === this.gl.ARRAY_BUFFER) {
			this.gl.enableVertexAttribArray(loc);
			this.gl.vertexAttribPointer(
				loc,
				this.size,
				this.type,
				this.normalized,
				0,
				0,
			);
		}
		return loc;
	}

	use(loc: number) {
		this.gl.bindBuffer(this.target, this.buffer);
		if (this.target === this.gl.ARRAY_BUFFER) {
			this.gl.enableVertexAttribArray(loc);
			this.gl.vertexAttribPointer(
				loc,
				this.size,
				this.type,
				this.normalized,
				0,
				0,
			);
		}
	}
}

class MiniGlPlaneGeometry {
	attributes: {
		position: MiniGlAttribute;
		uv: MiniGlAttribute;
		uvNorm: MiniGlAttribute;
		index: MiniGlAttribute;
	};

	xSegCount = 0;
	ySegCount = 0;
	vertexCount = 0;
	quadCount = 0;
	width = 0;
	height = 0;

	constructor(minigl: MiniGl) {
		const gl = minigl.gl;
		gl.createBuffer();
		this.attributes = {
			position: new MiniGlAttribute(gl, {
				target: gl.ARRAY_BUFFER,
				size: 3,
			}),
			uv: new MiniGlAttribute(gl, { target: gl.ARRAY_BUFFER, size: 2 }),
			uvNorm: new MiniGlAttribute(gl, { target: gl.ARRAY_BUFFER, size: 2 }),
			index: new MiniGlAttribute(gl, {
				target: gl.ELEMENT_ARRAY_BUFFER,
				size: 3,
				type: gl.UNSIGNED_SHORT,
			}),
		};
	}

	setTopology(xSegs = 1, ySegs = 1) {
		this.xSegCount = xSegs;
		this.ySegCount = ySegs;
		this.vertexCount = (xSegs + 1) * (ySegs + 1);
		this.quadCount = xSegs * ySegs * 2;

		this.attributes.uv.values = new Float32Array(2 * this.vertexCount);
		this.attributes.uvNorm.values = new Float32Array(2 * this.vertexCount);
		this.attributes.index.values = new Uint16Array(3 * this.quadCount);

		for (let y = 0; y <= ySegs; y++) {
			for (let x = 0; x <= xSegs; x++) {
				const i = y * (xSegs + 1) + x;
				this.attributes.uv.values[2 * i] = x / xSegs;
				this.attributes.uv.values[2 * i + 1] = 1 - y / ySegs;
				this.attributes.uvNorm.values[2 * i] = (x / xSegs) * 2 - 1;
				this.attributes.uvNorm.values[2 * i + 1] = 1 - (y / ySegs) * 2;

				if (x < xSegs && y < ySegs) {
					const q = y * xSegs + x;
					this.attributes.index.values[6 * q] = i;
					this.attributes.index.values[6 * q + 1] = i + 1 + xSegs;
					this.attributes.index.values[6 * q + 2] = i + 1;
					this.attributes.index.values[6 * q + 3] = i + 1;
					this.attributes.index.values[6 * q + 4] = i + 1 + xSegs;
					this.attributes.index.values[6 * q + 5] = i + 2 + xSegs;
				}
			}
		}

		this.attributes.uv.update();
		this.attributes.uvNorm.update();
		this.attributes.index.update();
	}

	setSize(width = 1, height = 1) {
		this.width = width;
		this.height = height;

		if (
			!this.attributes.position.values ||
			this.attributes.position.values.length !== 3 * this.vertexCount
		) {
			this.attributes.position.values = new Float32Array(3 * this.vertexCount);
		}

		const halfW = width / -2;
		const halfH = height / -2;
		const segW = width / this.xSegCount;
		const segH = height / this.ySegCount;

		for (let y = 0; y <= this.ySegCount; y++) {
			const py = halfH + y * segH;
			for (let x = 0; x <= this.xSegCount; x++) {
				const px = halfW + x * segW;
				const idx = y * (this.xSegCount + 1) + x;
				// orientation "xz" → x=0, z=1
				this.attributes.position.values[3 * idx] = px;
				this.attributes.position.values[3 * idx + 1] = -py;
			}
		}

		this.attributes.position.update();
	}
}

class MiniGlMesh {
	geometry: MiniGlPlaneGeometry;
	material: MiniGlMaterial;
	attributeInstances: AttributeInstance[] = [];

	private gl: WebGLRenderingContext;

	constructor(
		minigl: MiniGl,
		geometry: MiniGlPlaneGeometry,
		material: MiniGlMaterial,
	) {
		this.gl = minigl.gl;
		this.geometry = geometry;
		this.material = material;

		for (const [name, attr] of Object.entries(geometry.attributes)) {
			this.attributeInstances.push({
				attribute: attr,
				location: attr.attach(name, material.program),
			});
		}
	}

	draw() {
		const gl = this.gl;
		gl.useProgram(this.material.program);

		for (const { uniform, location } of this.material.uniformInstances) {
			if (uniform.value === undefined || !location) continue;

			const fn = uniform.typeFn;
			if (fn.indexOf("Matrix") === 0) {
				(gl as unknown as Record<string, Function>)[`uniform${fn}`](
					location,
					uniform.transpose ?? false,
					uniform.value,
				);
			} else {
				(gl as unknown as Record<string, Function>)[`uniform${fn}`](
					location,
					uniform.value,
				);
			}
		}

		for (const { attribute, location } of this.attributeInstances) {
			attribute.use(location);
		}

		gl.drawElements(
			gl.TRIANGLES,
			this.geometry.attributes.index.values?.length,
			gl.UNSIGNED_SHORT,
			0,
		);
	}
}

export interface GradientOptions {
	density?: [number, number];
	amp?: number;
	seed?: number;
	freqX?: number;
	freqY?: number;
	onFirstRender?: () => void;
	colors?: Array<[number, number, number]>;
}

export interface GradientInstance {
	play: () => void;
	pause: () => void;
	destroy: () => void;
	updateColors: () => void;
}

export function createGradient(
	canvas: HTMLCanvasElement,
	opts: GradientOptions = {},
): GradientInstance {
	const density = opts.density ?? [0.06, 0.16];
	const amp = opts.amp ?? 320;
	const seed = opts.seed ?? 5;
	const freqX = opts.freqX ?? 14e-5;
	const freqY = opts.freqY ?? 29e-5;

	let t = 1253106;
	let last = 0;
	let playing = true;
	let rafId = 0;
	let width = 0;
	let height = 600;
	let xSegCount = 0;
	let ySegCount = 0;
	let firstRenderFired = false;
	let isMouseDown = false;
	let isMetaKey = false;

	const minigl = new MiniGl(canvas);

	const sectionColors = opts.colors ?? initColors(getComputedStyle(canvas));
	const darkenTop = canvas.dataset.jsDarkenTop !== undefined ? 1 : 0;

	const uniforms: Record<string, MiniGlUniform> = {
		u_time: new MiniGlUniform({ value: 0 }),
		u_shadow_power: new MiniGlUniform({ value: 5 }),
		u_darken_top: new MiniGlUniform({ value: darkenTop }),
		u_active_colors: new MiniGlUniform({
			value: [1, 1, 1, 1],
			type: "vec4",
		}),
		u_global: new MiniGlUniform({
			value: {
				noiseFreq: new MiniGlUniform({
					value: [freqX, freqY],
					type: "vec2",
				}),
				noiseSpeed: new MiniGlUniform({ value: 5e-6 }),
			},
			type: "struct",
		}),
		u_vertDeform: new MiniGlUniform({
			value: {
				incline: new MiniGlUniform({
					value: Math.sin(0) / Math.cos(0),
				}),
				offsetTop: new MiniGlUniform({ value: -0.5 }),
				offsetBottom: new MiniGlUniform({ value: -0.5 }),
				noiseFreq: new MiniGlUniform({ value: [3, 4], type: "vec2" }),
				noiseAmp: new MiniGlUniform({ value: amp }),
				noiseSpeed: new MiniGlUniform({ value: 10 }),
				noiseFlow: new MiniGlUniform({ value: 3 }),
				noiseSeed: new MiniGlUniform({ value: seed }),
			},
			type: "struct",
			excludeFrom: "fragment",
		}),
		u_baseColor: new MiniGlUniform({
			value: sectionColors[0],
			type: "vec3",
			excludeFrom: "fragment",
		}),
		u_waveLayers: new MiniGlUniform({
			value: [] as MiniGlUniform[],
			excludeFrom: "fragment",
			type: "array",
		}),
	};

	for (let i = 1; i < sectionColors.length; i++) {
		(uniforms.u_waveLayers.value as MiniGlUniform[]).push(
			new MiniGlUniform({
				value: {
					color: new MiniGlUniform({
						value: sectionColors[i],
						type: "vec3",
					}),
					noiseFreq: new MiniGlUniform({
						value: [2 + i / sectionColors.length, 3 + i / sectionColors.length],
						type: "vec2",
					}),
					noiseSpeed: new MiniGlUniform({ value: 11 + 0.3 * i }),
					noiseFlow: new MiniGlUniform({ value: 6.5 + 0.3 * i }),
					noiseSeed: new MiniGlUniform({ value: seed + 10 * i }),
					noiseFloor: new MiniGlUniform({ value: 0.1 }),
					noiseCeil: new MiniGlUniform({ value: 0.63 + 0.07 * i }),
				},
				type: "struct",
			}),
		);
	}

	const vertexShader = [NOISE_SHADER, BLEND_SHADER, VERTEX_SHADER].join("\n\n");

	const material = minigl.createMaterial(
		vertexShader,
		FRAGMENT_SHADER,
		uniforms,
	);
	const geometry = minigl.createPlaneGeometry();
	const mesh = minigl.createMesh(geometry, material);

	// Now we need to properly set up uniform locations since the material program is linked
	material.uniformInstances = [];
	attachAllUniforms(material, minigl.commonUniforms);
	attachAllUniforms(material, uniforms);

	function attachAllUniforms(
		mat: MiniGlMaterial,
		u: Record<string, MiniGlUniform>,
		prefix = "",
	) {
		for (const [name, uniform] of Object.entries(u)) {
			const fullName = prefix ? `${prefix}.${name}` : name;
			if (uniform.type === "array") {
				const arr = uniform.value as MiniGlUniform[];
				for (let i = 0; i < arr.length; i++) {
					attachUniform(mat, `${fullName}[${i}]`, arr[i]);
				}
			} else if (uniform.type === "struct") {
				const struct = uniform.value as Record<string, MiniGlUniform>;
				attachAllUniforms(mat, struct, fullName);
			} else {
				const loc = minigl.gl.getUniformLocation(mat.program, fullName);
				if (loc !== null) {
					mat.uniformInstances.push({ uniform, location: loc });
				}
			}
		}
	}

	function attachUniform(
		mat: MiniGlMaterial,
		name: string,
		uniform: MiniGlUniform,
	) {
		if (uniform.type === "struct") {
			const struct = uniform.value as Record<string, MiniGlUniform>;
			attachAllUniforms(mat, struct, name);
		} else {
			const loc = minigl.gl.getUniformLocation(mat.program, name);
			if (loc !== null) {
				mat.uniformInstances.push({ uniform, location: loc });
			}
		}
	}

	function resize() {
		const parent = canvas.parentElement;
		if (!parent) return;
		width = parent.clientWidth;
		height = parent.clientHeight;
		minigl.setSize(width, height);
		minigl.setOrthographicCamera();
		xSegCount = Math.ceil(width * density[0]);
		ySegCount = Math.ceil(height * density[1]);
		mesh.geometry.setTopology(xSegCount, ySegCount);
		mesh.geometry.setSize(width, height);
		uniforms.u_shadow_power.value = width < 600 ? 5 : 6;
	}

	function shouldSkipFrame(timestamp: number): boolean {
		if (document.hidden) return true;
		return Number.parseInt(String(timestamp), 10) % 2 === 0;
	}

	function animate(timestamp: number) {
		if (!shouldSkipFrame(timestamp) || isMouseDown) {
			t += Math.min(timestamp - last, 1000 / 15);
			last = timestamp;

			if (isMouseDown) {
				t += isMetaKey ? -160 : 160;
			}

			uniforms.u_time.value = t;
			minigl.render();

			if (!firstRenderFired) {
				firstRenderFired = true;
				opts.onFirstRender?.();
			}
		}

		if (last === 0) {
			last = timestamp;
		}

		if (playing || isMouseDown) {
			rafId = requestAnimationFrame(animate);
		}
	}

	function handlePointerDown(e: PointerEvent) {
		isMetaKey = e.metaKey;
		isMouseDown = true;
		if (!playing && !rafId) rafId = requestAnimationFrame(animate);
	}

	function handlePointerUp() {
		isMouseDown = false;
	}

	function handleVisibilityChange() {
		if (document.hidden) isMouseDown = false;
	}

	resize();
	rafId = requestAnimationFrame(animate);
	window.addEventListener("resize", resize);
	canvas.addEventListener("pointerdown", handlePointerDown);
	window.addEventListener("pointerup", handlePointerUp);
	canvas.addEventListener("pointercancel", handlePointerUp);
	document.addEventListener("visibilitychange", handleVisibilityChange);

	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);

	if (prefersReducedMotion.matches) {
		playing = false;
		minigl.render();
		if (!firstRenderFired) {
			firstRenderFired = true;
			opts.onFirstRender?.();
		}
	}

	function onMotionChange(e: MediaQueryListEvent) {
		if (e.matches) {
			playing = false;
			cancelAnimationFrame(rafId);
			rafId = 0;
		} else {
			playing = true;
			rafId = requestAnimationFrame(animate);
		}
	}

	prefersReducedMotion.addEventListener("change", onMotionChange);

	return {
		play() {
			if (playing) return;
			playing = true;
			rafId = requestAnimationFrame(animate);
		},
		pause() {
			playing = false;
			cancelAnimationFrame(rafId);
			rafId = 0;
		},
		destroy() {
			playing = false;
			cancelAnimationFrame(rafId);
			rafId = 0;
			window.removeEventListener("resize", resize);
			window.removeEventListener("pointerup", handlePointerUp);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointercancel", handlePointerUp);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			prefersReducedMotion.removeEventListener("change", onMotionChange);
			const ext = minigl.gl.getExtension("WEBGL_lose_context");
			if (ext) ext.loseContext();
		},
		updateColors() {
			const newColors = initColors(getComputedStyle(canvas));
			if (newColors.length === 0) return;

			uniforms.u_baseColor.value = newColors[0];
			uniforms.u_darken_top.value =
				canvas.dataset.jsDarkenTop !== undefined ? 1 : 0;

			const layers = uniforms.u_waveLayers.value as MiniGlUniform[];
			for (let i = 0; i < layers.length; i++) {
				const struct = layers[i].value as Record<string, MiniGlUniform>;
				if (newColors[i + 1]) {
					struct.color.value = newColors[i + 1];
				}
			}
		},
	};
}

function initColors(
	style: CSSStyleDeclaration,
): Array<[number, number, number]> {
	const vars = [
		"--gradient-color-1",
		"--gradient-color-2",
		"--gradient-color-3",
		"--gradient-color-4",
	];

	return vars
		.map((v) => {
			let hex = style.getPropertyValue(v).trim();
			if (!hex) return null;
			if (hex.length === 4) {
				hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
			}
			return normalizeColor(Number.parseInt(hex.slice(1), 16));
		})
		.filter((c): c is [number, number, number] => c !== null);
}
