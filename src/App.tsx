import { useEffect, useState, useRef } from 'react';
import { GameState, LevelConfig, Achievement } from './types';
import { generateLevel, CHALLENGE_SOUNDS_POOL } from './utils/levels';
import { audio } from './utils/audio';

// Challenge components
import ChallengeDontClick from './components/challenges/ChallengeDontClick';
import ChallengeMemory from './components/challenges/ChallengeMemory';
import ChallengeQuickReaction from './components/challenges/ChallengeQuickReaction';
import ChallengeSoundGuess from './components/challenges/ChallengeSoundGuess';

// VFX and Helpers
import Confetti from './components/Confetti';
import {
  Heart,
  Trophy,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  Pause,
  HelpCircle,
  Award,
  RotateCcw,
  Home,
  CheckCircle,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  Lock,
  X,
  Flame,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Achievements Database
const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: 'First Victory', description: 'Complete your first reflex level.', unlocked: false, icon: '🎯' },
  { id: 'boss_slayer', title: 'Boss Slayer', description: 'Clear your first Mini-Boss challenge.', unlocked: false, icon: '👹' },
  { id: 'combo_king', title: 'Combo Overlord', description: 'Reach a max Combo multiplier of x5.', unlocked: false, icon: '🔥' },
  { id: 'acoustic_adept', title: 'Sonic Scholar', description: 'Correctly identify a sound in under 1.5 seconds.', unlocked: false, icon: '🎧' },
  { id: 'flawless_memory', title: 'Perfect Recall', description: 'Successfully clear a Memory Madness level.', unlocked: false, icon: '🧠' },
  { id: 'immortal_arena', title: 'Immortal Legend', description: 'Reach Level 12 without losing a single life.', unlocked: false, icon: '👑' },
  { id: 'absolute_champion', title: 'Arena Master', description: 'Clear all 20 levels of Reflex Arena!', unlocked: false, icon: '🏆' }
];

