import { LevelConfig, ChallengeType } from '../types';

// Emoji databases for Memory Madness
export const EMOJI_SETS = {
  standard: ['😀', '🍔', '🐶', '🚀', '⚽', '🎸', '🍦', '🍕', '🚗', '🎈', '🎉', '🌟', '🍀', '🍎', '🐙', '🦖', '🍩', '🤖', '👑', '🌈'],
  similarFaces: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
  similarAnimals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆'],
  similarFood: ['🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🍊', '🍋', '🍌', '🍍', '🥭', '🍉', '🍇', '🍈', '🥥', '🥦', '🥑'],
  similarHearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️‍🔥', '❤️‍🩹', '💝']
};

export const CHALLENGE_SOUNDS_POOL = [
  { id: 'rain', label: 'Rain', description: 'Soft pitter-patter of rain droplets with filtered white noise.' },
  { id: 'keyboard', label: 'Keyboard', description: 'Rapid, crisp clicking of a mechanical keyboard.' },
  { id: 'dog', label: 'Dog barking', description: 'Double low-pitch bark with resonant acoustic decay.' },
  { id: 'bell', label: 'Bell ring', description: 'Ringing metallic brass bell with rich non-harmonic overtones.' },
  { id: 'car', label: 'Car horn / Engine', description: 'Low engine acceleration coupled with a dual-tone beep horn.' },
  { id: 'water', label: 'Water bubbling', description: 'Playful bubbling liquid pops ascending in frequency.' },
  { id: 'door', label: 'Door knock / Creak', description: 'Heavy double wood thud followed by a high squeaky hinge creak.' },
  { id: 'applause', label: 'Applause', description: 'Overlapping crackle bursts of a crowd clapping.' },
  { id: 'bird', label: 'Bird chirps', description: 'A rapid triplet of sweet high-frequency pitch-swept chirps.' },
  { id: 'clock', label: 'Clock ticking', description: 'Rhythmic, alternating high-and-low mechanical tick-tocks.' }
];

