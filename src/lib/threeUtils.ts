import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type LogoFinishPreset = 'emerald-glass' | 'obsidian-chrome' | 'wireframe-cad';

const CONTINENT_POLYGONS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  // North America (in 800x400 equirectangular coordinates)
  [
    [31, 55], [78, 44], [118, 42], [176, 44], [245, 40], [270, 54], [266, 78],
    [246, 105], [222, 145], [204, 140], [184, 142], [194, 156], [207, 154],
    [216, 172], [227, 182], [218, 186], [198, 172], [167, 156], [147, 132],
    [138, 140], [124, 111], [116, 86], [100, 71], [66, 66], [34, 68],
  ],
  // Greenland
  [[278, 18], [336, 16], [348, 34], [314, 58], [288, 48]],
  // South America
  [
    [227, 180], [248, 174], [268, 182], [302, 198], [323, 213], [314, 236],
    [300, 251], [284, 268], [271, 279], [258, 308], [249, 324], [238, 312],
    [236, 286], [242, 252], [226, 225], [220, 208], [225, 190],
  ],
  // Europe
  [
    [380, 118], [378, 104], [392, 94], [408, 86], [416, 74], [411, 62],
    [432, 46], [456, 42], [495, 44], [533, 49], [528, 76], [496, 92],
    [464, 109], [451, 118], [442, 108], [434, 118], [424, 104], [408, 108], [396, 118],
  ],
  // UK & Ireland
  [[386, 89], [389, 72], [399, 71], [402, 85], [393, 90]],
  [[378, 86], [383, 80], [385, 88], [379, 90]],
  // Africa
  [
    [380, 122], [422, 118], [454, 126], [472, 132], [495, 162], [514, 173],
    [498, 202], [489, 222], [478, 256], [456, 274], [440, 276], [427, 234],
    [421, 192], [396, 189], [368, 182], [362, 167], [374, 142],
  ],
  // Madagascar
  [[498, 256], [504, 228], [512, 232], [505, 258]],
  // Asia
  [
    [476, 120], [502, 104], [533, 49], [584, 42], [642, 32], [718, 38],
    [784, 52], [762, 72], [756, 88], [742, 74], [722, 92], [702, 108],
    [687, 122], [672, 134], [660, 156], [644, 174], [631, 198], [620, 188],
    [613, 164], [594, 156], [572, 184], [558, 158], [548, 144], [524, 142],
    [531, 152], [504, 172], [490, 154], [478, 134],
  ],
  // Japan & Taiwan
  [[696, 128], [708, 118], [718, 104], [724, 110], [710, 126]],
  [[667, 148], [671, 142], [673, 149], [668, 153]],
  // Indonesia & Philippines
  [[616, 204], [638, 210], [656, 212], [652, 218], [626, 214]],
  [[642, 192], [658, 188], [664, 198], [646, 202]],
  // Australia
  [
    [653, 249], [676, 232], [692, 226], [716, 224], [732, 248], [736, 276],
    [720, 286], [694, 274], [668, 276], [656, 271],
  ],
  // New Zealand
  [[762, 296], [774, 282], [778, 292], [766, 306]],
];

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export function hasWebGLSupport(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createStudioRenderer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  options?: { alpha?: boolean; shadows?: boolean }
): { renderer: THREE.WebGLRenderer; isSoftwareGl: boolean } {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareGl,
    alpha: options?.alpha ?? true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(1, width), Math.max(1, height), false);
  renderer.shadowMap.enabled = Boolean(options?.shadows) && !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return { renderer, isSoftwareGl };
}

export function applyStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();
  return envTex;
}

