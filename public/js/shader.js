/**
 * Reelsidian Fluted Glass WebGL Background Shader (Three.js)
 * Implements:
 * - Transparent optical glass ribs (dynamic Fresnel + caustics)
 * - Fluid organic lower waves with obsidian, copper, ivory, and petrol navy tones
 * - Responsive viewport resizing at 60 FPS
 */

(function initFlutedGlassShader() {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float grain(vec2 uv, float t) {
      vec2 seed = uv * u_resolution.xy;
      float n = fract(sin(dot(seed + fract(t * 0.05), vec2(12.9898, 78.233))) * 43758.5453123);
      return (n - 0.5) * 2.0;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;

      // 1. Transparent Vertical Fluted Glass Lines
      float ribDensity = 140.0;
      float ribX = uv.x * ribDensity;
      float ribLocal = fract(ribX);
      float ribIndex = floor(ribX);
      float nx = (ribLocal - 0.5) * 2.0;

      // 2. Active Fluid Wave Motion in the Lower Section
      float t = u_time * 0.65;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.8;
      p.x += nx * 0.016;

      float wave1 = sin(uv.x * 2.8 + t * 0.85) * 0.10;
      float wave2 = cos(uv.x * 1.9 - t * 0.70) * 0.08;
      float wave3 = sin((uv.x + uv.y) * 2.2 + t * 0.95) * 0.06;

      float fluidDrift = snoise(vec2(p.x * 1.4 + t * 0.35, p.y * 1.2 - t * 0.30)) * 0.14;
      float combSpike  = sin(ribIndex * 0.45 + t * 0.75) * 0.035;

      float dynamicWaveY = uv.y + wave1 + wave2 + wave3 + fluidDrift + combSpike;

      // 3. Exact Color Architecture
      vec3 c_dark_obsidian = vec3(0.040, 0.035, 0.032);
      vec3 c_burnt_copper  = vec3(0.78, 0.28, 0.12);
      vec3 c_warm_amber    = vec3(0.90, 0.50, 0.22);
      vec3 c_ivory_cream   = vec3(0.95, 0.91, 0.83);
      vec3 c_pure_silk     = vec3(0.99, 0.98, 0.96);
      vec3 c_seafoam_cyan  = vec3(0.40, 0.74, 0.82);
      vec3 c_petrol_navy   = vec3(0.04, 0.16, 0.26);
      vec3 c_electric_cyan = vec3(0.18, 0.62, 0.78);

      // 4. Moving Lower Wave Composition
      float leftWeight   = smoothstep(0.55, 0.10, p.x + wave2 * 0.5 + fluidDrift * 0.4);
      float rightWeight  = smoothstep(0.35, 0.82, p.x + wave1 * 0.5 - fluidDrift * 0.4);
      float centerWeight = smoothstep(0.15, 0.45, p.x) * (1.0 - smoothstep(0.55, 0.85, p.x));

      vec3 lowerBody = c_ivory_cream;
      lowerBody = mix(lowerBody, c_burnt_copper, leftWeight * 0.96);
      lowerBody = mix(lowerBody, c_warm_amber, leftWeight * 0.40);
      lowerBody = mix(lowerBody, c_petrol_navy, rightWeight * 0.94);
      lowerBody = mix(lowerBody, c_electric_cyan, rightWeight * smoothstep(0.1, 0.48, uv.y) * 0.70);

      float seafoamZone = smoothstep(0.12, 0.38, dynamicWaveY) * (1.0 - smoothstep(0.48, 0.72, dynamicWaveY));
      lowerBody = mix(lowerBody, c_seafoam_cyan, seafoamZone * centerWeight * 0.78);

      float ivoryGlow = centerWeight * smoothstep(0.20, 0.62, dynamicWaveY);
      lowerBody = mix(lowerBody, c_pure_silk, ivoryGlow * 0.75);

      // 5. Clean Transition to Dark Top
      float darkTransition = smoothstep(0.32, 0.70, dynamicWaveY);
      vec3 color = mix(lowerBody, c_dark_obsidian, darkTransition);

      float topRightDark = smoothstep(0.28, 0.85, p.x) * smoothstep(0.32, 0.80, p.y);
      color = mix(color, c_dark_obsidian, topRightDark * 0.70);

      // 6. Tactile Film Grain
      float g = grain(uv, u_time);
      color += vec3(g * 0.032);

      // 7. Dynamic Optical Glass Properties
      float grooveOptical = smoothstep(0.0, 0.25, ribLocal) * smoothstep(1.0, 0.75, ribLocal);
      color *= (0.94 + 0.06 * grooveOptical);

      float lightIntensity = dot(lowerBody, vec3(0.299, 0.587, 0.114)) * (1.0 - darkTransition);
      float fresnelReflection = pow(abs(nx), 2.4) * 0.35;
      float glassCaustic = pow(max(0.0, 1.0 - abs(nx - 0.22)), 16.0) * 0.40;

      vec3 reactiveGlassGlow = lowerBody * (fresnelReflection + glassCaustic) * lightIntensity;
      color += reactiveGlassGlow * 0.45;

      color.r += nx * 0.016 * lightIntensity;
      color.b -= nx * 0.016 * lightIntensity;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms,
    depthWrite: false,
    depthTest: false
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    uniforms.u_resolution.value.set(width, height);
  }
  window.addEventListener('resize', resize);
  resize();

  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  animate();
})();