export default function App() {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    screen: 'home',
    score: 0,
    combo: 1,
    maxCombo: 1,
    lives: 3,
    currentLevelIndex: 0,
    timeLeft: 8,
    isSoundOn: true,
    isFullscreen: false,
    perfectLevelSuccess: true
  });

  const [bestScore, setBestScore] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [notification, setNotification] = useState<string | null>(null);
  const [gameSpeed, setGameSpeed] = useState<'relaxed' | 'normal' | 'fast'>('normal');
  
  // Transition states
  const [levelIntermission, setLevelIntermission] = useState<boolean>(false);
  const [intermissionText, setIntermissionText] = useState<{title: string, score: number, bonus: number} | null>(null);
  const [isStrikeFlash, setIsStrikeFlash] = useState<boolean>(false);
  const [isConfettiActive, setIsConfettiActive] = useState<boolean>(false);

  // References for timing
  const levelStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const activeLevelConfig = generateLevel(gameState.currentLevelIndex + 1, gameSpeed);

  // Load High Score, Achievements, and Speed from Local Storage on mount
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('reflex_arena_best_score');
      if (savedScore) {
        setBestScore(parseInt(savedScore, 10));
      }

      const savedAchievements = localStorage.getItem('reflex_arena_unlocked_achievements');
      if (savedAchievements) {
        const parsedIds: string[] = JSON.parse(savedAchievements);
        setAchievements(prev => prev.map(ach => ({
          ...ach,
          unlocked: parsedIds.includes(ach.id)
        })));
      }

      const savedSpeed = localStorage.getItem('reflex_arena_game_speed');
      if (savedSpeed === 'relaxed' || savedSpeed === 'normal' || savedSpeed === 'fast') {
        setGameSpeed(savedSpeed);
      }
    } catch (e) {
      console.error('Failed to load local storage data', e);
    }
  }, []);

  const handleSpeedChange = (speed: 'relaxed' | 'normal' | 'fast') => {
    setGameSpeed(speed);
    try {
      localStorage.setItem('reflex_arena_game_speed', speed);
    } catch (e) {
      console.error(e);
    }
  };

  // Save High Score on change
  const updateBestScore = (score: number) => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem('reflex_arena_best_score', score.toString());
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Sound enable hook
  useEffect(() => {
    audio.enabled = gameState.isSoundOn;
  }, [gameState.isSoundOn]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setGameState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setGameState(prev => ({ ...prev, isFullscreen: false }));
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState.screen === 'playing') {
        e.preventDefault();
        pauseGame();
      }
      if (e.key === ' ' && gameState.screen === 'playing') {
        // Space bar triggers sound replay in Guess Sound challenge or toggles sound
        const challenge = activeLevelConfig.challengeType;
        if (challenge === 'sound-guess') {
          // Trigger click on sound button
          const btn = document.getElementById('btn-sound-replay');
          if (btn) btn.click();
        } else {
          setGameState(prev => ({ ...prev, isSoundOn: !prev.isSoundOn }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.screen, gameState.currentLevelIndex]);

  // Achievement unlocker
  const unlockAchievement = (id: string) => {
    let unlockedNew = false;
    setAchievements(prev => {
      const updated = prev.map(ach => {
        if (ach.id === id && !ach.unlocked) {
          unlockedNew = true;
          return { ...ach, unlocked: true };
        }
        return ach;
      });

      if (unlockedNew) {
        // Save to local storage
        const unlockedIds = updated.filter(a => a.unlocked).map(a => a.id);
        localStorage.setItem('reflex_arena_unlocked_achievements', JSON.stringify(unlockedIds));
        
        // Show notification popup
        const ach = updated.find(a => a.id === id);
        if (ach) {
          setNotification(`${ach.icon} UNLOCKED: ${ach.title}!`);
          setTimeout(() => setNotification(null), 3500);
        }
      }
      return updated;
    });
  };

  // ---------------------------------------------------------------------------
  // TIMERS AND CORE GAME LOOP
  // ---------------------------------------------------------------------------

  const startGame = () => {
    audio.playSuccess();
    setGameState(prev => ({
      ...prev,
      screen: 'playing',
      score: 0,
      combo: 1,
      maxCombo: 1,
      lives: 3,
      currentLevelIndex: 0,
      timeLeft: generateLevel(1, gameSpeed).timerDuration
    }));
    setLevelIntermission(false);
    setIsConfettiActive(false);
    levelStartTimeRef.current = performance.now();
  };

  const startNextLevel = (nextIndex: number) => {
    const nextConfig = generateLevel(nextIndex + 1, gameSpeed);
    
    // Check Immortal Arena achievement on entering level 12 with full lives
    if (nextIndex + 1 === 12 && gameState.lives === 3) {
      unlockAchievement('immortal_arena');
    }

    setGameState(prev => ({
      ...prev,
      currentLevelIndex: nextIndex,
      timeLeft: nextConfig.timerDuration,
      perfectLevelSuccess: true
    }));
    setLevelIntermission(false);
    levelStartTimeRef.current = performance.now();
  };

  // Pause & Resume
  const pauseGame = () => {
    if (gameState.screen === 'playing') {
      setGameState(prev => ({ ...prev, screen: 'paused' }));
    }
  };

  const resumeGame = () => {
    setGameState(prev => ({ ...prev, screen: 'playing' }));
    levelStartTimeRef.current = performance.now() - ((activeLevelConfig.timerDuration - gameState.timeLeft) * 1000);
  };

  // Timer Tick implementation
  useEffect(() => {
    if (gameState.screen !== 'playing' || levelIntermission) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Set up rapid tick interval for smooth rendering
    const tickInterval = 50; // ms
    timerIntervalRef.current = window.setInterval(() => {
      setGameState(prev => {
        const nextTime = Math.max(0, prev.timeLeft - (tickInterval / 1000));
        if (nextTime <= 0) {
          // Time Ran Out! Handled as a strike
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          handleLevelStrike();
          return prev;
        }
        return { ...prev, timeLeft: parseFloat(nextTime.toFixed(2)) };
      });
    }, tickInterval);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameState.screen, gameState.currentLevelIndex, levelIntermission]);

  // ---------------------------------------------------------------------------
  // LEVEL SUCCESS / STRIKE HANDLERS
  // ---------------------------------------------------------------------------

  const handleLevelSuccess = (bonusRatio: number = 1.0, isPerfectRecall: boolean = false) => {
    // Clear interval immediately
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsed = (performance.now() - levelStartTimeRef.current) / 1000;
    const levelLimit = activeLevelConfig.timerDuration;
    
    // Base score
    const baseScore = 100;
    
    // Speed bonus: if cleared in under 30% of total allotted time
    const isFast = elapsed <= levelLimit * 0.3;
    const speedBonus = isFast ? 50 : 0;

    // Perfect memory bonus
    const memoryBonus = isPerfectRecall ? 100 : 0;

    // Total level score before multiplier
    const rawLevelScore = baseScore + speedBonus + memoryBonus;
    
    // Apply Combo Multiplier
    const levelTotalEarned = rawLevelScore * gameState.combo;

    // Update Achievements
    unlockAchievement('first_blood');
    if (activeLevelConfig.isBoss) {
      unlockAchievement('boss_slayer');
    }
    if (gameState.combo >= 5) {
      unlockAchievement('combo_king');
    }
    if (isPerfectRecall) {
      unlockAchievement('flawless_memory');
    }
    if (activeLevelConfig.challengeType === 'sound-guess' && elapsed <= 1.5) {
      unlockAchievement('acoustic_adept');
    }

    // Increment combo up to max of 5
    const nextCombo = Math.min(5, gameState.combo + 1);
    const nextMaxCombo = Math.max(gameState.maxCombo, gameState.combo);

    // Add up scores
    const nextScore = gameState.score + levelTotalEarned;
    updateBestScore(nextScore);

    // Set intermission statistics
    setIntermissionText({
      title: activeLevelConfig.isBoss ? '👾 BOSS CRUSHED!' : '⚡ TARGET ACQUIRED!',
      score: baseScore * gameState.combo,
      bonus: (speedBonus + memoryBonus) * gameState.combo
    });

    setGameState(prev => ({
      ...prev,
      score: nextScore,
      combo: nextCombo,
      maxCombo: nextMaxCombo
    }));

    // Trigger Boss Level Confetti
    if (activeLevelConfig.isBoss) {
      setIsConfettiActive(true);
    }

    // Display level clear overlay for 1.2 seconds, then transition
    setLevelIntermission(true);
    audio.playLevelClear();

    setTimeout(() => {
      setIsConfettiActive(false);
      // Check if this was the final level 20
      if (gameState.currentLevelIndex >= 19) {
        unlockAchievement('absolute_champion');
        setGameState(prev => ({ ...prev, screen: 'game-over' }));
      } else {
        startNextLevel(gameState.currentLevelIndex + 1);
      }
    }, 1300);
  };

  const handleLevelStrike = () => {
    // Fail current level, subtract 1 life
    const nextLives = gameState.lives - 1;
    
    // Trigger visual feedback
    setIsStrikeFlash(true);
    setTimeout(() => setIsStrikeFlash(false), 200);

    // Reset combo
    setGameState(prev => ({
      ...prev,
      lives: nextLives,
      combo: 1
    }));

    if (nextLives <= 0) {
      // Game Over
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      audio.playGameOver();
      updateBestScore(gameState.score);
      setGameState(prev => ({ ...prev, screen: 'game-over' }));
    } else {
      // Retry same level immediately with restored timer
      setGameState(prev => ({
        ...prev,
        timeLeft: activeLevelConfig.timerDuration
      }));
      levelStartTimeRef.current = performance.now();
    }
  };

  const handleSoundDeductTime = (seconds: number) => {
    // Penalty for wrong answers in challenge 4
    setGameState(prev => {
      const nextTime = Math.max(0, prev.timeLeft - seconds);
      return { ...prev, timeLeft: nextTime };
    });
    // Shake screen or flashing effects can also trigger here
    setIsStrikeFlash(true);
    setTimeout(() => setIsStrikeFlash(false), 120);
  };

  return (
    <div className={`relative min-h-screen bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden ${isStrikeFlash ? 'animate-pulse bg-red-950/40' : ''}`}>
      
      {/* Background Neon Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(100,100,100,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(100,100,100,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

      {/* Floating unlock achievement notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-gradient-to-r from-yellow-500 via-amber-600 to-pink-600 px-5 py-3.5 rounded-2xl border-2 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.5)] flex items-center space-x-3 text-white font-display font-bold text-sm"
          >
            <Sparkles className="w-5 h-5 text-white animate-spin" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Confetti active={isConfettiActive} />

      {/* -----------------------------------------------------------------------
          HEADER UTILITIES (Always visible on Home / Playing)
          ----------------------------------------------------------------------- */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-xl flex items-center justify-center font-display font-black text-xl tracking-tighter shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            R
          </div>
          <span className="font-display font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-indigo-400 to-cyan-400">
            REFLEX ARENA
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sound On/Off Toggle */}
          <button
            onClick={() => setGameState(prev => ({ ...prev, isSoundOn: !prev.isSoundOn }))}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all active:scale-95"
            title="Toggle Sound Effects"
          >
            {gameState.isSoundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all active:scale-95"
            title="Toggle Fullscreen"
          >
            {gameState.isFullscreen ? <Minimize2 className="w-4 h-4 text-pink-400" /> : <Maximize2 className="w-4 h-4 text-zinc-400" />}
          </button>
        </div>
      </header>

      {/* -----------------------------------------------------------------------
          MAIN SCREENS ROUTING
          ----------------------------------------------------------------------- */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* 1. HOME SCREEN */}
          {gameState.screen === 'home' && (
            <motion.div
              key="screen-home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center space-y-10 w-full"
            >
              {/* Massive Neon Logo branding */}
              <div className="relative group select-none">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 opacity-60 blur-xl group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-tilt" />
                <div className="relative bg-zinc-950 px-10 py-12 rounded-3xl border-2 border-zinc-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <span className="font-mono text-xs text-zinc-400 tracking-widest uppercase block mb-2">
                    ⚡ NEON ARCADE CABINET ⚡
                  </span>
                  <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-indigo-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    REFLEX ARENA
                  </h1>
                  <p className="mt-3 text-sm md:text-base text-zinc-400 font-mono max-w-md mx-auto">
                    A multi-sensory mental agility challenge. Expand memory, hone speed, master acoustics.
                  </p>
                </div>
              </div>

              {/* Best Score display */}
              <div className="flex items-center space-x-6 bg-zinc-900/60 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-zinc-800 shadow-lg font-mono">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">High Score:</span>
                </div>
                <span className="text-2xl font-bold text-yellow-400 glow-yellow">{bestScore}</span>
              </div>

              {/* Game Speed Setting */}
              <div className="flex flex-col items-center space-y-3 bg-zinc-950/60 backdrop-blur-md px-6 py-4.5 rounded-3xl border border-zinc-900 shadow-xl w-full max-w-md">
                <div className="flex items-center space-x-1.5 select-none font-mono text-[11px] text-zinc-500 tracking-wider uppercase">
                  <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>PREFERRED GAME SPEED</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {(['relaxed', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`relative py-2.5 px-3 rounded-2xl font-display text-xs font-black uppercase tracking-wider transition-all duration-300 border active:scale-95 cursor-pointer ${
                        gameSpeed === speed
                          ? speed === 'relaxed'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-extrabold'
                            : speed === 'normal'
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-extrabold'
                            : 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] font-extrabold'
                          : 'bg-zinc-900/40 border-zinc-900/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/80 hover:border-zinc-800'
                      }`}
                    >
                      {gameSpeed === speed && (
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          speed === 'relaxed' ? 'bg-emerald-400' : speed === 'normal' ? 'bg-indigo-400' : 'bg-rose-400'
                        } animate-ping`} />
                      )}
                      {speed}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono text-center leading-normal max-w-xs">
                  {gameSpeed === 'relaxed' && '🟢 Extra long timers, slower motion. Perfect for casual play!'}
                  {gameSpeed === 'normal' && '🔵 Balanced timers & speeds. Optimized, responsive reflex mode.'}
                  {gameSpeed === 'fast' && '🔴 Accelerated speed, shorter timers. For seasoned speedrunners.'}
                </p>
              </div>

              {/* Main Actions */}
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                  onClick={startGame}
                  className="flex-1 py-4.5 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-indigo-600 to-cyan-500 font-display font-extrabold text-lg text-white hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] active:scale-95 transition-all duration-150 flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>PLAY NOW</span>
                </button>

                <button
                  onClick={() => setGameState(prev => ({ ...prev, screen: 'instructions' }))}
                  className="flex-1 py-4.5 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-zinc-700 font-display font-bold text-base text-zinc-300 hover:text-white active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <HelpCircle className="w-5 h-5 text-zinc-400" />
                  <span>HOW TO PLAY</span>
                </button>
              </div>

              {/* Persisted Achievements Panel on Home */}
              <div className="w-full max-w-2xl bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-4 border-b border-zinc-900 pb-3">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-display font-bold text-sm text-zinc-300">Persisted Badges ({achievements.filter(a => a.unlocked).length} / 7)</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center text-center space-y-1.5 transition-all duration-300 ${
                        ach.unlocked
                          ? 'bg-zinc-900/40 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.05)]'
                          : 'bg-zinc-950 border-zinc-900 opacity-40'
                      }`}
                    >
                      <span className="text-2xl">{ach.unlocked ? ach.icon : '🔒'}</span>
                      <span className="text-xs font-bold text-zinc-200 line-clamp-1">{ach.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono leading-tight">{ach.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
          {gameState.screen === 'playing' && (
            <motion.div
              key="screen-playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col space-y-6"
            >
              {/* Level HUD Header */}
              <div className="w-full bg-zinc-950/80 rounded-2xl border border-zinc-900 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                {/* Boss Alarm glow line */}
                {activeLevelConfig.isBoss && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 animate-pulse" />
                )}

                {/* Score and Multiplier */}
                <div className="flex items-center space-x-4">
                  <div className="font-mono">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Score</span>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">
                      {gameState.score}
                    </span>
                  </div>

                  {/* Combo Streak Multiplier Bar */}
                  <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full select-none">
                    <Flame className={`w-4 h-4 ${gameState.combo > 1 ? 'text-amber-500 animate-bounce' : 'text-zinc-600'}`} />
                    <span className={`font-mono text-xs font-bold ${gameState.combo > 1 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      x{gameState.combo}
                    </span>
                    {/* Tiny indicators */}
                    <div className="flex gap-0.5 ml-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={`combo-dot-${level}`}
                          className={`w-1.5 h-1.5 rounded-full ${
                            gameState.combo >= level
                              ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]'
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Level Title */}
                <div className="text-center">
                  <h2 className={`font-display font-extrabold text-base md:text-lg tracking-tight uppercase leading-none ${activeLevelConfig.isBoss ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 animate-pulse' : 'text-white'}`}>
                    {activeLevelConfig.title}
                  </h2>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mt-1 block">
                    Challenge {gameState.currentLevelIndex + 1} of 20
                  </span>
                </div>

                {/* Lives and Pause Button */}
                <div className="flex items-center justify-between md:justify-end space-x-4">
                  {/* Hearts */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3].map((lifeIdx) => (
                      <Heart
                        key={`heart-${lifeIdx}`}
                        className={`w-5.5 h-5.5 ${
                          gameState.lives >= lifeIdx
                            ? 'text-pink-500 fill-current drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-100 transition-all duration-300'
                            : 'text-zinc-800 scale-90'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Pause Button */}
                  <button
                    onClick={pauseGame}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pause</span>
                  </button>
                </div>
              </div>

              {/* Timer Progress Clock Countdown */}
              <div className="w-full flex items-center space-x-3 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 shadow-md">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="flex-1 bg-zinc-900 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    style={{ width: `${(gameState.timeLeft / activeLevelConfig.timerDuration) * 100}%` }}
                    className={`h-full rounded-full transition-all duration-75 shadow-lg ${
                      gameState.timeLeft < activeLevelConfig.timerDuration * 0.3
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        : 'bg-gradient-to-r from-emerald-500 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    }`}
                  />
                </div>
                <span className="font-mono text-xs font-bold w-12 text-right">
                  {gameState.timeLeft.toFixed(1)}s
                </span>
              </div>

              {/* The Challenge Content Stage */}
              <div className="relative min-h-[420px] flex items-center justify-center bg-zinc-900/20 rounded-3xl border border-zinc-900 p-6 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                {levelIntermission ? (
                  // Overlay Clear animation
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center space-y-4 text-center z-20"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-display font-black tracking-tight text-green-400 glow-green">
                      {intermissionText?.title}
                    </h2>
                    <div className="font-mono text-sm space-y-1 text-zinc-400 bg-zinc-950 px-6 py-3 rounded-xl border border-zinc-800">
                      <div>Base Clear: <span className="text-white font-bold">+{intermissionText?.score}</span></div>
                      {intermissionText?.bonus && intermissionText.bonus > 0 ? (
                        <div className="text-cyan-400">Time / Memory Bonus: <span className="font-bold">+{intermissionText.bonus}</span></div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : (
                  // Load respective challenge component
                  <div className="w-full">
                    {activeLevelConfig.challengeType === 'dont-click' && (
                      <ChallengeDontClick
                        config={activeLevelConfig.config}
                        onSuccess={handleLevelSuccess}
                        onFail={handleLevelStrike}
                      />
                    )}
                    {activeLevelConfig.challengeType === 'memory' && (
                      <ChallengeMemory
                        config={activeLevelConfig.config}
                        onSuccess={handleLevelSuccess}
                        onFail={handleLevelStrike}
                      />
                    )}
                    {activeLevelConfig.challengeType === 'quick-reaction' && (
                      <ChallengeQuickReaction
                        config={activeLevelConfig.config}
                        onSuccess={handleLevelSuccess}
                        onFail={handleLevelStrike}
                      />
                    )}
                    {activeLevelConfig.challengeType === 'sound-guess' && (
                      <ChallengeSoundGuess
                        config={activeLevelConfig.config}
                        onSuccess={handleLevelSuccess}
                        onFail={handleLevelStrike}
                        onDeductTime={handleSoundDeductTime}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 3. PAUSED DRAWER OVERLAY */}
          {gameState.screen === 'paused' && (
            <motion.div
              key="screen-paused"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto bg-zinc-950 p-8 rounded-3xl border-2 border-zinc-800 shadow-2xl relative z-30"
            >
              <h2 className="text-3xl font-display font-extrabold tracking-tight text-white">
                GAME PAUSED
              </h2>
              <p className="text-sm font-mono text-zinc-400 leading-relaxed">
                Agility timer suspended. Resume when you are ready to continue the reflex trial.
              </p>

              <div className="flex flex-col gap-3.5 w-full">
                <button
                  onClick={resumeGame}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 font-display font-bold text-base hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 transition-all"
                >
                  RESUME GAME
                </button>

                <button
                  onClick={startGame}
                  className="py-3 px-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 font-display font-medium text-sm text-zinc-300 hover:text-white active:scale-95 transition-all"
                >
                  RESTART LEVEL 1
                </button>

                <button
                  onClick={() => setGameState(prev => ({ ...prev, screen: 'home' }))}
                  className="py-3 px-6 rounded-xl bg-transparent border border-transparent hover:border-red-900 text-zinc-500 hover:text-red-400 text-xs font-mono transition-all"
                >
                  QUIT TO MENU
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. INSTRUCTIONS SCREEN */}
          {gameState.screen === 'instructions' && (
            <motion.div
              key="screen-instructions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-2xl bg-zinc-950 p-6 md:p-8 rounded-3xl border-2 border-zinc-800 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-display font-black text-xl tracking-tight text-white">How To Play Reflex Arena</h2>
                </div>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, screen: 'home' }))}
                  className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm leading-relaxed max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Challenge 1 instruction */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-900 space-y-1">
                  <h4 className="font-display font-bold text-pink-400 flex items-center gap-1.5">
                    <span>🟢</span> Challenge 1: Don't Click It
                  </h4>
                  <p className="text-zinc-400 font-mono text-xs">
                    Find and click the single target green checkmark button before the level timer runs out. 
                    Avoid clicking red crosses, background noise, or fake distracting checkmarks. Speed earns multipliers!
                  </p>
                </div>

                {/* Challenge 2 instruction */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-900 space-y-1">
                  <h4 className="font-display font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>🧠</span> Challenge 2: Memory Madness
                  </h4>
                  <p className="text-zinc-400 font-mono text-xs">
                    Look closely at the highlighted emojis shown for 3 seconds. Once hidden, they will blend into a larger grid. 
                    Select only the correct ones. Perfect recall awards an extra 100 points!
                  </p>
                </div>

                {/* Challenge 3 instruction */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-900 space-y-1">
                  <h4 className="font-display font-bold text-amber-400 flex items-center gap-1.5">
                    <span>⚡</span> Challenge 3: Quick Reaction
                  </h4>
                  <p className="text-zinc-400 font-mono text-xs">
                    Read the instructions at the top with extreme care. Click the red star, the smallest square, or odd emoji. 
                    Shapes zip around boundaries at higher levels. Stay focused!
                  </p>
                </div>

                {/* Challenge 4 instruction */}
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-900 space-y-1">
                  <h4 className="font-display font-bold text-indigo-400 flex items-center gap-1.5">
                    <span>🔊</span> Challenge 4: Guess the Sound
                  </h4>
                  <p className="text-zinc-400 font-mono text-xs">
                    Listen to a programmatically generated retro synthesizer sound effect. Click the correct match from 4 choices. 
                    Be careful: incorrect guesses incur a -2.0 second penalty on the countdown!
                  </p>
                </div>

                {/* Boss information */}
                <div className="bg-gradient-to-r from-red-950/20 to-zinc-900/40 p-4 rounded-2xl border border-red-900/40 space-y-1">
                  <h4 className="font-display font-bold text-red-400 flex items-center gap-1.5">
                    <span>🔥</span> Mini-Boss Trials (Every 5th level)
                  </h4>
                  <p className="text-zinc-400 font-mono text-xs">
                    Levels 5, 10, 15, and 20 are ultimate mini-bosses. They feature extreme motion physics, complex layouts, 
                    and highly abbreviated clock timers. Completing them displays a major confetti celebration.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setGameState(prev => ({ ...prev, screen: 'home' }))}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-zinc-700 font-display font-bold text-zinc-300 hover:text-white rounded-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>BACK TO MENU</span>
              </button>
            </motion.div>
          )}

          {/* 5. GAME OVER / END SCREEN */}
          {gameState.screen === 'game-over' && (
            <motion.div
              key="screen-game-over"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-zinc-950 p-8 rounded-3xl border-2 border-zinc-800 shadow-2xl text-center space-y-8"
            >
              {gameState.currentLevelIndex >= 19 ? (
                // Victory Screen
                <div className="space-y-2">
                  <div className="inline-flex p-3 bg-yellow-500/10 border border-yellow-500 rounded-2xl text-yellow-400 animate-bounce mb-2">
                    <Trophy className="w-8 h-8 glow-yellow" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-200 uppercase tracking-tight">
                    ARENA CHAMPION!
                  </h1>
                  <p className="text-sm font-mono text-zinc-400">
                    Absolute Legend! You successfully cleared all 20 levels.
                  </p>
                </div>
              ) : (
                // Normal Game Over
                <div className="space-y-2">
                  <div className="inline-flex p-3 bg-red-500/10 border border-red-500 rounded-2xl text-red-500 mb-2">
                    <X className="w-8 h-8" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-pink-500 to-rose-400 uppercase tracking-tight">
                    ARENA DEFEAT
                  </h1>
                  <p className="text-sm font-mono text-zinc-400">
                    All lives lost. Hone your focus and try again.
                  </p>
                </div>
              )}

              {/* Statistics Breakdown */}
              <div className="grid grid-cols-3 gap-3 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900 font-mono text-left">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Final Score</span>
                  <span className="text-xl font-bold text-white block mt-1">{gameState.score}</span>
                  {gameState.score >= bestScore && gameState.score > 0 && (
                    <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded uppercase font-bold tracking-widest block w-max mt-1 animate-pulse">
                      NEW BEST
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Levels Cleared</span>
                  <span className="text-xl font-bold text-indigo-400 block mt-1">
                    {gameState.currentLevelIndex} / 20
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Max Combo</span>
                  <span className="text-xl font-bold text-pink-500 block mt-1 flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    x{gameState.maxCombo}
                  </span>
                </div>
              </div>

              {/* Play Again actions */}
              <div className="flex flex-col sm:flex-row gap-3.5 w-full">
                <button
                  onClick={startGame}
                  className="flex-1 py-4.5 bg-gradient-to-r from-pink-500 via-indigo-600 to-cyan-500 text-white font-display font-extrabold rounded-2xl active:scale-95 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>PLAY AGAIN</span>
                </button>

                <button
                  onClick={() => setGameState(prev => ({ ...prev, screen: 'home' }))}
                  className="flex-1 py-4.5 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-zinc-700 text-zinc-300 font-display font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Home className="w-5 h-5 text-zinc-500" />
                  <span>MAIN MENU</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* -----------------------------------------------------------------------
          FOOTER CREDIT LINE
          ----------------------------------------------------------------------- */}
      <footer className="relative z-10 w-full text-center py-4 text-[10px] font-mono text-zinc-600 select-none">
        REFLEX ARENA ENGINE v2.0 • BUILT WITH REACT & TAILWIND
      </footer>
    </div>
  );
}
