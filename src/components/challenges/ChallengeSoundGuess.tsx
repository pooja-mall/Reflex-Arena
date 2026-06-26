import { useEffect, useState, useRef } from 'react';
import { LevelConfig } from '../../types';
import { CHALLENGE_SOUNDS_POOL } from '../../utils/levels';
import { audio } from '../../utils/audio';
import { Volume2, Play, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ChallengeSoundGuessProps {
  config: LevelConfig['config'];
  onSuccess: (bonusRatio: number) => void;
  onFail: () => void;
  onDeductTime: (seconds: number) => void;
}

interface SoundOptionChoice {
  id: string;
  label: string;
}

export default function ChallengeSoundGuess({ config, onSuccess, onFail, onDeductTime }: ChallengeSoundGuessProps) {
  const [choices, setChoices] = useState<SoundOptionChoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const initialized = useRef(false);

  const soundId = config.soundId || 'bell';

  // Initialize Choices and Play Sound initially
  useEffect(() => {
    // Correct Option
    const correctSound = CHALLENGE_SOUNDS_POOL.find(s => s.id === soundId);
    if (!correctSound) return;

    // Filter out correct sound to choose distractors
    const remainingSounds = CHALLENGE_SOUNDS_POOL.filter(s => s.id !== soundId);
    // Shuffle remaining and take 3
    const distractors = remainingSounds
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(s => ({ id: s.id, label: s.label }));

    // Combine and shuffle
    const allChoices = [
      { id: correctSound.id, label: correctSound.label },
      ...distractors
    ].sort(() => Math.random() - 0.5);

    setChoices(allChoices);
    setWrongAnswers([]);

    // Auto play sound on load
    const timer = setTimeout(() => {
      triggerSound();
    }, 500);

    return () => clearTimeout(timer);
  }, [soundId, config]);

  const triggerSound = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    audio.playChallengeSound(soundId);

    // Turn off waveform animation after ~2.5 seconds (the general duration of synthesized sounds)
    setTimeout(() => {
      setIsPlaying(false);
    }, 2500);
  };

  const handleChoiceClick = (choice: SoundOptionChoice) => {
    if (wrongAnswers.includes(choice.id)) return; // Already clicked, ignore

    if (choice.id === soundId) {
      audio.playSuccess();
      onSuccess(1.0);
    } else {
      // Incorrect answer loses time: e.g., deducts 2 seconds
      audio.playFailure();
      setWrongAnswers(prev => [...prev, choice.id]);
      onDeductTime(2.0); // Call parent callback to decrease clock
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-800/60 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
        <span>Synthesized Acoustic Quiz</span>
      </div>

      {/* Speaker and Waveform Visualizer */}
      <div className="relative w-full aspect-video md:h-[200px] bg-zinc-950/95 rounded-2xl border-2 border-zinc-800/80 shadow-2xl flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Animated Neon Concentric Waves */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(4)].map((_, idx) => (
              <motion.div
                key={`ripple-${idx}`}
                initial={{ width: 60, height: 60, opacity: 0.8 }}
                animate={{ width: 340, height: 340, opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: idx * 0.5,
                  ease: 'easeOut',
                }}
                className="absolute border border-indigo-500/30 rounded-full"
              />
            ))}
          </div>
        )}

        <button
          onClick={triggerSound}
          id="btn-sound-replay"
          className={`
            relative z-10 w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-lg transition-all duration-300 group
            ${
              isPlaying
                ? 'bg-indigo-950 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]'
            }
          `}
        >
          {isPlaying ? (
            <Volume2 className="w-9 h-9 animate-bounce" />
          ) : (
            <Play className="w-9 h-9 fill-current group-hover:scale-105 duration-150" />
          )}
        </button>

        <p className="mt-4 text-xs font-mono text-zinc-500 z-10 select-none">
          {isPlaying ? 'Synthesizing Audio Waveform...' : 'Click to Replay Sound'}
        </p>

        {/* Oscilloscope Visualizer Bar Chart Mockup */}
        <div className="absolute bottom-4 inset-x-8 flex justify-center items-end h-8 gap-0.5">
          {[...Array(24)].map((_, idx) => {
            const h = isPlaying ? Math.random() * 100 : 15;
            return (
              <div
                key={`bar-${idx}`}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${isPlaying ? 'bg-gradient-to-t from-indigo-500 to-pink-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'bg-zinc-800'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Answer Selections Grid */}
      <div className="grid grid-cols-2 gap-3.5 w-full">
        {choices.map((choice) => {
          const isWrong = wrongAnswers.includes(choice.id);
          return (
            <button
              key={choice.id}
              id={`btn-choice-${choice.id}`}
              onClick={() => handleChoiceClick(choice)}
              disabled={isWrong}
              className={`
                flex items-center justify-center font-display font-semibold text-sm md:text-base py-4 px-6 rounded-xl border-2 transition-all duration-200 select-none active:scale-95
                ${
                  isWrong
                    ? 'bg-zinc-950 text-red-500/60 border-red-950 cursor-not-allowed shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]'
                    : 'bg-zinc-900 hover:bg-zinc-900/40 border-zinc-800 text-zinc-200 hover:border-indigo-500 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {isWrong && <AlertCircle className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />}
                {choice.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
