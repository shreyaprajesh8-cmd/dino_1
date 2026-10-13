// Cyber Dino Runner Logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreText = document.getElementById('scoreText');
const highScoreText = document.getElementById('highScoreText');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreMsg = document.getElementById('finalScoreMsg');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
const touchJumpBtn = document.getElementById('touchJumpBtn');
const touchDuckBtn = document.getElementById('touchDuckBtn');

// Audio Synthesizer (Web Audio API - No external asset dependencies)
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function playTone(freq, type = 'square', duration = 0.1, vol = 0.1) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play prevented:", e);
  }
}

function playJumpSound() {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function playScoreSound() {
  if (!soundEnabled) return;
  playTone(880, 'triangle', 0.1, 0.15);
  setTimeout(() => playTone(1174.66, 'triangle', 0.15, 0.15), 100);
}

function playHitSound() {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {}
}

// Game State
let isPlaying = false;
let isGameOver = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('cyber_dino_high') || '0', 10);
let gameSpeed = 6;
let baseSpeed = 6;
let maxSpeed = 14;
let animationFrameId = null;
let lastTime = 0;

// Ground Constants
const GROUND_Y = 240;

// High score initial display
highScoreText.textContent = String(highScore).padStart(5, '0');

// Dino Object
const dino = {
  x: 60,
  y: GROUND_Y - 44,
  width: 44,
  height: 46,
  standingHeight: 46,
  duckingHeight: 26,
  vy: 0,
  gravity: 0.82,
  jumpStrength: -13.5,
  isJumping: false,
  isDucking: false,
  legStep: 0,
  stepTimer: 0,

  reset() {
    this.y = GROUND_Y - this.standingHeight;
    this.height = this.standingHeight;
    this.vy = 0;
    this.isJumping = false;
    this.isDucking = false;
  },

  jump() {
    if (!this.isJumping && !this.isDucking) {
      this.vy = this.jumpStrength;
      this.isJumping = true;
      playJumpSound();
    }
  },

  duck(state) {
    if (this.isJumping) return;
    this.isDucking = state;
    if (state) {
      this.height = this.duckingHeight;
      this.y = GROUND_Y - this.duckingHeight;
    } else {
      this.height = this.standingHeight;
      this.y = GROUND_Y - this.standingHeight;
    }
  },

  update() {
    // Jump physics
    if (this.isJumping) {
      this.y += this.vy;
      this.vy += this.gravity;

      const targetFloor = GROUND_Y - this.height;
      if (this.y >= targetFloor) {
        this.y = targetFloor;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Step cycle animation
    this.stepTimer++;
    if (this.stepTimer > 6) {
      this.legStep = (this.legStep + 1) % 2;
      this.stepTimer = 0;
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;

    const x = this.x;
    const y = this.y;

    if (this.isDucking) {
      // Ducking Dino Form
      // Body (elongated horizontal)
      ctx.fillRect(x, y + 6, 52, 16);
      // Head
      ctx.fillRect(x + 36, y, 22, 16);
      // Eye
      ctx.fillStyle = '#060913';
      ctx.fillRect(x + 48, y + 4, 4, 4);
      ctx.fillStyle = '#00f2fe';
      // Tail
      ctx.fillRect(x - 8, y + 8, 10, 6);
      // Legs
      if (this.legStep === 0) {
        ctx.fillRect(x + 14, y + 20, 6, 6);
        ctx.fillRect(x + 32, y + 18, 6, 8);
      } else {
        ctx.fillRect(x + 14, y + 18, 6, 8);
        ctx.fillRect(x + 32, y + 20, 6, 6);
      }
    } else {
      // Standing Dino Form
      // Head & Snout
      ctx.fillRect(x + 20, y, 24, 18);
      ctx.fillRect(x + 14, y + 10, 8, 14); // Neck
      // Eye
      ctx.fillStyle = '#060913';
      ctx.fillRect(x + 34, y + 4, 4, 4);
      ctx.fillStyle = '#00f2fe';
      // Body
      ctx.fillRect(x + 6, y + 18, 26, 18);
      // Tail
      ctx.fillRect(x - 4, y + 22, 12, 8);
      ctx.fillRect(x - 8, y + 26, 6, 4);
      // Small Arm
      ctx.fillRect(x + 28, y + 22, 8, 4);

      // Legs / Running cycle
      if (this.isJumping) {
        ctx.fillRect(x + 10, y + 36, 6, 8);
        ctx.fillRect(x + 22, y + 36, 6, 8);
      } else {
        if (this.legStep === 0) {
          ctx.fillRect(x + 10, y + 36, 6, 10);
          ctx.fillRect(x + 22, y + 36, 6, 6);
        } else {
          ctx.fillRect(x + 10, y + 36, 6, 6);
          ctx.fillRect(x + 22, y + 36, 6, 10);
        }
      }
    }
    ctx.restore();
  }
};

// Obstacles Management
let obstacles = [];
let obstacleTimer = 0;
let minObstacleDistance = 90;

class Cactus {
  constructor(speed) {
    this.speed = speed;
    this.type = 'cactus';
    this.variant = Math.random() > 0.4 ? 'single' : (Math.random() > 0.5 ? 'double' : 'triple');
    
    if (this.variant === 'single') {
      this.width = 20;
      this.height = 42;
    } else if (this.variant === 'double') {
      this.width = 38;
      this.height = 44;
    } else {
      this.width = 54;
      this.height = 40;
    }
    this.x = canvas.width + 20;
    this.y = GROUND_Y - this.height;
  }

  update() {
    this.x -= this.speed;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;

    if (this.variant === 'single') {
      // Main trunk
      ctx.fillRect(this.x + 6, this.y, 8, this.height);
      // Left arm
      ctx.fillRect(this.x, this.y + 12, 6, 14);
      ctx.fillRect(this.x, this.y + 12, 10, 4);
      // Right arm
      ctx.fillRect(this.x + 14, this.y + 8, 6, 14);
      ctx.fillRect(this.x + 10, this.y + 18, 8, 4);
    } else if (this.variant === 'double') {
      // Two grouped cacti
      ctx.fillRect(this.x + 4, this.y + 4, 8, this.height - 4);
      ctx.fillRect(this.x + 22, this.y, 10, this.height);
      ctx.fillRect(this.x, this.y + 14, 6, 10);
      ctx.fillRect(this.x + 30, this.y + 12, 6, 12);
    } else {
      // Triple small patch
      ctx.fillRect(this.x + 4, this.y + 8, 8, this.height - 8);
      ctx.fillRect(this.x + 20, this.y, 10, this.height);
      ctx.fillRect(this.x + 38, this.y + 6, 8, this.height - 6);
    }
    ctx.restore();
  }
}

class Pterodactyl {
  constructor(speed) {
    this.speed = speed * 1.08;
    this.type = 'bird';
    this.width = 44;
    this.height = 30;
    this.x = canvas.width + 30;
    
    // Fly at high (jump), mid (duck), or low height
    const heights = [GROUND_Y - 26, GROUND_Y - 58, GROUND_Y - 76];
    this.y = heights[Math.floor(Math.random() * heights.length)];
    this.wingCycle = 0;
    this.cycleTimer = 0;
  }

  update() {
    this.x -= this.speed;
    this.cycleTimer++;
    if (this.cycleTimer > 8) {
      this.wingCycle = 1 - this.wingCycle;
      this.cycleTimer = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;

    const x = this.x;
    const y = this.y;

    // Body & Beak
    ctx.fillRect(x + 14, y + 10, 22, 10);
    ctx.fillRect(x + 34, y + 12, 10, 4); // Beak
    ctx.fillRect(x + 2, y + 12, 12, 6);  // Tail

    // Wing flapping
    if (this.wingCycle === 0) {
      // Wings up
      ctx.fillRect(x + 18, y, 10, 10);
      ctx.fillRect(x + 14, y + 2, 6, 8);
    } else {
      // Wings down
      ctx.fillRect(x + 18, y + 18, 10, 10);
      ctx.fillRect(x + 14, y + 16, 6, 8);
    }
    ctx.restore();
  }
}

// Background Elements (Grid & Clouds/Particles)
let clouds = [
  { x: 120, y: 50, speed: 0.8, scale: 1 },
  { x: 420, y: 70, speed: 0.6, scale: 0.8 },
  { x: 740, y: 40, speed: 1.0, scale: 1.2 }
];

let groundOffset = 0;

function drawBackground() {
  // Horizon gradient line
  const horizonGrad = ctx.createLinearGradient(0, GROUND_Y, canvas.width, GROUND_Y);
  horizonGrad.addColorStop(0, 'rgba(0, 242, 254, 0.2)');
  horizonGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.4)');
  horizonGrad.addColorStop(1, 'rgba(0, 242, 254, 0.2)');
  ctx.strokeStyle = horizonGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  // Futuristic ground lines
  groundOffset = (groundOffset + gameSpeed) % 40;
  ctx.strokeStyle = 'rgba(79, 172, 254, 0.25)';
  ctx.lineWidth = 1;
  for (let x = -groundOffset; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 20, canvas.height);
    ctx.stroke();
  }

  // Floating Cyber Clouds / Data Clusters
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x < -100) cloud.x = canvas.width + 50;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(cloud.x, cloud.y, 60 * cloud.scale, 16 * cloud.scale, 8);
    ctx.roundRect(cloud.x + 14 * cloud.scale, cloud.y - 10 * cloud.scale, 32 * cloud.scale, 18 * cloud.scale, 8);
    ctx.fill();
    ctx.restore();
  });
}