export function generateLevel(levelNumber: number, gameSpeed: 'relaxed' | 'normal' | 'fast' = 'normal'): LevelConfig {
  const isBoss = levelNumber % 5 === 0;
  
  // Decide challenge type cyclically (1: Don't Click, 2: Memory, 3: Reaction, 4: Sound, 5: Boss of chosen type)
  let challengeType: ChallengeType = 'dont-click';
  if (levelNumber % 4 === 1) challengeType = 'dont-click';
  else if (levelNumber % 4 === 2) challengeType = 'memory';
  else if (levelNumber % 4 === 3) challengeType = 'quick-reaction';
  else challengeType = 'sound-guess';

  // Override to give variety on boss levels
  if (isBoss) {
    if (levelNumber === 5) challengeType = 'dont-click'; // Boss 1: Chaos Buttons
    else if (levelNumber === 10) challengeType = 'memory'; // Boss 2: Mental Overload
    else if (levelNumber === 15) challengeType = 'quick-reaction'; // Boss 3: Ultimate Precision
    else challengeType = 'sound-guess'; // Level 20 Final Boss: Audiophile Nightmare
  }

  // Speed and Timer multipliers based on gameSpeed mode
  let timerMultiplier = 1.0;
  let speedMultiplier = 1.0;

  if (gameSpeed === 'relaxed') {
    timerMultiplier = 1.6;     // 60% extra time
    speedMultiplier = 0.45;    // 55% slower elements
  } else if (gameSpeed === 'fast') {
    timerMultiplier = 0.85;    // 15% less time
    speedMultiplier = 1.25;    // 25% faster elements
  } else {
    // normal speed
    timerMultiplier = 1.25;    // 25% extra time for a much more polished and fair play experience
    speedMultiplier = 0.7;     // 30% slower moving elements by default to fix the "too fast" issue
  }

  // Calculate generic timers that get shorter with level progression (optimized to be more robust)
  let timerDuration = 8;
  if (challengeType === 'dont-click') {
    timerDuration = Math.max(3.0, 9 - (levelNumber * 0.22));
  } else if (challengeType === 'memory') {
    timerDuration = Math.max(5.0, 11 - (levelNumber * 0.2));
  } else if (challengeType === 'quick-reaction') {
    timerDuration = Math.max(2.5, 7 - (levelNumber * 0.15));
  } else if (challengeType === 'sound-guess') {
    timerDuration = Math.max(4.0, 10 - (levelNumber * 0.22));
  }

  // Adjust timers for boss levels (slightly longer but much harder parameters)
  if (isBoss) {
    timerDuration *= 1.2;
  }

  // Apply the game-speed multiplier to the final level timer duration
  timerDuration *= timerMultiplier;

  // Build the detailed configuration based on challenge type
  const config: LevelConfig['config'] = {
    speedMultiplier
  };

  if (challengeType === 'dont-click') {
    // Buttons count
    config.buttonCount = Math.min(10, 3 + Math.floor(levelNumber / 3.5));
    config.fakeButtonCount = Math.min(6, Math.floor(levelNumber / 4));
    config.buttonSize = levelNumber <= 4 ? 'lg' : (levelNumber <= 11 ? 'md' : 'sm');
    config.moving = levelNumber >= 5;
    config.shuffling = levelNumber >= 8;
    
    // Make shuffling frequency scale with game speed
    const baseShuffle = Math.max(700, 2200 - (levelNumber * 80));
    config.shufflingInterval = baseShuffle * (gameSpeed === 'relaxed' ? 1.5 : (gameSpeed === 'fast' ? 0.85 : 1.15));
  } 
  
  else if (challengeType === 'memory') {
    config.targetEmojiCount = Math.min(8, 2 + Math.floor(levelNumber / 3.5));
    config.gridSize = Math.min(24, Math.max(6, Math.floor((config.targetEmojiCount || 3) * 2.5)));
    
    // Make viewing time scale with game speed
    const baseView = Math.max(1100, 3400 - (levelNumber * 120));
    config.viewDuration = baseView * (gameSpeed === 'relaxed' ? 1.5 : (gameSpeed === 'fast' ? 0.85 : 1.15));
    config.similarEmojis = levelNumber >= 6;
  } 
  
  else if (challengeType === 'quick-reaction') {
    config.objectCount = Math.min(12, 4 + Math.floor(levelNumber / 2.2));
    
    // Rotate instruction types
    const instructions: Array<NonNullable<LevelConfig['config']['instructionType']>> = [
      'color', 'shape', 'size', 'odd', 'movement'
    ];
    // Simple levels get color/shape, higher levels get everything
    const subsetCount = Math.min(instructions.length, 2 + Math.floor(levelNumber / 4));
    const activeInstructions = instructions.slice(0, subsetCount);
    config.instructionType = activeInstructions[(levelNumber - 1) % activeInstructions.length];
    
    config.speed = levelNumber <= 6 ? 'slow' : (levelNumber <= 12 ? 'medium' : 'fast');
  } 
  
  else if (challengeType === 'sound-guess') {
    // Pick a sound from the pool
    const soundIndex = (levelNumber - 1) % CHALLENGE_SOUNDS_POOL.length;
    config.soundId = CHALLENGE_SOUNDS_POOL[soundIndex].id;
    config.optionsCount = 4;
  }

  // Title and description generator
  let title = `Level ${levelNumber}`;
  let description = '';

  if (isBoss) {
    title = `🔥 BOSS LEVEL ${levelNumber}: `;
    if (levelNumber === 5) {
      title += 'Neon Shuffler';
      description = 'Buttons are moving and swapping positions rapidly. Click the REAL checkmark! Avoid the fake cross buttons!';
    } else if (levelNumber === 10) {
      title += 'Deep Memory Void';
      description = 'A massive grid of almost identical animal emojis. Look closely and remember their exact spots!';
    } else if (levelNumber === 15) {
      title += 'Chaos Kinetic Storm';
      description = 'Objects are moving at hyperspeed in random orbits! Click the correct size and shape combo immediately!';
    } else {
      title += 'Grand Finale Synth Master';
      description = 'The ultimate auditory assessment. Decipher the sound and respond with absolute precision before the final curtain falls!';
    }
  } else {
    if (challengeType === 'dont-click') {
      title = `Level ${levelNumber}: Focus Reflex`;
      description = `Find and click the SINGLE active green neon button. Avoid clicking any fake red buttons.`;
    } else if (challengeType === 'memory') {
      title = `Level ${levelNumber}: Flash Memory`;
      description = `Memorize the target emojis within ${((config.viewDuration || 3000)/1000).toFixed(1)}s, then retrieve them from the larger chaotic grid.`;
    } else if (challengeType === 'quick-reaction') {
      title = `Level ${levelNumber}: Cognitive Precision`;
      description = `Read the visual instructions carefully and click the matching shape/color. Watch out for tricks!`;
    } else if (challengeType === 'sound-guess') {
      title = `Level ${levelNumber}: Acoustic Guess`;
      description = `Listen closely to the synthesized sound effect and select the correct matching choice.`;
    }
  }

  return {
    levelNumber,
    challengeType,
    title,
    description,
    timerDuration: parseFloat(timerDuration.toFixed(1)),
    isBoss,
    config
  };
}
