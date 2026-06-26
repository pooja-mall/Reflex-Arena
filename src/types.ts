export type ChallengeType = 'dont-click' | 'memory' | 'quick-reaction' | 'sound-guess';

export interface LevelConfig {
  levelNumber: number;
  challengeType: ChallengeType;
  title: string;
  description: string;
  timerDuration: number; // in seconds
  isBoss: boolean;
  config: {
    // Challenge 1: Don't Click It config
    buttonCount?: number;
    fakeButtonCount?: number;
    buttonSize?: 'sm' | 'md' | 'lg';
    moving?: boolean;
    shuffling?: boolean;
    shufflingInterval?: number;
    
    // Challenge 2: Memory Madness config
    targetEmojiCount?: number;
    gridSize?: number; // total emojis shown in selection
    viewDuration?: number; // in ms
    similarEmojis?: boolean;
    
    // Challenge 3: Quick Reaction config
    objectCount?: number;
    instructionType?: 'color' | 'size' | 'shape' | 'odd' | 'movement';
    speed?: 'slow' | 'medium' | 'fast';
    
    // Challenge 4: Guess the Sound config
    soundId?: string;
    optionsCount?: number;

    // Custom speed multiplier based on game speed setting
    speedMultiplier?: number;
  };
}

export interface GameState {
  screen: 'home' | 'playing' | 'paused' | 'game-over' | 'instructions';
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  currentLevelIndex: number; // 0 to 19
  timeLeft: number; // current level countdown timer
  isSoundOn: boolean;
  isFullscreen: boolean;
  perfectLevelSuccess: boolean; // For bonus check
}

export interface SoundOption {
  id: string;
  label: string;
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}