// Collision Detection (Hitbox calculation with slight forgiveness)
function checkCollision(dino, obstacle) {
  const dinoPaddingX = 6;
  const dinoPaddingY = 4;
  
  const dLeft = dino.x + dinoPaddingX;
  const dRight = dino.x + (dino.isDucking ? 52 : dino.width) - dinoPaddingX;
  const dTop = dino.y + dinoPaddingY;
  const dBottom = dino.y + dino.height - 2;

  const oLeft = obstacle.x + 4;
  const oRight = obstacle.x + obstacle.width - 4;
  const oTop = obstacle.y + 4;
  const oBottom = obstacle.y + obstacle.height;

  return !(
    dRight < oLeft ||
    dLeft > oRight ||
    dBottom < oTop ||
    dTop > oBottom
  );
}

// Particle system for impact/dust
let particles = [];
function addParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.7) * 8,
      size: Math.random() * 4 + 2,
      life: 1,
      color
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.035;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
}

// Game Control
function startGame() {
  initAudio();
  isPlaying = true;
  isGameOver = false;
  score = 0;
  gameSpeed = baseSpeed;
  obstacles = [];
  particles = [];
  obstacleTimer = 0;
  dino.reset();

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  lastTime = performance.now();
  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
  isPlaying = false;
  isGameOver = true;
  playHitSound();

  // Burst explosion
  addParticles(dino.x + 20, dino.y + 20, '#ff007f', 24);
  addParticles(dino.x + 20, dino.y + 20, '#00f2fe', 16);

  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('cyber_dino_high', highScore.toString());
    highScoreText.textContent = String(highScore).padStart(5, '0');
  }

  finalScoreMsg.textContent = `You survived with a score of ${Math.floor(score)} points!`;
  gameOverOverlay.classList.remove('hidden');
}

