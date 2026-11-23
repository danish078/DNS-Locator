import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type DifficultyPreset = 'chill' | 'standard' | 'turbo';
type CrashCause = 'nxdomain' | 'timeout' | 'none';

interface AiMissionConfig {
  missionTitle: string;
  briefing: string;
  speedScale: number;
  gravityScale: number;
  timeoutRatio: number;
  orbDensity: number;
  hazardGroundLabel: string;
  hazardAirLabel: string;
  targetScore: number;
}

interface AiDebriefResult {
  rankTitle: string;
  coachingTip: string;
  dnsFact: string;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'nxdomain' | 'timeout';
  label: string;
  passed: boolean;
}

interface Orb {
  x: number;
  y: number;
  r: number;
  kind: 'cache' | 'anycast';
  collected: boolean;
  missedCheck: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface BgNode {
  x: number;
  y: number;
  r: number;
  speedFactor: number;
}

const BEST_SCORE_KEY = 'dnslocator_packet_game_best_v1';
const CANVAS_W = 880;
const CANVAS_H = 228;
const GROUND_Y = 186;
const PLAYER_X = 104;
const PLAYER_R = 13;
const MAX_PARTICLES = 90;

const DEFAULT_MISSION: AiMissionConfig = {
  missionTitle: 'Classic Global Propagation',
  briefing: 'Hop over ground NX spikes, dive under aerial TTL gates, and chain cache orbs.',
  speedScale: 1,
  gravityScale: 1,
  timeoutRatio: 0.34,
  orbDensity: 1,
  hazardGroundLabel: 'NX',
  hazardAirLabel: 'TTL',
  targetScore: 400,
};

function readBestScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // Ignore storage quota issues
  }
}

function playTone(
  ctx: AudioContext | null,
  muted: boolean,
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.055
) {
  if (muted || !ctx) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec + 0.01);
  } catch {
    // Ignore audio context autoplay errors
  }
}

interface DnsPacketGameProps {
  isSearchingDns?: boolean;
  activeDomain?: string | null;
  onClose?: () => void;
}

