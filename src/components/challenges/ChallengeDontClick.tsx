import React, { useEffect, useRef, useState } from 'react';
import { LevelConfig } from '../../types';
import { audio } from '../../utils/audio';
import { motion } from 'motion/react';
import { Zap, AlertTriangle } from 'lucide-react';

interface ChallengeDontClickProps {
  config: LevelConfig['config'];
  onSuccess: (bonusRatio: number) => void;
  onFail: () => void;
}

interface MovingButton {
  id: number;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeClass: string;
}

export default function ChallengeDontClick({ config, onSuccess, onFail }: ChallengeDontClickProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [buttons, setButtons] = useState<MovingButton[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const buttonCount = config.buttonCount || 3;
  const fakeButtonCount = config.fakeButtonCount || 0;
  const isMoving = !!config.moving;
  const isShuffling = !!config.shuffling;
  const shuffleInterval = config.shufflingInterval || 1500;

  // Determine button size tailwind classes
  let sizeClass = 'px-6 py-3 text-base';
  if (config.buttonSize === 'sm') sizeClass = 'px-3 py-1.5 text-xs';
  else if (config.buttonSize === 'md') sizeClass = 'px-5 py-2.5 text-sm';

  // Initialize buttons
  useEffect(() => {
    const initializedButtons: MovingButton[] = [];
    const width = 500; // Virtual width
    const height = 300; // Virtual height

    // 1 Correct Button
    initializedButtons.push({
      id: 0,
      text: 'CLICK ME!',
      isCorrect: true,
      x: 100 + Math.random() * 300,
      y: 60 + Math.random() * 180,
      vx: (Math.random() - 0.5) * (isMoving ? 3.2 : 0) * (config.speedMultiplier ?? 1),
      vy: (Math.random() - 0.5) * (isMoving ? 3.2 : 0) * (config.speedMultiplier ?? 1),
      sizeClass,
    });

    // Wrong buttons (regular distractors)
    const totalDistractors = buttonCount - 1;
    for (let i = 0; i < totalDistractors; i++) {
      const isFake = i < fakeButtonCount;
      const text = isFake ? 'CLICK HERE!' : 'DON\'T CLICK';
      
      initializedButtons.push({
        id: i + 1,
        text,
        isCorrect: false,
        x: 100 + Math.random() * 300,
        y: 60 + Math.random() * 180,
        vx: (Math.random() - 0.5) * (isMoving ? 3.2 : 0) * (config.speedMultiplier ?? 1),
        vy: (Math.random() - 0.5) * (isMoving ? 3.2 : 0) * (config.speedMultiplier ?? 1),
        sizeClass,
      });
    }

    setButtons(initializedButtons);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [buttonCount, fakeButtonCount, isMoving, sizeClass, config]);

  // Handle bouncing physics
  useEffect(() => {
    if (!isMoving) return;

    let lastTime = performance.now();

    const updatePhysics = (time: number) => {
      const container = containerRef.current;
      if (!container) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const rect = container.getBoundingClientRect();
      const boundW = rect.width;
      const boundH = rect.height;

      setButtons((prevButtons) =>
        prevButtons.map((btn) => {
          let nx = btn.x + btn.vx;
          let ny = btn.y + btn.vy;
          let nvx = btn.vx;
          let nvy = btn.vy;

          // Approx button dimensions
          const btnW = btn.sizeClass.includes('text-xs') ? 80 : btn.sizeClass.includes('text-sm') ? 110 : 140;
          const btnH = btn.sizeClass.includes('text-xs') ? 35 : btn.sizeClass.includes('text-sm') ? 45 : 55;

          // Bounce off walls
          if (nx < 0) {
            nx = 0;
            nvx = Math.abs(btn.vx);
          } else if (nx + btnW > boundW) {
            nx = boundW - btnW;
            nvx = -Math.abs(btn.vx);
          }

          if (ny < 0) {
            ny = 0;
            nvy = Math.abs(btn.vy);
          } else if (ny + btnH > boundH) {
            ny = boundH - btnH;
            nvy = -Math.abs(btn.vy);
          }

          return {
            ...btn,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMoving, buttons.length]);

  // Handle shuffling positions randomly
  useEffect(() => {
    if (!isShuffling) return;

    const interval = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const boundW = rect.width - 150;
      const boundH = rect.height - 60;

       setButtons((prevButtons) =>
        prevButtons.map((btn) => ({
          ...btn,
          x: Math.max(10, Math.random() * boundW),
          y: Math.max(10, Math.random() * boundH),
          // Give new speed vectors as well on shuffle
          vx: (Math.random() - 0.5) * (isMoving ? 3.6 : 0) * (config.speedMultiplier ?? 1),
          vy: (Math.random() - 0.5) * (isMoving ? 3.6 : 0) * (config.speedMultiplier ?? 1),
        }))
      );
    }, shuffleInterval);

    return () => clearInterval(interval);
  }, [isShuffling, isMoving, shuffleInterval]);

  const handleButtonClick = (btn: MovingButton, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering container click (which is an automatic fail)

    if (btn.isCorrect) {
      audio.playSuccess();
      onSuccess(1.0); // Perfect clicks are handled by the main game loop timer ratios
    } else {
      audio.playFailure();
      onFail();
    }
  };

  const handleContainerClick = () => {
    // Clicking the background is an automatic failure
    audio.playFailure();
    onFail();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
        <Zap className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
        <span>Target: click the green button</span>
        {isMoving && <span className="text-cyan-400">| Kinetic Mode</span>}
        {isShuffling && <span className="text-amber-400">| Shuffle Active</span>}
      </div>

      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative w-full h-[360px] bg-zinc-950/90 rounded-2xl border-2 border-zinc-800/80 shadow-[0_0_25px_rgba(0,0,0,0.8)] overflow-hidden cursor-crosshair"
      >
        {/* Animated grid lines for arcade style */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.25)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {buttons.map((btn) => (
          <button
            key={btn.id}
            id={`btn-dontclick-${btn.id}`}
            onClick={(e) => handleButtonClick(btn, e)}
            style={{
              position: 'absolute',
              left: `${btn.x}px`,
              top: `${btn.y}px`,
              transition: isMoving ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
            className={`
              font-bold rounded-lg border-2 select-none active:scale-95 duration-75
              ${
                btn.isCorrect
                  ? 'bg-zinc-900/90 text-green-400 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-950/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                  : 'bg-zinc-900/90 text-zinc-500 border-zinc-800 hover:border-red-500 hover:text-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
              }
              ${btn.sizeClass}
            `}
          >
            <span className="flex items-center gap-1.5">
              {!btn.isCorrect && btn.text === 'CLICK HERE!' && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              {btn.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
