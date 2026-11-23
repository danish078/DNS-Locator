import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import {
  applyStudioEnvironment,
  buildDnsLocatorEmblemGroup,
  createBrushedAlloyTexture,
  createContactShadowTexture,
  createStudioRenderer,
  disposeThreeHierarchy,
  hasWebGLSupport,
  prefersReducedMotion,
  type LogoFinishPreset,
} from '../lib/threeUtils';

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

interface LogoShowcaseModalProps {
  onClose: () => void;
}

function LogoShowcaseModal({ onClose }: LogoShowcaseModalProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [finish, setFinish] = useState<LogoFinishPreset>('emerald-glass');
  const [autoSpin, setAutoSpin] = useState<boolean>(() => !prefersReducedMotion());
  const [webglReady, setWebglReady] = useState<boolean>(() => hasWebGLSupport());
  const [contextLost, setContextLost] = useState(false);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const autoSpinRef = useRef<boolean>(autoSpin);
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoSpin && !prefersReducedMotion();
    }
    requestRenderRef.current?.();
  }, [autoSpin]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const container = stageRef.current;
    if (!container || !hasWebGLSupport()) {
      setWebglReady(false);
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block';
    container.appendChild(canvas);

    const { renderer, isSoftwareGl } = createStudioRenderer(canvas, width, height, {
      alpha: false,
      shadows: true,
    });
    renderer.setClearColor(0x06131c, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06131c, 0.085);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0.35, 0.25, 4.1);
    cameraRef.current = camera;

    // Studio 3-point lighting
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(3.2, 4.2, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -2.2;
    keyLight.shadow.camera.right = 2.2;
    keyLight.shadow.camera.top = 2.2;
    keyLight.shadow.camera.bottom = -2.2;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const hemiFill = new THREE.HemisphereLight(0xbae6fd, 0x064e3b, 0.85);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.45);
    rimLight.position.set(-3.0, 1.6, -2.8);
    scene.add(rimLight);

    const brushedTex = createBrushedAlloyTexture();
    const emblem = buildDnsLocatorEmblemGroup({
      brushedTex,
      isSoftwareGl,
      finish,
    });
    emblem.root.position.y = 0.12;
    scene.add(emblem.root);

    // Subtle brushed ground stage & soft contact shadow disc
    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.04;
    scene.add(shadowPlane);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.55, 0.08, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.75,
        roughness: 0.38,
      })
    );
    plinth.position.y = -1.1;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.autoRotate = !isSoftwareGl && autoSpinRef.current && !prefersReducedMotion();
    controls.autoRotateSpeed = 1.65;
    controlsRef.current = controls;

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    const drawFrame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (autoSpinRef.current && !prefersReducedMotion()) {
        emblem.orbitRing.rotation.z += dt * 0.55;
        emblem.coreBeacon.scale.setScalar(1 + Math.sin(now * 0.003) * 0.06);
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
          if (!disposed && (renderDirty || (autoSpinRef.current && !prefersReducedMotion()))) {
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
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeThreeHierarchy(scene);
      brushedTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [finish]);

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0.35, 0.25, 4.1);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      requestRenderRef.current?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logo-3d-showcase-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl h-[440px] sm:h-[520px] rounded-2xl border border-slate-700/80 bg-[#06131C] overflow-hidden shadow-2xl">
        {/* Top Floating Header Overlay (No backdrop-filter over WebGL) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-3">
          <div className="pointer-events-auto rounded-lg border border-slate-700/80 bg-[#0B1726]/92 px-3.5 py-2 text-slate-100">
            <h2 id="logo-3d-showcase-title" className="text-sm font-bold tracking-tight">
              <span className="text-emerald-400">DNS</span> Locator 3D Emblem
            </h2>
            <p className="text-[11px] text-slate-300">
              Drag to orbit · Scroll to zoom · Machined alloy &amp; optical prism
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close 3D emblem showcase"
            className="pointer-events-auto w-9 h-9 rounded-lg border border-slate-700/80 bg-[#0B1726]/92 hover:bg-slate-800 text-slate-200 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 3D WebGL Viewport */}
        <div ref={stageRef} className="w-full h-full">
          {(!webglReady || contextLost) && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 text-sm p-6 text-center">
              <img src="/favicon.svg" alt="DNS Locator emblem" className="w-16 h-16" />
              <p>
                {contextLost
                  ? 'WebGL context interrupted. Close and reopen to reinitialize the 3D showcase.'
                  : '3D WebGL preview is unavailable in this browser context.'}
              </p>
            </div>
          )}
        </div>

        {/* Compact Bottom Control Dock (solid/rgba, <=15% height) */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2">
          <div
            role="radiogroup"
            aria-label="3D emblem surface finish"
            className="pointer-events-auto inline-flex items-center p-1 rounded-lg border border-slate-700/80 bg-[#0B1726]/92 gap-1"
          >
            {(
              [
                { id: 'emerald-glass', label: 'Brushed Emerald' },
                { id: 'obsidian-chrome', label: 'Slate Alloy' },
                { id: 'wireframe-cad', label: 'CAD Wireframe' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={finish === opt.id}
                onClick={() => setFinish(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  finish === opt.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoSpin((prev) => !prev)}
              className="h-8 px-3 rounded-lg border border-slate-700/80 bg-[#0B1726]/92 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              {autoSpin ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Pause Spin</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Auto Spin</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="h-8 px-3 rounded-lg border border-slate-700/80 bg-[#0B1726]/92 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveLogo3D() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [webglReady, setWebglReady] = useState<boolean>(() => hasWebGLSupport());
  const [contextLost, setContextLost] = useState(false);

  const targetTiltRef = useRef({ rx: 0.14, ry: -0.22, hovered: false });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasWebGLSupport()) {
      setWebglReady(false);
      return;
    }

    const size = 40;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.className = 'w-full h-full block';
    container.appendChild(canvas);

    const { renderer, isSoftwareGl } = createStudioRenderer(canvas, size, size, {
      alpha: true,
      shadows: false,
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 3.85);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
    keyLight.position.set(2.8, 3.5, 4.0);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x064e3b, 0.9);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 1.3);
    rimLight.position.set(-2.5, 1.5, -2.5);
    scene.add(rimLight);

    const brushedTex = createBrushedAlloyTexture();
    const emblem = buildDnsLocatorEmblemGroup({
      brushedTex,
      isSoftwareGl,
      finish: 'emerald-glass',
    });
    scene.add(emblem.root);

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    const reduced = prefersReducedMotion();

    const triggerRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = window.requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        const target = targetTiltRef.current;
        const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-10 * dt);
        const idleY = target.hovered || reduced ? 0 : Math.sin(now * 0.0016) * 0.24;
        const goalRx = target.rx;
        const goalRy = target.ry + idleY;

        emblem.root.rotation.x += (goalRx - emblem.root.rotation.x) * alpha;
        emblem.root.rotation.y += (goalRy - emblem.root.rotation.y) * alpha;
        if (!reduced) {
          emblem.orbitRing.rotation.z += dt * (target.hovered ? 1.4 : 0.45);
        }

        renderer.render(scene, camera);

        const settled =
          Math.abs(goalRx - emblem.root.rotation.x) < 0.002 &&
          Math.abs(goalRy - emblem.root.rotation.y) < 0.002 &&
          reduced;

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || !settled)) {
            triggerRender();
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

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      targetTiltRef.current = {
        rx: -ny * 0.55,
        ry: nx * 0.72,
        hovered: true,
      };
      triggerRender();
    };

    const onPointerLeave = () => {
      targetTiltRef.current = {
        rx: 0.14,
        ry: -0.22,
        hovered: false,
      };
      triggerRender();
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      triggerRender();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    triggerRender();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeThreeHierarchy(scene);
      brushedTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowcaseOpen(true);
        }}
        title="Inspect interactive 3D DNS Locator emblem"
        aria-label="Open interactive 3D DNS Locator emblem showcase"
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/95 dark:bg-slate-800/90 border border-emerald-500/35 hover:border-emerald-400 shadow-xs inline-flex items-center justify-center shrink-0 transition-transform duration-150 hover:scale-105 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
          {(!webglReady || contextLost) && (
            <img src="/favicon.svg" alt="" width={28} height={28} className="w-7 h-7" />
          )}
        </div>
      </button>

      {showcaseOpen && <LogoShowcaseModal onClose={() => setShowcaseOpen(false)} />}
    </>
  );
}
