import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import {
  applyStudioEnvironment,
  createBrushedAlloyTexture,
  createRadialHeatTexture,
  createStudioRenderer,
  createWorldGlobeTextures,
  disposeThreeHierarchy,
  hasWebGLSupport,
  prefersReducedMotion,
} from '../lib/threeUtils';
import type { RegionalCheckpointResult } from '../types/dns';

interface GlobeHeatmap3DProps {
  regions: RegionalCheckpointResult[];
  expectedValue?: string;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  isLoading: boolean;
  isDark: boolean;
  onWebglUnavailable?: () => void;
}

type LatencyTier = 'fast' | 'moderate' | 'slow';

interface ProjectedRegionMeta {
  region: RegionalCheckpointResult;
  tier: LatencyTier;
  propagated: boolean;
  spikeHeight: number;
  pinColorHex: string;
  haloColorHex: string;
  tierLabel: string;
  shortLabel: string;
}

const GLOBE_RADIUS = 1.45;

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((lng + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  const x = -radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function isRegionPropagated(
  region: RegionalCheckpointResult,
  expectedValue?: string
): boolean {
  if (region.status !== 'resolved' || region.answers.length === 0) return false;
  const trimmed = expectedValue?.trim().toLowerCase();
  if (trimmed) {
    return region.answers.some((a) => a.value.toLowerCase().includes(trimmed));
  }
  return true;
}

function classifyTier(latencyMs: number): LatencyTier {
  if (latencyMs < 50) return 'fast';
  if (latencyMs <= 150) return 'moderate';
  return 'slow';
}

function scheduleSoftwareFrame(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  setTimer: (id: number) => void
) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        setTimer(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        setTimer(window.setTimeout(cb, 80));
      }
    };
    setTimer(window.setTimeout(poll, 5));
  } else {
    setTimer(window.setTimeout(cb, 80));
  }
}

