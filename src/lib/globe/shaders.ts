export const dotVertex = /* glsl */ `
attribute vec3 aPosition;
attribute vec3 aFlatPosition;
attribute vec3 aSpherePosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform float uMorph;
uniform float uPointSize;

varying float vDistToCamera;
varying float vVisible;

void main() {
  vec3 pos = mix(aFlatPosition, aSpherePosition, uMorph);
  vec4 mvPosition = uViewMatrix * uModelMatrix * vec4(pos, 1.0);
  gl_Position = uProjectionMatrix * mvPosition;
  vDistToCamera = -mvPosition.z;

  vec4 sphereNormal = uModelMatrix * vec4(normalize(aSpherePosition), 0.0);
  float facing = sphereNormal.z;
  vVisible = mix(1.0, step(0.0, facing), uMorph);
  gl_PointSize = vVisible > 0.5 ? uPointSize : 0.0;
}
`;

export const dotFragment = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uMaxDist;

varying float vDistToCamera;
varying float vVisible;

void main() {
  if (vVisible < 0.5) discard;

  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;

  float distFade = clamp(1.0 - (vDistToCamera - uMaxDist * 0.5) / (uMaxDist * 0.5), 0.0, 1.0);
  float alpha = smoothstep(0.5, 0.15, d) * distFade;
  alpha = max(alpha, 0.35 * step(d, 0.35) * distFade);
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`;

export const markerVertex = /* glsl */ `
attribute vec3 aPosition;
attribute vec3 aFlatPosition;
attribute vec3 aSpherePosition;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform float uMorph;
uniform float uTime;

varying float vDistToCamera;
varying float vPulse;
varying float vVisible;
varying vec3 vColor;

void main() {
  vec3 pos = mix(aFlatPosition, aSpherePosition, uMorph);
  vec4 mvPosition = uViewMatrix * uModelMatrix * vec4(pos, 1.0);
  gl_Position = uProjectionMatrix * mvPosition;
  vDistToCamera = -mvPosition.z;

  vec4 sphereNormal = uModelMatrix * vec4(normalize(aSpherePosition), 0.0);
  float facing = sphereNormal.z;
  vVisible = mix(1.0, step(0.0, facing), uMorph);

  float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase);
  vPulse = pulse;
  vColor = aColor;
  gl_PointSize = vVisible > 0.5 ? aSize * (1.0 + pulse * 0.3) : 0.0;
}
`;

export const markerFragment = /* glsl */ `
precision highp float;

uniform float uMaxDist;

varying float vDistToCamera;
varying float vPulse;
varying float vVisible;
varying vec3 vColor;

void main() {
  if (vVisible < 0.5) discard;

  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;

  float distFade = clamp(1.0 - (vDistToCamera - uMaxDist * 0.5) / (uMaxDist * 0.5), 0.0, 1.0);

  float core = smoothstep(0.5, 0.0, d);
  float glow = exp(-d * 4.0);
  float alpha = mix(glow, core, 0.5) * distFade;
  alpha *= 0.6 + vPulse * 0.4;

  vec3 color = mix(vColor, vec3(1.0), core * 0.3);
  gl_FragColor = vec4(color, alpha);
}
`;
