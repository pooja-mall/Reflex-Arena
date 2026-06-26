import React, { useEffect, useRef, useState } from 'react';
import { LevelConfig } from '../../types';
import { audio } from '../../utils/audio';
import { motion } from 'motion/react';
import { HelpCircle, Star, Circle, Square, Triangle } from 'lucide-react';

interface ChallengeQuickReactionProps {
  config: LevelConfig['config'];
  onSuccess: (bonusRatio: number) => void;
  onFail: () => void;
}

interface ReactionObject {
  id: number;
  type: 'shape' | 'emoji';
  shape?: 'circle' | 'square' | 'triangle' | 'star';
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  colorHex?: string;
  size?: 'small' | 'medium' | 'large';
  sizePx?: number;
  emoji?: string;
  isMoving?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
}

const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
const COLORS = [
  { name: 'red', hex: '#ef4444' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'purple', hex: '#a855f7' }
] as const;
const SIZES = [
  { name: 'small', px: 28 },
  { name: 'medium', px: 48 },
  { name: 'large', px: 75 }
] as const;

export default function ChallengeQuickReaction({ config, onSuccess, onFail }: ChallengeQuickReactionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [objects, setObjects] = useState<ReactionObject[]>([]);
  const [instruction, setInstruction] = useState<string>('');
  const animationFrameRef = useRef<number | null>(null);

  const objectCount = config.objectCount || 4;
  const speedSetting = config.speed || 'slow';
  const instructionType = config.instructionType || 'color';

  // Initialize objects and instructions
  useEffect(() => {
    const initializedObjects: ReactionObject[] = [];
    let promptText = '';

    // Decide whether to run shape challenge or odd emoji challenge
    if (instructionType === 'odd') {
      // 1 Odd Emoji vs many Identical Emojis
      const emojiPairs = [
        { normal: '🍎', odd: '🍏' },
        { normal: '🐶', odd: '🐱' },
        { normal: '⚽', odd: '🏀' },
        { normal: '🍔', odd: '🍟' },
        { normal: '🚀', odd: '🛸' },
        { normal: '🔥', odd: '💧' },
        { normal: '⭐️', odd: '🌟' }
      ];
      const selectedPair = emojiPairs[Math.floor(Math.random() * emojiPairs.length)];
      promptText = `Click the odd emoji: ${selectedPair.odd}`;

      // Spawn target
      initializedObjects.push({
        id: 0,
        type: 'emoji',
        emoji: selectedPair.odd,
        sizePx: 48,
        x: 50 + Math.random() * 380,
        y: 50 + Math.random() * 200,
        vx: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
        vy: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
        isTarget: true,
        isMoving: speedSetting !== 'slow'
      });

      // Spawn distractors
      for (let i = 1; i < objectCount; i++) {
        initializedObjects.push({
          id: i,
          type: 'emoji',
          emoji: selectedPair.normal,
          sizePx: 48,
          x: 50 + Math.random() * 380,
          y: 50 + Math.random() * 200,
          vx: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
          vy: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
          isTarget: false,
          isMoving: speedSetting !== 'slow'
        });
      }
    } 
    
    else if (instructionType === 'size') {
      // Smallest vs largest
      const targetSize = Math.random() > 0.5 ? 'small' : 'large';
      promptText = `Click the ${targetSize.toUpperCase()} object`;

      // Generate random shapes but with distinct sizes
      const shapesPool = [...SHAPES];
      const colorsPool = [...COLORS];

      for (let i = 0; i < objectCount; i++) {
        const shape = shapesPool[i % shapesPool.length];
        const color = colorsPool[i % colorsPool.length];
        
        let sizeName: 'small' | 'medium' | 'large' = 'medium';
        if (targetSize === 'small') {
          sizeName = i === 0 ? 'small' : (Math.random() > 0.5 ? 'medium' : 'large');
        } else {
          sizeName = i === 0 ? 'large' : (Math.random() > 0.5 ? 'small' : 'medium');
        }

        const sizePx = SIZES.find(s => s.name === sizeName)!.px;

        initializedObjects.push({
          id: i,
          type: 'shape',
          shape,
          color: color.name,
          colorHex: color.hex,
          size: sizeName,
          sizePx,
          x: 50 + Math.random() * 350,
          y: 50 + Math.random() * 180,
          vx: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
          vy: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 2.8 * (config.speedMultiplier ?? 1),
          isTarget: i === 0,
          isMoving: speedSetting !== 'slow'
        });
      }
    } 
    
    else if (instructionType === 'movement') {
      // 1 moving object vs stationary objects
      promptText = 'Click the MOVING object!';

      for (let i = 0; i < objectCount; i++) {
        const shape = SHAPES[i % SHAPES.length];
        const color = COLORS[i % COLORS.length];
        const size = SIZES[1]; // medium

        const moving = i === 0;
        const speedMultiplier = (speedSetting === 'fast' ? 2.5 : 1.5) * (config.speedMultiplier ?? 1);

        initializedObjects.push({
          id: i,
          type: 'shape',
          shape,
          color: color.name,
          colorHex: color.hex,
          size: 'medium',
          sizePx: size.px,
          x: 50 + Math.random() * 350,
          y: 50 + Math.random() * 180,
          vx: moving ? (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * speedMultiplier) : 0,
          vy: moving ? (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * speedMultiplier) : 0,
          isTarget: moving,
          isMoving: moving
        });
      }
    } 
    
    else {
      // Normal: Color or Shape (e.g. "Click the red circle" or "Click the yellow triangle")
      const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      promptText = `Click the ${targetColor.name.toUpperCase()} ${targetShape.toUpperCase()}`;

      // Target object
      initializedObjects.push({
        id: 0,
        type: 'shape',
        shape: targetShape,
        color: targetColor.name,
        colorHex: targetColor.hex,
        size: 'medium',
        sizePx: SIZES[1].px,
        x: 50 + Math.random() * 350,
        y: 50 + Math.random() * 180,
        vx: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 3.2 * (config.speedMultiplier ?? 1),
        vy: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 3.2 * (config.speedMultiplier ?? 1),
        isTarget: true,
        isMoving: speedSetting !== 'slow'
      });

      // Distractors: make sure none match both color AND shape!
      for (let i = 1; i < objectCount; i++) {
        let dShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        let dColor = COLORS[Math.floor(Math.random() * COLORS.length)];

        // Force a difference
        while (dShape === targetShape && dColor.name === targetColor.name) {
          dShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
          dColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        }

        initializedObjects.push({
          id: i,
          type: 'shape',
          shape: dShape,
          color: dColor.name,
          colorHex: dColor.hex,
          size: 'medium',
          sizePx: SIZES[1].px,
          x: 50 + Math.random() * 350,
          y: 50 + Math.random() * 180,
          vx: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 3.2 * (config.speedMultiplier ?? 1),
          vy: speedSetting === 'slow' ? 0 : (Math.random() - 0.5) * 3.2 * (config.speedMultiplier ?? 1),
          isTarget: false,
          isMoving: speedSetting !== 'slow'
        });
      }
    }

    setObjects(initializedObjects);
    setInstruction(promptText);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [objectCount, speedSetting, instructionType, config]);

  // Handle bouncing physics
  useEffect(() => {
    let lastTime = performance.now();

    const updatePhysics = () => {
      const container = containerRef.current;
      if (!container) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const rect = container.getBoundingClientRect();
      const boundW = rect.width;
      const boundH = rect.height;

      setObjects((prevObjects) =>
        prevObjects.map((obj) => {
          if (!obj.isMoving) return obj;

          let nx = obj.x + obj.vx;
          let ny = obj.y + obj.vy;
          let nvx = obj.vx;
          let nvy = obj.vy;

          const size = obj.sizePx || 48;

          // Bounce off walls
          if (nx < 0) {
            nx = 0;
            nvx = Math.abs(obj.vx);
          } else if (nx + size > boundW) {
            nx = boundW - size;
            nvx = -Math.abs(obj.vx);
          }

          if (ny < 0) {
            ny = 0;
            nvy = Math.abs(obj.vy);
          } else if (ny + size > boundH) {
            ny = boundH - size;
            nvy = -Math.abs(obj.vy);
          }

          return {
            ...obj,
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
  }, [objects.length]);

  const handleObjectClick = (obj: ReactionObject, e: React.MouseEvent) => {
    e.stopPropagation();

    if (obj.isTarget) {
      audio.playSuccess();
      onSuccess(1.0);
    } else {
      audio.playFailure();
      onFail();
    }
  };

  const handleContainerClick = () => {
    audio.playFailure();
    onFail();
  };

  // Render SVG helper for shapes
  const renderShape = (obj: ReactionObject) => {
    const color = obj.colorHex || '#ffffff';
    const size = obj.sizePx || 48;

    if (obj.shape === 'circle') {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill={color} filter="drop-shadow(0px 0px 8px rgba(0,0,0,0.5))" />
        </svg>
      );
    }
    if (obj.shape === 'square') {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" rx="10" fill={color} filter="drop-shadow(0px 0px 8px rgba(0,0,0,0.5))" />
        </svg>
      );
    }
    if (obj.shape === 'triangle') {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon points="50,10 90,85 10,85" fill={color} filter="drop-shadow(0px 0px 8px rgba(0,0,0,0.5))" />
        </svg>
      );
    }
    if (obj.shape === 'star') {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill={color} filter="drop-shadow(0px 0px 8px rgba(0,0,0,0.5))" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-4">
      {/* Instruction banner with neon glowing text */}
      <div className="w-full text-center py-4 bg-zinc-900/90 border-2 border-indigo-500 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse">
        <span className="text-zinc-400 font-mono text-xs uppercase tracking-widest block mb-1">
          Visual Command
        </span>
        <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
          {instruction}
        </h2>
      </div>

      {/* Physics Arena */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative w-full h-[360px] bg-zinc-950 rounded-2xl border-2 border-zinc-800 shadow-[0_0_25px_rgba(0,0,0,0.8)] overflow-hidden cursor-crosshair"
      >
        {/* Animated grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

        {objects.map((obj) => (
          <button
            key={obj.id}
            id={`btn-reaction-${obj.id}`}
            onClick={(e) => handleObjectClick(obj, e)}
            style={{
              position: 'absolute',
              left: `${obj.x}px`,
              top: `${obj.y}px`,
              width: `${obj.sizePx}px`,
              height: `${obj.sizePx}px`,
              transition: obj.isMoving ? 'none' : 'transform 0.1s ease',
            }}
            className="flex items-center justify-center select-none active:scale-95 duration-75 outline-none hover:scale-105"
          >
            {obj.type === 'emoji' ? (
              <span style={{ fontSize: `${(obj.sizePx || 48) - 10}px` }} className="filter drop-shadow-md">
                {obj.emoji}
              </span>
            ) : (
              renderShape(obj)
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