export default function DnsPacketGame({
  isSearchingDns = false,
  activeDomain = null,
  onClose,
}: DnsPacketGameProps) {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiPilotEnabled, setAiPilotEnabled] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyPreset>('standard');

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [dodgedCount, setDodgedCount] = useState(0);
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState('1.0');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [crashCause, setCrashCause] = useState<CrashCause>('none');

  // Gemini AI Mission & Debrief states
  const [activeMission, setActiveMission] = useState<AiMissionConfig>(DEFAULT_MISSION);
  const [isCustomMission, setIsCustomMission] = useState(false);
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [aiMissionError, setAiMissionError] = useState<string | null>(null);

  const [aiDebrief, setAiDebrief] = useState<AiDebriefResult | null>(null);
  const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);
  const [aiDebriefError, setAiDebriefError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const mutedRef = useRef<boolean>(false);
  const aiPilotRef = useRef<boolean>(false);
  const bestScoreRef = useRef<number>(bestScore);
  const missionRef = useRef<AiMissionConfig>(activeMission);

  const inputRef = useRef({
    jumpHeld: false,
    fastFallHeld: false,
    jumpBufferTimer: 0,
    coyoteTimer: 0,
  });

  const simRef = useRef({
    playerY: GROUND_Y - PLAYER_R,
    playerVy: 0,
    scaleX: 1,
    scaleY: 1,
    jumpsLeft: 2,
    onGround: true,
    distance: 0,
    bonusPoints: 0,
    combo: 1,
    maxCombo: 1,
    dodged: 0,
    orbsHit: 0,
    speed: 320,
    spawnCooldown: 0.7,
    orbCooldown: 1.0,
    nextHazardIn: 0,
    nextHazardKind: 'nxdomain' as 'nxdomain' | 'timeout',
    groundOffset: 0,
    hitstopTimer: 0,
    shakeTimer: 0,
    shakeMagnitude: 0,
    hitFlashAlpha: 0,
    pendingCrashCause: 'none' as CrashCause,
    aiTargetJumpY: null as number | null,
    aiDecisionCooldown: 0,
    obstacles: [] as Obstacle[],
    orbs: [] as Orb[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    bgNodes: Array.from({ length: 14 }, (_, idx) => ({
      x: (idx * 71) % CANVAS_W,
      y: 26 + ((idx * 37) % (GROUND_Y - 56)),
      r: 2 + (idx % 3),
      speedFactor: 0.14 + (idx % 4) * 0.04,
    })) as BgNode[],
    lastHudScore: 0,
    lastHudCombo: 1,
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    aiPilotRef.current = aiPilotEnabled;
  }, [aiPilotEnabled]);

  useEffect(() => {
    missionRef.current = activeMission;
  }, [activeMission]);

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        audioCtxRef.current = new AudioCtor();
      }
    }
    return audioCtxRef.current;
  }, []);

  const spawnBurst = useCallback(
    (x: number, y: number, count: number, color: string, speedSpread = 95) => {
      const sim = simRef.current;
      for (let i = 0; i < count; i++) {
        if (sim.particles.length >= MAX_PARTICLES) {
          sim.particles.shift();
        }
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const mag = speedSpread * (0.45 + Math.random() * 0.7);
        sim.particles.push({
          x,
          y,
          vx: Math.cos(ang) * mag,
          vy: Math.sin(ang) * mag,
          life: 0.34 + Math.random() * 0.14,
          maxLife: 0.48,
          color,
          size: 2.2 + Math.random() * 2.2,
        });
      }
    },
    []
  );

  const resetSimulation = useCallback(() => {
    const baseSpeed = 320 * missionRef.current.speedScale;
    simRef.current.playerY = GROUND_Y - PLAYER_R;
    simRef.current.playerVy = 0;
    simRef.current.scaleX = 1;
    simRef.current.scaleY = 1;
    simRef.current.jumpsLeft = 2;
    simRef.current.onGround = true;
    simRef.current.distance = 0;
    simRef.current.bonusPoints = 0;
    simRef.current.combo = 1;
    simRef.current.maxCombo = 1;
    simRef.current.dodged = 0;
    simRef.current.orbsHit = 0;
    simRef.current.speed = baseSpeed;
    simRef.current.spawnCooldown = 0.65;
    simRef.current.orbCooldown = 0.85;
    simRef.current.nextHazardIn = 0.65;
    simRef.current.nextHazardKind = 'nxdomain';
    simRef.current.hitstopTimer = 0;
    simRef.current.shakeTimer = 0;
    simRef.current.shakeMagnitude = 0;
    simRef.current.hitFlashAlpha = 0;
    simRef.current.pendingCrashCause = 'none';
    simRef.current.aiTargetJumpY = null;
    simRef.current.aiDecisionCooldown = 0;
    simRef.current.obstacles = [];
    simRef.current.orbs = [];
    simRef.current.particles = [];
    simRef.current.floatingTexts = [];
    simRef.current.lastHudScore = 0;
    simRef.current.lastHudCombo = 1;

    inputRef.current = {
      jumpHeld: false,
      fastFallHeld: false,
      jumpBufferTimer: 0,
      coyoteTimer: 0,
    };

    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setDodgedCount(0);
    setOrbsCollected(0);
    setSpeedMultiplier(missionRef.current.speedScale.toFixed(1));
    setIsNewRecord(false);
    setCrashCause('none');
    setAiDebrief(null);
    setAiDebriefError(null);
  }, []);

  const startGame = useCallback(() => {
    ensureAudio();
    resetSimulation();
    setIsCollapsed(false);
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    playTone(audioCtxRef.current, mutedRef.current, 520, 0.1, 'triangle', 0.05);
  }, [ensureAudio, resetSimulation]);

  const executeJump = useCallback(
    (isAi = false) => {
      const sim = simRef.current;
      const canGroundOrCoyote = sim.onGround || inputRef.current.coyoteTimer > 0;
      if (canGroundOrCoyote) {
        if (!isAi) ensureAudio();
        sim.playerVy = -510;
        sim.onGround = false;
        sim.jumpsLeft = 1;
        sim.scaleX = 0.8;
        sim.scaleY = 1.24;
        inputRef.current.coyoteTimer = 0;
        inputRef.current.jumpBufferTimer = 0;
        playTone(audioCtxRef.current, mutedRef.current, 490, 0.09, 'sine', 0.05);
        spawnBurst(PLAYER_X - 4, GROUND_Y - 3, 6, '#10B981', 75);
        return true;
      }
      if (sim.jumpsLeft > 0) {
        if (!isAi) ensureAudio();
        sim.playerVy = -435;
        sim.jumpsLeft -= 1;
        sim.scaleX = 0.84;
        sim.scaleY = 1.2;
        inputRef.current.jumpBufferTimer = 0;
        playTone(audioCtxRef.current, mutedRef.current, 660, 0.09, 'sine', 0.05);
        spawnBurst(PLAYER_X - 2, sim.playerY + PLAYER_R, 7, '#38BDF8', 80);
        return true;
      }
      return false;
    },
    [ensureAudio, spawnBurst]
  );

  const requestManualJump = useCallback(() => {
    if (gameStateRef.current === 'TITLE_MENU') {
      startGame();
      return;
    }
    if (gameStateRef.current !== 'PLAYING') return;
    if (aiPilotRef.current) {
      // Allow manual override by seamlessly taking over from AI Pilot
      aiPilotRef.current = false;
      setAiPilotEnabled(false);
    }
    inputRef.current.jumpBufferTimer = 0.12;
    executeJump(false);
  }, [executeJump, startGame]);

  // Gemini AI Feature 1: Custom DNS Mission Generator
  const handleGenerateAiMission = async (preset: DifficultyPreset) => {
    setDifficulty(preset);
    setIsGeneratingMission(true);
    setAiMissionError(null);
    try {
      const res = await fetch('/api/game/ai-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: activeDomain ?? undefined,
          difficulty: preset,
          previousScore: bestScore,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiMissionError(json.error || `Unable to generate AI mission (HTTP ${res.status}).`);
        return;
      }
      setActiveMission(json.mission as AiMissionConfig);
      setIsCustomMission(true);
      setSpeedMultiplier((json.mission as AiMissionConfig).speedScale.toFixed(1));
    } catch {
      setAiMissionError('Network error while contacting Gemini AI mission director.');
    } finally {
      setIsGeneratingMission(false);
    }
  };

  // Gemini AI Feature 2: Personalized Run Debrief Coach
  const handleRequestAiDebrief = async () => {
    setIsGeneratingDebrief(true);
    setAiDebriefError(null);
    try {
      const res = await fetch('/api/game/ai-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          bestScore,
          dodgedCount,
          orbsCollected,
          maxCombo,
          crashCause,
          speedMultiplier: Number(speedMultiplier) || 1,
          activeDomain: activeDomain ?? undefined,
          missionTitle: activeMission.missionTitle,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiDebriefError(json.error || `Unable to generate AI debrief (HTTP ${res.status}).`);
        return;
      }
      setAiDebrief(json.debrief as AiDebriefResult);
    } catch {
      setAiDebriefError('Network error while requesting Gemini AI run debrief.');
    } finally {
      setIsGeneratingDebrief(false);
    }
  };

  // Separate held vs edge-triggered keyboard controls + window blur cleanup
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return Boolean(
        el &&
          (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT' ||
            el.isContentEditable)
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (gameStateRef.current === 'PLAYING') {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          if (!e.repeat) {
            inputRef.current.jumpHeld = true;
            requestManualJump();
          }
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          inputRef.current.fastFallHeld = true;
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          gameStateRef.current = 'PAUSED';
          setGameState('PAUSED');
        }
      } else if (gameStateRef.current === 'PAUSED') {
        if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          gameStateRef.current = 'PLAYING';
          setGameState('PLAYING');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.jumpHeld = false;
        // Variable jump height cut if released early while ascending
        if (simRef.current.playerVy < -180 && !aiPilotRef.current) {
          simRef.current.playerVy *= 0.62;
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        inputRef.current.fastFallHeld = false;
      }
    };

    const onWindowBlur = () => {
      inputRef.current.jumpHeld = false;
      inputRef.current.fastFallHeld = false;
      if (gameStateRef.current === 'PLAYING' && !aiPilotRef.current) {
        gameStateRef.current = 'PAUSED';
        setGameState('PAUSED');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [requestManualJump]);

  // Isolated 60fps Canvas Loop
  useEffect(() => {
    if (isCollapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      lastTime = now;

      const isDark = document.documentElement.classList.contains('dark');
      const sim = simRef.current;
      const mission = missionRef.current;

      // Ambient network node drift (active on Title Screen and Playing)
      if (gameStateRef.current === 'TITLE_MENU' || gameStateRef.current === 'PLAYING') {
        const bgSpeed = gameStateRef.current === 'PLAYING' ? sim.speed : 75;
        for (const node of sim.bgNodes) {
          node.x -= bgSpeed * node.speedFactor * dt;
          if (node.x < -20) node.x = CANVAS_W + 20;
        }
      }

      if (gameStateRef.current === 'PLAYING') {
        // Hitstop freeze frame on heavy collision
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer -= dt;
          sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
          sim.hitFlashAlpha = Math.max(0, sim.hitFlashAlpha - dt * 4);
          if (sim.hitstopTimer <= 0) {
            const finalScore = Math.floor(sim.distance + sim.bonusPoints);
            setScore(finalScore);
            setDodgedCount(sim.dodged);
            setOrbsCollected(sim.orbsHit);
            setMaxCombo(sim.maxCombo);
            setCrashCause(sim.pendingCrashCause);
            if (finalScore > bestScoreRef.current) {
              bestScoreRef.current = finalScore;
              setBestScore(finalScore);
              setIsNewRecord(true);
              saveBestScore(finalScore);
            }
            gameStateRef.current = 'GAME_OVER';
            setGameState('GAME_OVER');
          }
        } else {
          // Smooth speed & difficulty progression
          const maxCap = 660 * mission.speedScale;
          sim.speed = Math.min(maxCap, sim.speed + dt * 10 * mission.speedScale);
          sim.distance += sim.speed * dt * 0.045;
          sim.groundOffset = (sim.groundOffset + sim.speed * dt) % 44;

          // Coyote + jump buffer timers
          if (sim.onGround) {
            inputRef.current.coyoteTimer = 0.09;
          } else {
            inputRef.current.coyoteTimer = Math.max(0, inputRef.current.coyoteTimer - dt);
          }
          if (inputRef.current.jumpBufferTimer > 0) {
            inputRef.current.jumpBufferTimer -= dt;
            executeJump(false);
          }

          // AI Auto-Pilot Predictive Trajectory Solver
          if (aiPilotRef.current) {
            sim.aiDecisionCooldown = Math.max(0, sim.aiDecisionCooldown - dt);
            const lookAhead = Math.max(115, sim.speed * 0.34);
            const upcomingObs = sim.obstacles
              .filter((o) => o.x + o.w >= PLAYER_X - 8 && o.x <= PLAYER_X + lookAhead)
              .sort((a, b) => a.x - b.x)[0];

            inputRef.current.fastFallHeld = false;
            if (upcomingObs) {
              if (upcomingObs.kind === 'nxdomain') {
                // Ground barrier: jump when within reaction window
                const dist = upcomingObs.x - PLAYER_X;
                if (dist < Math.max(85, sim.speed * 0.25) && sim.aiDecisionCooldown <= 0) {
                  if (sim.onGround || (sim.playerY > upcomingObs.y - 12 && sim.jumpsLeft > 0)) {
                    executeJump(true);
                    sim.aiDecisionCooldown = 0.16;
                  }
                }
              } else {
                // Aerial barrier: fast-fall if above or stay low underneath
                if (sim.playerY < upcomingObs.y + upcomingObs.h + 8 && !sim.onGround) {
                  inputRef.current.fastFallHeld = true;
                }
              }
            } else if (sim.onGround && sim.aiDecisionCooldown <= 0) {
              // Opportunistically hop for nearby high cache orbs when clear
              const nearbyOrb = sim.orbs.find(
                (orb) =>
                  !orb.collected &&
                  orb.x > PLAYER_X + 20 &&
                  orb.x < PLAYER_X + 105 &&
                  orb.y < GROUND_Y - 45
              );
              if (nearbyOrb) {
                executeJump(true);
                sim.aiDecisionCooldown = 0.28;
              }
            }
          }

          // Physics integration with fast-fall
          const baseGravity = 1600 * mission.gravityScale;
          const gravity = inputRef.current.fastFallHeld && !sim.onGround ? baseGravity * 2.15 : baseGravity;
          sim.playerVy += gravity * dt;
          sim.playerY += sim.playerVy * dt;

          // Squash & stretch recovery
          sim.scaleX += (1 - sim.scaleX) * Math.min(1, dt * 14);
          sim.scaleY += (1 - sim.scaleY) * Math.min(1, dt * 14);

          if (sim.playerY >= GROUND_Y - PLAYER_R) {
            if (!sim.onGround) {
              // Landing squash + dust burst
              sim.scaleX = 1.24;
              sim.scaleY = 0.78;
              spawnBurst(PLAYER_X, GROUND_Y - 2, 5, isDark ? '#38BDF8' : '#0284C7', 60);
            }
            sim.playerY = GROUND_Y - PLAYER_R;
            sim.playerVy = 0;
            sim.onGround = true;
            sim.jumpsLeft = 2;
          } else {
            sim.onGround = false;
          }

          // Trailing packet particles
          if (Math.random() < 0.45 && sim.particles.length < MAX_PARTICLES) {
            sim.particles.push({
              x: PLAYER_X - PLAYER_R,
              y: sim.playerY + (Math.random() - 0.5) * 8,
              vx: -sim.speed * 0.45,
              vy: (Math.random() - 0.5) * 16,
              life: 0.25,
              maxLife: 0.25,
              color: aiPilotRef.current ? '#38BDF8' : isDark ? '#34D399' : '#10B981',
              size: 2.1,
            });
          }

          // Obstacle spawning with 260ms telegraph windup
          sim.spawnCooldown -= dt;
          sim.nextHazardIn = Math.max(0, sim.spawnCooldown);
          if (sim.spawnCooldown <= 0) {
            const kind = sim.nextHazardKind;
            if (kind === 'timeout') {
              const w = 36 + Math.random() * 14;
              const h = 24;
              sim.obstacles.push({
                x: CANVAS_W + 24,
                y: GROUND_Y - 58 - Math.random() * 24,
                w,
                h,
                kind: 'timeout',
                label: mission.hazardAirLabel,
                passed: false,
              });
            } else {
              const w = 22 + Math.random() * 14;
              const h = 28 + Math.random() * 18;
              sim.obstacles.push({
                x: CANVAS_W + 24,
                y: GROUND_Y - h,
                w,
                h,
                kind: 'nxdomain',
                label: mission.hazardGroundLabel,
                passed: false,
              });
            }
            const minGap = Math.max(0.65, 1.32 - (sim.speed - 320) / 560);
            sim.spawnCooldown = minGap + Math.random() * 0.62;
            sim.nextHazardKind =
              Math.random() < mission.timeoutRatio && sim.distance > 20 ? 'timeout' : 'nxdomain';
          }

          // Collectible Cache / Anycast orb spawning
          sim.orbCooldown -= dt;
          if (sim.orbCooldown <= 0) {
            const isAnycast = Math.random() < 0.24;
            sim.orbs.push({
              x: CANVAS_W + 28,
              y: GROUND_Y - 38 - Math.random() * 76,
              r: isAnycast ? 9 : 7.5,
              kind: isAnycast ? 'anycast' : 'cache',
              collected: false,
              missedCheck: false,
            });
            sim.orbCooldown = (1.1 + Math.random() * 1.0) / mission.orbDensity;
          }

          // Update obstacles & collision detection
          for (const obs of sim.obstacles) {
            obs.x -= sim.speed * dt;
            if (!obs.passed && obs.x + obs.w < PLAYER_X - PLAYER_R) {
              obs.passed = true;
              sim.dodged += 1;
            }
            const closestX = Math.max(obs.x + 2, Math.min(PLAYER_X, obs.x + obs.w - 2));
            const closestY = Math.max(obs.y + 2, Math.min(sim.playerY, obs.y + obs.h - 2));
            const dx = PLAYER_X - closestX;
            const dy = sim.playerY - closestY;
            if (dx * dx + dy * dy < (PLAYER_R - 2.5) * (PLAYER_R - 2.5)) {
              sim.pendingCrashCause = obs.kind;
              sim.hitstopTimer = 0.065;
              sim.shakeTimer = 0.24;
              sim.shakeMagnitude = 6.5;
              sim.hitFlashAlpha = 0.42;
              playTone(audioCtxRef.current, mutedRef.current, 165, 0.26, 'sawtooth', 0.07);
              spawnBurst(PLAYER_X, sim.playerY, 18, '#EF4444', 165);
              break;
            }
          }
          sim.obstacles = sim.obstacles.filter((o) => o.x + o.w > -40);

          // Update orbs, combos & collection
          for (const orb of sim.orbs) {
            orb.x -= sim.speed * dt;
            if (!orb.collected && !orb.missedCheck && orb.x + orb.r < PLAYER_X - PLAYER_R - 14) {
              orb.missedCheck = true;
              if (sim.combo > 1) {
                sim.combo = 1;
              }
            }
            if (!orb.collected) {
              const dx = PLAYER_X - orb.x;
              const dy = sim.playerY - orb.y;
              const reach = PLAYER_R + orb.r + 4;
              if (dx * dx + dy * dy <= reach * reach) {
                orb.collected = true;
                sim.orbsHit += 1;
                const basePts = orb.kind === 'anycast' ? 40 : 20;
                const gained = basePts * sim.combo;
                sim.bonusPoints += gained;
                sim.combo = Math.min(4, sim.combo + 1);
                sim.maxCombo = Math.max(sim.maxCombo, sim.combo);

                const pitch = (orb.kind === 'anycast' ? 780 : 620) + sim.combo * 75;
                playTone(audioCtxRef.current, mutedRef.current, pitch, 0.12, 'sine', 0.055);
                sim.floatingTexts.push({
                  x: orb.x,
                  y: orb.y - 8,
                  text: sim.combo > 1 ? `+${gained} (${sim.combo}x)` : `+${gained}`,
                  color: orb.kind === 'anycast' ? '#F59E0B' : '#10B981',
                  life: 0.75,
                });
                spawnBurst(
                  orb.x,
                  orb.y,
                  10,
                  orb.kind === 'anycast' ? '#FBBF24' : '#34D399',
                  115
                );
              }
            }
          }
          sim.orbs = sim.orbs.filter((o) => !o.collected && o.x + o.r > -20);

          // Update particles & floating texts
          for (const p of sim.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
          }
          sim.particles = sim.particles.filter((p) => p.life > 0);

          for (const ft of sim.floatingTexts) {
            ft.y -= 34 * dt;
            ft.life -= dt;
          }
          sim.floatingTexts = sim.floatingTexts.filter((ft) => ft.life > 0);

          const totalScore = Math.floor(sim.distance + sim.bonusPoints);
          if (totalScore !== sim.lastHudScore) {
            sim.lastHudScore = totalScore;
            setScore(totalScore);
            setDodgedCount(sim.dodged);
            setOrbsCollected(sim.orbsHit);
            setSpeedMultiplier((sim.speed / 320).toFixed(1));
          }
          if (sim.combo !== sim.lastHudCombo) {
            sim.lastHudCombo = sim.combo;
            setCombo(sim.combo);
            setMaxCombo(sim.maxCombo);
          }
        }
      } else if (gameStateRef.current === 'TITLE_MENU') {
        sim.groundOffset = (sim.groundOffset + 85 * dt) % 44;
        sim.playerY = GROUND_Y - PLAYER_R - Math.abs(Math.sin(now * 0.003)) * 9;
      } else if (gameStateRef.current === 'GAME_OVER') {
        sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
        sim.hitFlashAlpha = Math.max(0, sim.hitFlashAlpha - dt * 3);
        for (const p of sim.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        sim.particles = sim.particles.filter((p) => p.life > 0);
      }

      // Render Frame
      ctx.save();
      if (sim.shakeTimer > 0) {
        const intensity = sim.shakeMagnitude * (sim.shakeTimer / 0.24);
        ctx.translate(
          (Math.random() - 0.5) * intensity * 2,
          (Math.random() - 0.5) * intensity * 2
        );
      }

      ctx.clearRect(-20, -20, CANVAS_W + 40, CANVAS_H + 40);
      ctx.fillStyle = isDark ? '#020617' : '#F8FAFC';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Atmospheric network routing mesh in background
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < sim.bgNodes.length; i++) {
        const a = sim.bgNodes[i];
        const b = sim.bgNodes[(i + 1) % sim.bgNodes.length];
        if (Math.abs(a.x - b.x) < 190) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.18)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle vertical gridlines
      ctx.strokeStyle = isDark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(226, 232, 240, 0.75)';
      ctx.lineWidth = 1;
      for (let x = -sim.groundOffset; x < CANVAS_W; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GROUND_Y);
        ctx.stroke();
      }

      // Ground track
      ctx.fillStyle = isDark ? '#0F172A' : '#E2E8F0';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.strokeStyle = isDark ? '#0EA5E9' : '#0284C7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#334155' : '#94A3B8';
      for (let x = -sim.groundOffset; x < CANVAS_W; x += 44) {
        ctx.fillRect(x, GROUND_Y + 10, 14, 3);
      }

      // AI Pilot Predictive Trajectory Arc
      if (aiPilotRef.current && gameStateRef.current === 'PLAYING') {
        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(2, 132, 199, 0.42)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(PLAYER_X, sim.playerY);
        let simPy = sim.playerY;
        let simVy = sim.playerVy;
        const g = 1600 * mission.gravityScale;
        for (let stepIdx = 1; stepIdx <= 12; stepIdx++) {
          const tStep = 0.028;
          simVy += g * tStep;
          simPy = Math.min(GROUND_Y - PLAYER_R, simPy + simVy * tStep);
          ctx.lineTo(PLAYER_X + stepIdx * (sim.speed * tStep), simPy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Windup Telegraph on right edge 260ms before obstacle enters
      if (gameStateRef.current === 'PLAYING' && sim.nextHazardIn > 0 && sim.nextHazardIn < 0.26) {
        ctx.save();
        const isAir = sim.nextHazardKind === 'timeout';
        const warnY = isAir ? GROUND_Y - 68 : GROUND_Y - 22;
        const pulse = 0.55 + Math.sin(now * 0.04) * 0.35;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = isAir ? '#F59E0B' : '#EF4444';
        ctx.beginPath();
        ctx.moveTo(CANVAS_W - 14, warnY);
        ctx.lineTo(CANVAS_W - 5, warnY - 6);
        ctx.lineTo(CANVAS_W - 5, warnY + 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Collectibles
      for (const orb of sim.orbs) {
        ctx.save();
        const isAnycast = orb.kind === 'anycast';
        ctx.fillStyle = isAnycast
          ? 'rgba(245, 158, 11, 0.22)'
          : 'rgba(16, 185, 129, 0.22)';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isAnycast ? '#F59E0B' : '#10B981';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isAnycast ? '★' : '+', orb.x, orb.y + 0.5);
        ctx.restore();
      }

      // Obstacles
      for (const obs of sim.obstacles) {
        ctx.save();
        const isTimeout = obs.kind === 'timeout';
        ctx.fillStyle = isTimeout
          ? isDark
            ? '#F59E0B'
            : '#D97706'
          : isDark
            ? '#EF4444'
            : '#DC2626';
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 5);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2);
        ctx.restore();
      }

      // Particles
      for (const p of sim.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Player DNS Packet with Squash & Stretch
      ctx.save();
      ctx.translate(PLAYER_X, sim.playerY);
      ctx.scale(sim.scaleX, sim.scaleY);

      ctx.fillStyle = aiPilotRef.current
        ? 'rgba(56, 189, 248, 0.25)'
        : 'rgba(16, 185, 129, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R + 6, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createLinearGradient(-PLAYER_R, -PLAYER_R, PLAYER_R, PLAYER_R);
      if (aiPilotRef.current) {
        grad.addColorStop(0, isDark ? '#38BDF8' : '#0284C7');
        grad.addColorStop(1, isDark ? '#34D399' : '#0D9488');
      } else {
        grad.addColorStop(0, isDark ? '#34D399' : '#047857');
        grad.addColorStop(1, isDark ? '#2DD4BF' : '#0D9488');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDark ? '#0F172A' : '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#020617' : '#FFFFFF';
      ctx.font = 'bold 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(aiPilotRef.current ? 'AI' : 'DNS', 0, 0.5);
      ctx.restore();

      // Floating Score Texts
      for (const ft of sim.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / 0.75);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Hit Flash Overlay
      if (sim.hitFlashAlpha > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${sim.hitFlashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [isCollapsed, executeJump, spawnBurst]);

  const missionProgressPct = Math.min(
    100,
    Math.round((score / Math.max(100, activeMission.targetScore)) * 100)
  );

  return (
    <section
      id="dns-packet-game-bar"
      aria-labelledby="dns-game-heading"
      className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Perimeter Control & Telemetry Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Gamepad2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span id="dns-game-heading">DNS Packet Runner</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]">
            {isCustomMission ? activeMission.missionTitle : isSearchingDns ? 'Resolving DNS across 18 regions' : activeMission.missionTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs tabular-nums">
          <span className="font-mono text-slate-600 dark:text-slate-300">
            Score: <strong className="text-slate-900 dark:text-slate-100">{score}</strong>
          </span>
          {combo > 1 && (
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {combo}x
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400">
            <Trophy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Best: <strong>{bestScore}</strong></span>
          </span>
          {gameState === 'PLAYING' && (
            <span className="hidden sm:inline font-mono text-sky-700 dark:text-sky-400">
              {speedMultiplier}x
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {/* Onboard AI Auto-Pilot Co-Pilot Toggle */}
            <button
              type="button"
              onClick={() => setAiPilotEnabled((prev) => !prev)}
              aria-pressed={aiPilotEnabled}
              title="Toggle AI Auto-Pilot trajectory solver"
              className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                aiPilotEnabled
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>AI Pilot {aiPilotEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {gameState === 'PLAYING' && (
              <button
                type="button"
                onClick={() => {
                  gameStateRef.current = 'PAUSED';
                  setGameState('PAUSED');
                }}
                aria-label="Pause game"
                className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              >
                <Pause className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              aria-label={isMuted ? 'Unmute game sound' : 'Mute game sound'}
              title={isMuted ? 'Unmute sound' : 'Mute sound'}
              className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onClose) {
                  if (gameStateRef.current === 'PLAYING') {
                    gameStateRef.current = 'PAUSED';
                    setGameState('PAUSED');
                  }
                  onClose();
                  return;
                }
                if (!isCollapsed && gameStateRef.current === 'PLAYING') {
                  gameStateRef.current = 'PAUSED';
                  setGameState('PAUSED');
                }
                setIsCollapsed((prev) => !prev);
              }}
              aria-expanded={onClose ? true : !isCollapsed}
              className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
            >
              <span>{onClose ? 'Hide' : isCollapsed ? 'Play' : 'Hide'}</span>
              {!onClose && isCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Arena */}
      {!isCollapsed && (
        <div className="relative w-full select-none">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={(e) => {
              e.preventDefault();
              requestManualJump();
            }}
            className="w-full h-[196px] sm:h-[228px] block cursor-pointer touch-manipulation"
            aria-label="DNS Packet Runner game canvas. Click, tap, or press Space to jump."
          />

          {/* Low-Occlusion Perimeter Overlay During Active Play (pointer-events: none, no backdrop-filter) */}
          {gameState === 'PLAYING' && (
            <div className="pointer-events-none absolute inset-x-3 top-2.5 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200">
                Goal: {score}/{activeMission.targetScore} ({missionProgressPct}%)
              </span>
              <span className="px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hidden sm:inline">
                Space/Tap Jump · ↓/S Fast-Fall · P Pause
              </span>
            </div>
          )}

          {/* Title Screen Overlay with Bespoke Inline SVG Lockup & Gemini AI Mission Director */}
          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 flex items-center justify-between gap-4 px-4 sm:px-7 py-3 pointer-events-none">
              <div className="pointer-events-auto max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-5 py-3.5 shadow-md space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <svg
                    viewBox="0 0 260 28"
                    className="h-6 w-auto shrink-0"
                    role="img"
                    aria-label="DNS Packet Runner"
                  >
                    <defs>
                      <linearGradient id="title-lockup-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="3" width="22" height="22" rx="6" fill="url(#title-lockup-grad)" />
                    <path d="M7 10L16 14L7 18V10Z" fill="#FFFFFF" />
                    <text
                      x="30"
                      y="19"
                      fill="currentColor"
                      className="text-slate-900 dark:text-slate-100"
                      fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                      fontSize="16"
                      fontWeight="800"
                      letterSpacing="-0.02em"
                    >
                      DNS PACKET RUNNER
                    </text>
                  </svg>

                  {isCustomMission && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Gemini AI Mission</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeMission.briefing}
                </p>

                {aiMissionError && (
                  <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-400">
                    {aiMissionError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['chill', 'standard', 'turbo'] as DifficultyPreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={isGeneratingMission}
                        onClick={() => handleGenerateAiMission(preset)}
                        className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold capitalize inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                          isCustomMission && difficulty === preset
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>{isGeneratingMission && difficulty === preset ? 'Generating…' : `AI ${preset}`}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={startGame}
                    className="h-8 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Start Game</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  Space / ↑ / Tap Jump (x2) · ↓ / S Fast-Fall · P Pause
                </div>
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-lg flex items-center gap-4">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Game Paused
                </span>
                <button
                  type="button"
                  onClick={() => {
                    gameStateRef.current = 'PLAYING';
                    setGameState('PLAYING');
                  }}
                  className="h-8 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Resume</span>
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay + Gemini AI Debrief Coach */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 flex items-center justify-center p-3">
              <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-5 py-3.5 shadow-lg space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Packet Dropped! {isNewRecord ? 'New High Score!' : ''}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums font-mono">
                      Score: <strong>{score}</strong> · Dodged: <strong>{dodgedCount}</strong> · Max Combo:{' '}
                      <strong>{maxCombo}x</strong> · Best: <strong>{bestScore}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isGeneratingDebrief}
                      onClick={handleRequestAiDebrief}
                      className="h-8 px-3 rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 text-sky-800 dark:text-sky-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isGeneratingDebrief ? 'Analyzing…' : 'AI Coach Debrief'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={startGame}
                      className="h-8 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Play Again</span>
                    </button>
                  </div>
                </div>

                {aiDebriefError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 text-[11px] text-rose-800 dark:text-rose-200"
                  >
                    {aiDebriefError}
                  </div>
                )}

                {aiDebrief && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3.5 py-2 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        Rank: {aiDebrief.rankTitle}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {aiDebrief.coachingTip}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      DNS Tip: {aiDebrief.dnsFact}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