export function createBrushedAlloyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y++) {
      const lum = 104 + Math.floor(((Math.sin(y * 0.73) + Math.cos(y * 1.91)) * 0.5 + 1) * 28);
      ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
      ctx.fillRect(0, y, 256, 1);
    }
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 420; i++) {
      const x = (i * 53) % 256;
      const y = (i * 97) % 256;
      const w = 18 + (i % 44);
      ctx.fillStyle = i % 2 === 0 ? '#d4d4d8' : '#3f3f46';
      ctx.fillRect(x, y, w, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createWorldGlobeTextures(isDark: boolean): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 1600;
  const h = 800;
  const scale = 2; // polygons defined on 800x400

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d');

  if (cCtx && rCtx) {
    // Ocean fill
    const oceanGrad = cCtx.createLinearGradient(0, 0, 0, h);
    if (isDark) {
      oceanGrad.addColorStop(0, '#091526');
      oceanGrad.addColorStop(0.5, '#071120');
      oceanGrad.addColorStop(1, '#091526');
    } else {
      oceanGrad.addColorStop(0, '#DCE7F3');
      oceanGrad.addColorStop(0.5, '#E7EFF7');
      oceanGrad.addColorStop(1, '#DCE7F3');
    }
    cCtx.fillStyle = oceanGrad;
    cCtx.fillRect(0, 0, w, h);

    // Ocean is smoother / slightly glossy, landmasses are matte brushed alloy
    rCtx.fillStyle = '#585858';
    rCtx.fillRect(0, 0, w, h);

    // Latitude & Longitude Graticule Lines
    cCtx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(15, 118, 110, 0.14)';
    cCtx.lineWidth = 1.25;
    for (let lon = 0; lon <= 12; lon++) {
      const gx = (lon / 12) * w;
      cCtx.beginPath();
      cCtx.moveTo(gx, 0);
      cCtx.lineTo(gx, h);
      cCtx.stroke();
    }
    for (let lat = 1; lat < 6; lat++) {
      const gy = (lat / 6) * h;
      cCtx.beginPath();
      cCtx.moveTo(0, gy);
      cCtx.lineTo(w, gy);
      cCtx.stroke();
    }

    // Continental landmasses
    for (const poly of CONTINENT_POLYGONS) {
      cCtx.beginPath();
      rCtx.beginPath();
      poly.forEach(([px, py], idx) => {
        const sx = px * scale;
        const sy = py * scale;
        if (idx === 0) {
          cCtx.moveTo(sx, sy);
          rCtx.moveTo(sx, sy);
        } else {
          cCtx.lineTo(sx, sy);
          rCtx.lineTo(sx, sy);
        }
      });
      cCtx.closePath();
      rCtx.closePath();

      cCtx.fillStyle = isDark ? '#123338' : '#B7CBC8';
      cCtx.fill();
      cCtx.strokeStyle = isDark ? '#2DD4BF' : '#0F766E';
      cCtx.lineWidth = 1.75;
      cCtx.stroke();

      rCtx.fillStyle = '#B8B8B8';
      rCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.needsUpdate = true;

  return { map, roughnessMap };
}

export function createRadialHeatTexture(hexColor: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = new THREE.Color(hexColor);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.92)`);
    grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.44)`);
    grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, 0.12)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.42)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.16)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface EmblemMaterials {
  alloyMat: THREE.MeshStandardMaterial;
  bezelMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshPhysicalMaterial;
  coreMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  studMat: THREE.MeshStandardMaterial;
}