function gameLoop(timestamp) {
  if (!isPlaying) {
    // Keep rendering particles on death
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    dino.draw(ctx);
    obstacles.forEach(o => o.draw(ctx));
    updateAndDrawParticles();
    return;
  }

  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Clear Screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  drawBackground();

  // Speed Progression & Score
  score += 0.15;
  const currentIntScore = Math.floor(score);
  scoreText.textContent = String(currentIntScore).padStart(5, '0');

  // Milestone chime every 100 points
  if (currentIntScore > 0 && currentIntScore % 100 === 0 && Math.abs(score - currentIntScore) < 0.16) {
    playScoreSound();
  }

  // Gradually increase difficulty
  if (gameSpeed < maxSpeed) {
    gameSpeed += 0.001;
  }

  // Obstacle Spawning
  obstacleTimer++;
  const spawnThreshold = Math.max(50, 110 - Math.floor(gameSpeed * 4));
  if (obstacleTimer > spawnThreshold) {
    const minGap = 200;
    const lastObs = obstacles[obstacles.length - 1];
    
    if (!lastObs || (canvas.width - lastObs.x) > minGap) {
      if (Math.random() < 0.45) {
        // Spawn Bird only after score 120
        if (score > 120 && Math.random() > 0.6) {
          obstacles.push(new Pterodactyl(gameSpeed));
        } else {
          obstacles.push(new Cactus(gameSpeed));
        }
        obstacleTimer = 0;
      }
    }
  }

  // Update & Draw Obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.speed = gameSpeed;
    obs.update();
    obs.draw(ctx);

    // Collision check
    if (checkCollision(dino, obs)) {
      gameOver();
      return;
    }

    // Remove off-screen obstacles
    if (obs.x + obs.width < -30) {
      obstacles.splice(i, 1);
    }
  }

  // Update Dino
  dino.update();
  dino.draw(ctx);

  // Particles
  updateAndDrawParticles();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Input Handlers
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!isPlaying && isGameOver) {
      startGame();
    } else if (!isPlaying) {
      startGame();
    } else {
      dino.jump();
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (isPlaying) {
      dino.duck(true);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// Canvas Click to Jump
canvas.addEventListener('pointerdown', (e) => {
  if (!isPlaying && !isGameOver) {
    startGame();
  } else if (isPlaying) {
    dino.jump();
  }
});

// Button events
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Sound Toggle
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggleBtn.title = soundEnabled ? 'Mute Sound' : 'Enable Sound';
});

// Mobile Controls
touchJumpBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!isPlaying) startGame();
  else dino.jump();
});
touchJumpBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (!isPlaying) startGame();
  else dino.jump();
});

touchDuckBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  dino.duck(true);
});
touchDuckBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  dino.duck(false);
});
touchDuckBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  dino.duck(true);
});
touchDuckBtn.addEventListener('mouseup', (e) => {
  e.preventDefault();
  dino.duck(false);
});

// Initial canvas draw preview
function drawInitialPreview() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  dino.draw(ctx);
}
drawInitialPreview();
