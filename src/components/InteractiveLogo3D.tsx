import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  buildDnsLocatorEmblemGroup,
  createBrushedAlloyTexture,
  createStudioRenderer,
  disposeThreeHierarchy,
  hasWebGLSupport,
  prefersReducedMotion,
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

export default function InteractiveLogo3D() {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    canvas.className = 'w-full h-full block pointer-events-none';
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
    <div
      aria-hidden="true"
      className="relative w-10 h-10 rounded-xl bg-slate-900/95 dark:bg-slate-800/90 border border-emerald-500/35 shadow-xs inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 hover:scale-105"
    >
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        {(!webglReady || contextLost) && (
          <img src="/favicon.svg" alt="" width={28} height={28} className="w-7 h-7" />
        )}
      </div>
    </div>
  );
}
