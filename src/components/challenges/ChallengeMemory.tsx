import { useEffect, useState } from 'react';
import { LevelConfig } from '../../types';
import { EMOJI_SETS } from '../../utils/levels';
import { audio } from '../../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Check, RefreshCw } from 'lucide-react';

interface ChallengeMemoryProps {
  config: LevelConfig['config'];
  onSuccess: (bonusRatio: number, isPerfect: boolean) => void;
  onFail: () => void;
}

export default function ChallengeMemory({ config, onSuccess, onFail }: ChallengeMemoryProps) {
  const [phase, setPhase] = useState<'memorize' | 'recall'>('memorize');
  const [targetEmojis, setTargetEmojis] = useState<string[]>([]);
  const [gridEmojis, setGridEmojis] = useState<string[]>([]);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [viewTimeProgress, setViewTimeProgress] = useState(100);

  const targetEmojiCount = config.targetEmojiCount || 3;
  const gridSize = config.gridSize || 12;
  const viewDuration = config.viewDuration || 3000;
  const similarEmojis = !!config.similarEmojis;

  // Initialize Emojis
  useEffect(() => {
    // Determine which emoji set to use
    let activeSet = EMOJI_SETS.standard;
    if (similarEmojis) {
      const sets = [
        EMOJI_SETS.similarFaces,
        EMOJI_SETS.similarAnimals,
        EMOJI_SETS.similarFood,
        EMOJI_SETS.similarHearts,
      ];
      // Pick one randomly
      activeSet = sets[Math.floor(Math.random() * sets.length)];
    }

    // Shuffle active set
    const shuffledSet = [...activeSet].sort(() => Math.random() - 0.5);

    // Pick target emojis
    const targets = shuffledSet.slice(0, targetEmojiCount);
    setTargetEmojis(targets);

    // Create selection grid: targets + distractors
    const distractorsPool = shuffledSet.slice(targetEmojiCount);
    const neededDistractors = Math.max(0, gridSize - targetEmojiCount);
    const distractors = distractorsPool.slice(0, neededDistractors);

    // Combine and shuffle for final grid
    const combined = [...targets, ...distractors].sort(() => Math.random() - 0.5);
    setGridEmojis(combined);

    setPhase('memorize');
    setSelectedEmojis([]);
    setViewTimeProgress(100);

    // Handle view duration countdown timer
    let startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.max(0, 100 - (elapsed / viewDuration) * 100);
      setViewTimeProgress(pct);

      if (elapsed < viewDuration) {
        animId = requestAnimationFrame(tick);
      } else {
        setPhase('recall');
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [targetEmojiCount, gridSize, viewDuration, similarEmojis, config]);

  const handleEmojiClick = (emoji: string) => {
    if (phase !== 'recall') return;

    if (targetEmojis.includes(emoji)) {
      // Correct click
      if (selectedEmojis.includes(emoji)) return; // Already selected, ignore

      const updated = [...selectedEmojis, emoji];
      setSelectedEmojis(updated);
      audio.playBeep(440 + updated.length * 80, 0.1, 'sine');

      // Check if player found all targets
      if (updated.length === targetEmojis.length) {
        audio.playSuccess();
        // Since clicking a distractor triggers immediate failure, any win is "perfect"
        onSuccess(1.0, true);
      }
    } else {
      // Wrong click triggers failure immediately
      audio.playFailure();
      onFail();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-5">
      <AnimatePresence mode="wait">
        {phase === 'memorize' ? (
          <motion.div
            key="memorize-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center space-y-6 w-full"
          >
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-800/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <Eye className="w-3.5 h-3.5 animate-pulse" />
              <span>MEMORIZE THESE TARGETS!</span>
            </div>

            {/* Target Display Panel */}
            <div className="flex flex-wrap justify-center gap-4 bg-zinc-900/80 p-8 rounded-2xl border-2 border-zinc-800 shadow-xl min-h-[140px] items-center w-full max-w-md">
              {targetEmojis.map((emoji, idx) => (
                <motion.div
                  key={`target-${idx}`}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: idx * 0.08, type: 'spring' }}
                  className="text-5xl md:text-6xl p-3 bg-zinc-950 rounded-xl border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.05)] select-none cursor-default"
                >
                  {emoji}
                </motion.div>
              ))}
            </div>

            {/* View Duration Timer Bar */}
            <div className="w-full max-w-md bg-zinc-950 rounded-full h-3 border border-zinc-800 overflow-hidden p-0.5">
              <div
                style={{ width: `${viewTimeProgress}%` }}
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-30 ease-linear shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="recall-screen"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-5 w-full"
          >
            <div className="flex items-center justify-between w-full max-w-md text-xs font-mono">
              <div className="flex items-center space-x-1.5 text-zinc-400 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select all targets!</span>
              </div>
              <div className="text-zinc-300 font-bold bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800">
                Found: <span className="text-green-400">{selectedEmojis.length}</span> / {targetEmojis.length}
              </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-zinc-950/95 p-6 rounded-2xl border-2 border-zinc-800 shadow-2xl w-full">
              {gridEmojis.map((emoji, idx) => {
                const isSelected = selectedEmojis.includes(emoji);
                return (
                  <button
                    key={`grid-emoji-${idx}`}
                    id={`btn-memory-${idx}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className={`
                      relative aspect-square text-4xl p-2 rounded-xl flex items-center justify-center border select-none transition-all duration-150 active:scale-95
                      ${
                        isSelected
                          ? 'bg-zinc-900 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] saturate-100 opacity-80 cursor-default'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 hover:border-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                      }
                    `}
                    disabled={isSelected}
                  >
                    <span className={isSelected ? 'scale-90 brightness-75' : 'hover:scale-105 duration-100'}>
                      {emoji}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 shadow-md">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