export default function GlobeHeatmap3D({
  regions,
  expectedValue,
  selectedRegionId,
  onSelectRegion,
  isLoading,
  isDark,
  onWebglUnavailable,
}: GlobeHeatmap3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(() => !prefersReducedMotion());
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const autoOrbitRef = useRef(autoOrbit);
  const selectedRegionRef = useRef(selectedRegionId);
  const hoveredRegionRef = useRef(hoveredRegionId);
  const onSelectRegionRef = useRef(onSelectRegion);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    selectedRegionRef.current = selectedRegionId;
    requestRenderRef.current?.();
  }, [selectedRegionId]);

  useEffect(() => {
    hoveredRegionRef.current = hoveredRegionId;
    requestRenderRef.current?.();
  }, [hoveredRegionId]);

  useEffect(() => {
    autoOrbitRef.current = autoOrbit;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoOrbit && !prefersReducedMotion();
    }
    requestRenderRef.current?.();
  }, [autoOrbit]);

  const regionMetaMap = useMemo(() => {
    const map = new Map<string, ProjectedRegionMeta>();
    for (const r of regions) {
      const tier = classifyTier(r.latencyMs);
      const propagated = isRegionPropagated(r, expectedValue);
      const spikeHeight =
        tier === 'fast'
          ? 0.14 + Math.min(0.08, (r.latencyMs / 50) * 0.08)
          : tier === 'moderate'
            ? 0.24 + Math.min(0.14, ((r.latencyMs - 50) / 100) * 0.14)
            : 0.40 + Math.min(0.24, ((r.latencyMs - 150) / 250) * 0.24);
      const pinColorHex =
        tier === 'fast'
          ? isDark
            ? '#22C55E'
            : '#16A34A'
          : tier === 'moderate'
            ? isDark
              ? '#FACC15'
              : '#CA8A04'
            : isDark
              ? '#F87171'
              : '#DC2626';
      const haloColorHex =
        tier === 'fast' ? '#22C55E' : tier === 'moderate' ? '#FACC15' : '#EF4444';
      const tierLabel =
        tier === 'fast'
          ? 'Fast (<50ms)'
          : tier === 'moderate'
            ? 'Moderate (50-150ms)'
            : 'High (>150ms)';
      const shortLabel =
        tier === 'fast' ? '< 50 ms' : tier === 'moderate' ? '50-150 ms' : '> 150 ms';
      map.set(r.id, {
        region: r,
        tier,
        propagated,
        spikeHeight,
        pinColorHex,
        haloColorHex,
        tierLabel,
        shortLabel,
      });
    }
    return map;
  }, [regions, expectedValue, isDark]);

  const activeMeta = useMemo(() => {
    const id = hoveredRegionId ?? selectedRegionId;
    return id ? regionMetaMap.get(id) ?? null : null;
  }, [hoveredRegionId, selectedRegionId, regionMetaMap]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    if (!hasWebGLSupport()) {
      onWebglUnavailable?.();
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block cursor-grab active:cursor-grabbing';
    container.appendChild(canvas);

    const { renderer, isSoftwareGl } = createStudioRenderer(canvas, width, height, {
      alpha: false,
      shadows: false,
    });
    const bgHex = isDark ? 0x07101c : 0xeef4fa;
    renderer.setClearColor(bgHex, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(bgHex, 0.045);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    // Start oriented nicely over Europe / North Atlantic / Americas / Asia edge
    camera.position.set(2.4, 1.35, 2.75);
    cameraRef.current = camera;

    // 3-point PBR studio rig
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.1);
    keyLight.position.set(4.5, 4.0, 3.8);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(
      isDark ? 0x93c5fd : 0xe0f2fe,
      isDark ? 0x064e3b : 0x64748b,
      isDark ? 0.85 : 1.15
    );
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.25);
    rimLight.position.set(-4.0, -1.2, -3.6);
    scene.add(rimLight);

    const brushedTex = createBrushedAlloyTexture();
    const { map: worldMapTex, roughnessMap: worldRoughTex } = createWorldGlobeTextures(isDark);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Primary Earth Sphere with Procedural Landmass & Graticule CanvasTexture
    const earthGeom = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: worldMapTex,
      roughnessMap: worldRoughTex,
      roughness: 0.72,
      metalness: 0.14,
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    globeGroup.add(earthMesh);

    // 2. Optical Glass Atmospheric Shell
    const atmosGeom = new THREE.SphereGeometry(GLOBE_RADIUS + 0.035, 48, 36);
    const atmosMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x34d399 : 0x0ea5e9,
      transparent: true,
      opacity: isDark ? 0.11 : 0.09,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    globeGroup.add(atmosMesh);

    // 3. Brushed Emerald Alloy Calibration Gimbal Ring + Polar Finials
    const gimbalGeom = new THREE.TorusGeometry(GLOBE_RADIUS + 0.24, 0.018, 12, 96);
    const gimbalMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x10b981 : 0x0f766e,
      metalness: 0.86,
      roughness: 0.26,
      roughnessMap: brushedTex,
    });
    const gimbalRing = new THREE.Mesh(gimbalGeom, gimbalMat);
    gimbalRing.rotation.set(Math.PI * 0.44, 0.22, 0);
    globeGroup.add(gimbalRing);

    const polarMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x64748b : 0x475569,
      metalness: 0.88,
      roughness: 0.22,
    });
    const polarCapGeom = new THREE.CylinderGeometry(0.06, 0.09, 0.08, 18);
    const northCap = new THREE.Mesh(polarCapGeom, polarMat);
    northCap.position.y = GLOBE_RADIUS + 0.03;
    const southCap = new THREE.Mesh(polarCapGeom, polarMat);
    southCap.position.y = -(GLOBE_RADIUS + 0.03);
    southCap.rotation.x = Math.PI;
    globeGroup.add(northCap, southCap);

    // Shared Heat Textures per tier
    const heatTextures: Record<LatencyTier, THREE.CanvasTexture> = {
      fast: createRadialHeatTexture('#22C55E'),
      moderate: createRadialHeatTexture('#FACC15'),
      slow: createRadialHeatTexture('#EF4444'),
    };

    // Shared geometries for regional spike assemblies
    const haloPlaneGeom = new THREE.PlaneGeometry(0.42, 0.42);
    const collarRingGeom = new THREE.RingGeometry(0.036, 0.056, 20);
    const warnRingGeom = new THREE.RingGeometry(0.064, 0.084, 16);
    const beaconSphereGeom = new THREE.SphereGeometry(0.034, 14, 14);
    const hitCapsuleGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.65, 10);

    const upAxis = new THREE.Vector3(0, 1, 0);
    const pickTargets: THREE.Mesh[] = [];
    const spikeHandles = new Map<
      string,
      {
        spikeMesh: THREE.Mesh;
        beaconMesh: THREE.Mesh;
        haloMesh: THREE.Mesh;
        baseScaleY: number;
      }
    >();

    // Find fastest healthy node to project subtle Anycast pulse arcs
    const sortedHealthy = [...regions]
      .filter((r) => r.status === 'resolved')
      .sort((a, b) => a.latencyMs - b.latencyMs);
    const hubNode = sortedHealthy[0] ?? regions[0];
    const hubPos = hubNode
      ? latLngToVector3(hubNode.lat, hubNode.lng, GLOBE_RADIUS + 0.02)
      : null;

    const pulsePackets: Array<{ mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; phase: number }> = [];

    regions.forEach((region, idx) => {
      const meta = regionMetaMap.get(region.id);
      if (!meta) return;

      const surfacePos = latLngToVector3(region.lat, region.lng, GLOBE_RADIUS + 0.006);
      const normal = surfacePos.clone().normalize();
      const alignQuat = new THREE.Quaternion().setFromUnitVectors(upAxis, normal);

      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(surfacePos);
      nodeGroup.quaternion.copy(alignQuat);
      globeGroup.add(nodeGroup);

      // Surface Radial Heat Halo
      const haloScale =
        meta.tier === 'fast' ? 0.85 : meta.tier === 'moderate' ? 1.15 : 1.48;
      const haloMat = new THREE.MeshBasicMaterial({
        map: heatTextures[meta.tier],
        transparent: true,
        opacity: isDark ? 0.85 : 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloPlaneGeom, haloMat);
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = 0.008;
      haloMesh.scale.setScalar(haloScale);
      nodeGroup.add(haloMesh);

      // Base Collar Ring
      const tierColor = new THREE.Color(meta.pinColorHex);
      const collarMat = new THREE.MeshStandardMaterial({
        color: tierColor,
        emissive: tierColor,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.55,
        side: THREE.DoubleSide,
      });
      const collarMesh = new THREE.Mesh(collarRingGeom, collarMat);
      collarMesh.rotation.x = -Math.PI / 2;
      collarMesh.position.y = 0.012;
      nodeGroup.add(collarMesh);

      // Explicit Warning Ring for Non-Propagated checkpoints
      if (!meta.propagated) {
        const warnMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
        });
        const warnMesh = new THREE.Mesh(warnRingGeom, warnMat);
        warnMesh.rotation.x = -Math.PI / 2;
        warnMesh.position.y = 0.014;
        nodeGroup.add(warnMesh);
      }

      // Elevated Latency Column
      const colGeom = new THREE.CylinderGeometry(0.018, 0.032, meta.spikeHeight, 12);
      colGeom.translate(0, meta.spikeHeight / 2, 0);
      const colMat = new THREE.MeshStandardMaterial({
        color: tierColor,
        emissive: tierColor,
        emissiveIntensity: 0.45,
        roughness: 0.24,
        metalness: 0.65,
      });
      const spikeMesh = new THREE.Mesh(colGeom, colMat);
      nodeGroup.add(spikeMesh);

      // Glowing Tip Beacon
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: tierColor,
        emissiveIntensity: 1.05,
        roughness: 0.15,
        metalness: 0.1,
      });
      const beaconMesh = new THREE.Mesh(beaconSphereGeom, beaconMat);
      beaconMesh.position.y = meta.spikeHeight + 0.025;
      nodeGroup.add(beaconMesh);

      // Invisible Raycaster Pick Target
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitCapsuleGeom, hitMat);
      hitMesh.position.y = 0.28;
      hitMesh.userData.regionId = region.id;
      nodeGroup.add(hitMesh);
      pickTargets.push(hitMesh);

      spikeHandles.set(region.id, {
        spikeMesh,
        beaconMesh,
        haloMesh,
        baseScaleY: 1,
      });

      // Subtle Anycast Fiber Arc from fastest hub to sample checkpoints (up to 6 arcs to avoid clutter)
      if (hubPos && hubNode && region.id !== hubNode.id && idx % 3 === 0) {
        const targetPos = latLngToVector3(region.lat, region.lng, GLOBE_RADIUS + 0.02);
        const midPoint = hubPos
          .clone()
          .add(targetPos)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(GLOBE_RADIUS + 0.36);
        const curve = new THREE.QuadraticBezierCurve3(hubPos, midPoint, targetPos);
        const arcGeom = new THREE.TubeGeometry(curve, 24, 0.006, 6, false);
        const arcMat = new THREE.MeshBasicMaterial({
          color: isDark ? 0x38bdf8 : 0x0284c7,
          transparent: true,
          opacity: 0.28,
        });
        globeGroup.add(new THREE.Mesh(arcGeom, arcMat));

        const packetMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 8, 8),
          new THREE.MeshBasicMaterial({ color: isDark ? 0x6ee7b7 : 0x059669 })
        );
        globeGroup.add(packetMesh);
        pulsePackets.push({ mesh: packetMesh, curve, phase: (idx * 0.19) % 1 });
      }
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.35;
    controls.maxDistance = 5.4;
    controls.autoRotate = !isSoftwareGl && autoOrbitRef.current && !prefersReducedMotion();
    controls.autoRotateSpeed = 0.85;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const scratchPoint = new THREE.Vector3();

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    const reduced = prefersReducedMotion();

    const drawFrame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Update spike highlight scales smoothly
      const activeId = hoveredRegionRef.current ?? selectedRegionRef.current;
      for (const [id, handle] of spikeHandles.entries()) {
        const isHighlighted = id === activeId;
        const targetScale = isHighlighted ? 1.32 : 1.0;
        const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-12 * dt);
        handle.baseScaleY += (targetScale - handle.baseScaleY) * alpha;
        handle.spikeMesh.scale.set(isHighlighted ? 1.35 : 1, handle.baseScaleY, isHighlighted ? 1.35 : 1);
        handle.beaconMesh.scale.setScalar(isHighlighted ? 1.45 : 1);
        const mat = handle.haloMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = activeId && !isHighlighted ? 0.42 : isDark ? 0.88 : 0.8;
      }

      if (!reduced) {
        gimbalRing.rotation.z += dt * 0.12;
        for (const p of pulsePackets) {
          p.phase = (p.phase + dt * 0.28) % 1;
          p.curve.getPoint(p.phase, scratchPoint);
          p.mesh.position.copy(scratchPoint);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = window.requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        drawFrame();
        const done = () => {
          renderBusy = false;
          const keepAnimating =
            !reduced && !isSoftwareGl && (autoOrbitRef.current || pulsePackets.length > 0);
          if (!disposed && (renderDirty || keepAnimating)) {
            requestRender();
          }
        };
        if (isSoftwareGl) {
          scheduleSoftwareFrame(renderer, done, (id) => {
            frameId = id;
          });
        } else {
          done();
        }
      });
    };
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);
    requestRender();

    // Pointer hover & click raycasting (distinguish click vs orbit drag)
    let downX = 0;
    let downY = 0;
    let lastRaycast = 0;

    const getHitRegion = (clientX: number, clientY: number): string | null => {
      const b = canvas.getBoundingClientRect();
      pointer.x = ((clientX - b.left) / Math.max(1, b.width)) * 2 - 1;
      pointer.y = -((clientY - b.top) / Math.max(1, b.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.regionId;
        return typeof id === 'string' ? id : null;
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycast < 45) return;
      lastRaycast = now;
      const hitId = getHitRegion(e.clientX, e.clientY);
      canvas.style.cursor = hitId ? 'pointer' : 'grab';
      setHoveredRegionId((prev) => (prev === hitId ? prev : hitId));
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 6) return;
      const hitId = getHitRegion(e.clientX, e.clientY);
      if (hitId) {
        const currentSelected = selectedRegionRef.current;
        onSelectRegionRef.current(currentSelected === hitId ? null : hitId);
      }
    };

    const onPointerLeave = () => {
      setHoveredRegionId(null);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed) return;
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      const h = Math.max(260, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      requestRender();
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeThreeHierarchy(scene);
      haloPlaneGeom.dispose();
      collarRingGeom.dispose();
      warnRingGeom.dispose();
      beaconSphereGeom.dispose();
      hitCapsuleGeom.dispose();
      heatTextures.fast.dispose();
      heatTextures.moderate.dispose();
      heatTextures.slow.dispose();
      brushedTex.dispose();
      worldMapTex.dispose();
      worldRoughTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [regions, regionMetaMap, isDark, onWebglUnavailable]);

  const handleResetGlobe = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2.4, 1.35, 2.75);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      requestRenderRef.current?.();
    }
  };

  return (
    <div className="relative w-full h-[330px] sm:h-[400px] select-none overflow-hidden">
      <div
        ref={mountRef}
        className="w-full h-full"
        role="img"
        aria-label="Interactive 3D globe displaying color-coded DNS latency heat spikes across 18 global checkpoints"
      />

      {/* Floating Controls (solid/rgba surface, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoOrbit((prev) => !prev)}
          className="pointer-events-auto h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 shadow-sm cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          {autoOrbit ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Pause Spin</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Auto Orbit</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleResetGlobe}
          className="pointer-events-auto h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {/* Subtle Bottom-Left Hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-slate-300/80 dark:border-slate-700/80 bg-white/92 dark:bg-slate-900/92 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
        Drag to rotate · Scroll to zoom · Click spike to inspect node
      </div>

      {/* Active Node Telemetry Card */}
      {activeMeta && !isLoading && (
        <div className="absolute top-4 left-4 z-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-md text-xs max-w-[290px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {activeMeta.region.city} · {activeMeta.region.countryCode}
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                {activeMeta.region.provider}
              </div>
            </div>
            {selectedRegionId === activeMeta.region.id && !hoveredRegionId && (
              <button
                type="button"
                onClick={() => onSelectRegion(null)}
                aria-label="Clear selected region"
                className="w-7 h-7 -mt-1 -mr-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
            {activeMeta.region.primaryValue ??
              (activeMeta.propagated ? 'Propagated' : 'Non-Propagated')}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
            <span
              className={`font-medium ${
                activeMeta.propagated
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {activeMeta.propagated ? 'Propagated' : 'Non-Propagated'}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span style={{ color: activeMeta.pinColorHex }} className="font-mono font-semibold">
              {activeMeta.region.latencyMs} ms ({activeMeta.shortLabel})
            </span>
          </div>
        </div>
      )}

      {/* Loading Scrim */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-50/75 dark:bg-slate-950/75 flex items-center justify-center">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md shadow-xs">
            Querying 18 regional checkpoints...
          </span>
        </div>
      )}

      {/* WebGL Context Lost Overlay */}
      {contextLost && (
        <div className="absolute inset-0 z-20 bg-slate-900/85 flex items-center justify-center p-4 text-center text-xs text-slate-200">
          3D WebGL context interrupted. Switch to 2D Heatmap or reload to restore.
        </div>
      )}
    </div>
  );
}