export function buildDnsLocatorEmblemGroup(options: {
  brushedTex: THREE.Texture;
  isSoftwareGl: boolean;
  finish?: LogoFinishPreset;
}): {
  root: THREE.Group;
  orbitRing: THREE.Mesh;
  coreBeacon: THREE.Mesh;
  materials: EmblemMaterials;
} {
  const { brushedTex, isSoftwareGl, finish = 'emerald-glass' } = options;
  const root = new THREE.Group();

  const isWireframe = finish === 'wireframe-cad';
  const isObsidian = finish === 'obsidian-chrome';

  // 1. Primary Silhouette: Machined Beveled D-Frame Chassis
  const dShape = new THREE.Shape();
  dShape.moveTo(-0.56, -0.78);
  dShape.lineTo(0.02, -0.78);
  dShape.absarc(0.02, 0, 0.78, -Math.PI / 2, Math.PI / 2, false);
  dShape.lineTo(-0.56, 0.78);
  dShape.closePath();

  const dHole = new THREE.Path();
  dHole.moveTo(-0.34, -0.54);
  dHole.lineTo(0.02, -0.54);
  dHole.absarc(0.02, 0, 0.54, -Math.PI / 2, Math.PI / 2, false);
  dHole.lineTo(-0.34, 0.54);
  dHole.closePath();
  dShape.holes.push(dHole);

  const dGeom = new THREE.ExtrudeGeometry(dShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 32,
  });
  dGeom.center();

  const alloyMat = new THREE.MeshStandardMaterial({
    color: isObsidian ? 0x1e293b : 0x059669,
    metalness: 0.86,
    roughness: 0.30,
    roughnessMap: brushedTex,
    emissive: isWireframe ? 0x10b981 : 0x022c22,
    emissiveIntensity: isWireframe ? 0.45 : 0.25,
    wireframe: isWireframe,
  });
  const chassisMesh = new THREE.Mesh(dGeom, alloyMat);
  chassisMesh.castShadow = !isSoftwareGl;
  chassisMesh.receiveShadow = true;
  root.add(chassisMesh);

  // 2. Secondary Read: Inner Titanium Bezel Trim
  const trimShape = new THREE.Shape();
  trimShape.moveTo(-0.38, -0.58);
  trimShape.lineTo(0.02, -0.58);
  trimShape.absarc(0.02, 0, 0.58, -Math.PI / 2, Math.PI / 2, false);
  trimShape.lineTo(-0.38, 0.58);
  trimShape.closePath();

  const trimHole = new THREE.Path();
  trimHole.moveTo(-0.32, -0.51);
  trimHole.lineTo(0.02, -0.51);
  trimHole.absarc(0.02, 0, 0.51, -Math.PI / 2, Math.PI / 2, false);
  trimHole.lineTo(-0.32, 0.51);
  trimHole.closePath();
  trimShape.holes.push(trimHole);

  const trimGeom = new THREE.ExtrudeGeometry(trimShape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 28,
  });
  trimGeom.center();

  const bezelMat = new THREE.MeshStandardMaterial({
    color: isObsidian ? 0x34d399 : 0xd1fae5,
    metalness: 0.92,
    roughness: 0.16,
    wireframe: isWireframe,
  });
  const bezelMesh = new THREE.Mesh(trimGeom, bezelMat);
  root.add(bezelMesh);

  // 3. Optical Glass Locator Pin Prism (teardrop silhouette matching favicon.svg)
  const pinShape = new THREE.Shape();
  pinShape.moveTo(0, -0.42);
  pinShape.bezierCurveTo(0.28, -0.22, 0.36, -0.02, 0.36, 0.13);
  pinShape.absarc(0, 0.13, 0.36, 0, Math.PI, false);
  pinShape.bezierCurveTo(-0.36, -0.02, -0.28, -0.22, 0, -0.42);

  const pinGeom = new THREE.ExtrudeGeometry(pinShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 28,
  });
  pinGeom.center();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: isObsidian ? 0x6ee7b7 : 0x34d399,
    metalness: 0.04,
    roughness: 0.08,
    transmission: isSoftwareGl || isWireframe ? 0 : 0.84,
    transparent: true,
    opacity: isWireframe ? 0.55 : isSoftwareGl ? 0.78 : 1,
    ior: 1.52,
    thickness: 0.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: 0x059669,
    emissiveIntensity: 0.18,
    wireframe: isWireframe,
  });
  const pinMesh = new THREE.Mesh(pinGeom, glassMat);
  pinMesh.position.set(0.06, 0.01, 0.04);
  pinMesh.castShadow = !isSoftwareGl;
  root.add(pinMesh);

  // 4. Inner Collar + Luminous Beacon Core
  const collarGeom = new THREE.TorusGeometry(0.145, 0.026, 14, 32);
  const collarMesh = new THREE.Mesh(collarGeom, bezelMat);
  collarMesh.position.set(0.06, 0.08, 0.14);
  root.add(collarMesh);

  const coreGeom = new THREE.SphereGeometry(0.115, 24, 24);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xa7f3d0,
    emissive: 0x10b981,
    emissiveIntensity: 0.95,
    roughness: 0.22,
    metalness: 0.12,
    wireframe: isWireframe,
  });
  const coreBeacon = new THREE.Mesh(coreGeom, coreMat);
  coreBeacon.position.set(0.06, 0.08, 0.14);
  root.add(coreBeacon);

  // 5. Tilted Orbital Calibration Ring
  const orbitGeom = new THREE.TorusGeometry(0.98, 0.032, 16, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: isObsidian ? 0x6ee7b7 : 0x0f766e,
    metalness: 0.88,
    roughness: 0.22,
    wireframe: isWireframe,
  });
  const orbitRing = new THREE.Mesh(orbitGeom, ringMat);
  orbitRing.rotation.set(Math.PI * 0.36, -Math.PI * 0.12, 0);
  root.add(orbitRing);

  // 6. Four Machined Corner Calibration Studs (contrasting matte roughness >= 0.25 delta)
  const studMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.55,
    roughness: 0.62,
    wireframe: isWireframe,
  });
  const studGeom = new THREE.CylinderGeometry(0.042, 0.042, 0.38, 12);
  const studPositions: Array<[number, number, number]> = [
    [-0.45, 0.66, 0],
    [-0.45, -0.66, 0],
    [0.64, 0.38, 0],
    [0.64, -0.38, 0],
  ];
  for (const [sx, sy, sz] of studPositions) {
    const stud = new THREE.Mesh(studGeom, studMat);
    stud.rotation.x = Math.PI / 2;
    stud.position.set(sx, sy, sz);
    root.add(stud);
  }

  return {
    root,
    orbitRing,
    coreBeacon,
    materials: { alloyMat, bezelMat, glassMat, coreMat, ringMat, studMat },
  };
}

export function disposeThreeHierarchy(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => disposeMaterialTextures(m));
    } else if (mat) {
      disposeMaterialTextures(mat);
    }
  });
}

function disposeMaterialTextures(mat: THREE.Material): void {
  const rec = mat as unknown as Record<string, unknown>;
  for (const key of [
    'map',
    'roughnessMap',
    'metalnessMap',
    'normalMap',
    'emissiveMap',
    'alphaMap',
    'aoMap',
  ]) {
    const tex = rec[key];
    if (tex && typeof (tex as THREE.Texture).dispose === 'function') {
      (tex as THREE.Texture).dispose();
    }
  }
  mat.dispose();
}
