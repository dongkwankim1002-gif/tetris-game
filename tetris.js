// Tetris Game Engine
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;

// Tetromino Definitions (Shapes & Colors)
const TETROMINOES = {
    'I': {
        shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        color: '#00f0ff', // Cyan
        glow: 'rgba(0, 240, 255, 0.8)'
    },
    'J': {
        shape: [[1,0,0], [1,1,1], [0,0,0]],
        color: '#0044ff', // Blue
        glow: 'rgba(0, 68, 255, 0.8)'
    },
    'L': {
        shape: [[0,0,1], [1,1,1], [0,0,0]],
        color: '#ffaa00', // Orange
        glow: 'rgba(255, 170, 0, 0.8)'
    },
    'O': {
        shape: [[1,1], [1,1]],
        color: '#ffeb3b', // Yellow
        glow: 'rgba(255, 235, 59, 0.8)'
    },
    'S': {
        shape: [[0,1,1], [1,1,0], [0,0,0]],
        color: '#00ff66', // Green
        glow: 'rgba(0, 255, 102, 0.8)'
    },
    'T': {
        shape: [[0,1,0], [1,1,1], [0,0,0]],
        color: '#a000ff', // Purple
        glow: 'rgba(160, 0, 255, 0.8)'
    },
    'Z': {
        shape: [[1,1,0], [0,1,1], [0,0,0]],
        color: '#ff0055', // Red
        glow: 'rgba(255, 0, 85, 0.8)'
    }
};

class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('tetris-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);

        this.bag = [];
        this.currentPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.nextQueue = [];

        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.isPaused = false;
        this.isGameOver = true;

        this.particles = [];
        this.shakeTime = 0;

        this.updateUI();
        this.initEventListeners();
    }

    start() {
        audioEngine.init();
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.bag = [];
        this.nextQueue = [];
        this.holdPiece = null;
        this.canHold = true;
        this.isGameOver = false;
        this.isPaused = false;

        for (let i = 0; i < 3; i++) {
            this.nextQueue.push(this.generateNextPiece());
        }
        this.spawnPiece();
        this.updateUI();

        document.getElementById('game-overlay').classList.remove('active');
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    generateNextPiece() {
        if (this.bag.length === 0) {
            this.bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].sort(() => Math.random() - 0.5);
        }
        const type = this.bag.pop();
        return {
            type,
            shape: TETROMINOES[type].shape,
            color: TETROMINOES[type].color,
            glow: TETROMINOES[type].glow
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextQueue.shift();
        this.nextQueue.push(this.generateNextPiece());
        this.currentPiece.x = Math.floor((COLS - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;
        this.canHold = true;

        if (this.collide(this.currentPiece)) {
            this.gameOver();
        }
        this.drawHold();
        this.drawNext();
    }

    hold() {
        if (!this.canHold || this.isGameOver || this.isPaused) return;
        audioEngine.playRotate();
        const tempType = this.currentPiece.type;

        if (this.holdPiece === null) {
            this.holdPiece = tempType;
            this.spawnPiece();
        } else {
            this.currentPiece = {
                type: this.holdPiece,
                shape: TETROMINOES[this.holdPiece].shape,
                color: TETROMINOES[this.holdPiece].color,
                glow: TETROMINOES[this.holdPiece].glow,
                x: Math.floor((COLS - TETROMINOES[this.holdPiece].shape[0].length) / 2),
                y: 0
            };
            this.holdPiece = tempType;
        }
        this.canHold = false;
        this.drawHold();
    }

    collide(piece, offsetX = 0, offsetY = 0, customShape = null) {
        const shape = customShape || piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newX = piece.x + c + offsetX;
                    const newY = piece.y + r + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    if (newY >= 0 && this.grid[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    rotate(dir = 1) {
        if (this.isGameOver || this.isPaused) return;
        const shape = this.currentPiece.shape;
        const rotated = shape[0].map((_, i) => shape.map(row => row[i]));
        if (dir === 1) rotated.forEach(row => row.reverse());
        else rotated.reverse();

        let offset = 0;
        if (!this.collide(this.currentPiece, 0, 0, rotated)) {
            this.currentPiece.shape = rotated;
            audioEngine.playRotate();
            return;
        }
        // Basic Wall Kicks
        if (!this.collide(this.currentPiece, -1, 0, rotated)) {
            this.currentPiece.x -= 1;
            this.currentPiece.shape = rotated;
            audioEngine.playRotate();
            return;
        }
        if (!this.collide(this.currentPiece, 1, 0, rotated)) {
            this.currentPiece.x += 1;
            this.currentPiece.shape = rotated;
            audioEngine.playRotate();
            return;
        }
    }

    move(dir) {
        if (this.isGameOver || this.isPaused) return;
        if (!this.collide(this.currentPiece, dir, 0)) {
            this.currentPiece.x += dir;
            audioEngine.playMove();
        }
    }

    drop() {
        if (this.isGameOver || this.isPaused) return;
        if (!this.collide(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            this.score += 1;
            this.updateUI();
        } else {
            this.lockPiece();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        if (this.isGameOver || this.isPaused) return;
        let drops = 0;
        while (!this.collide(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            drops++;
        }
        this.score += drops * 2;
        audioEngine.playDrop();
        this.shakeTime = 10;
        this.lockPiece();
    }

    getGhostPosition() {
        if (!this.currentPiece) return null;
        const ghost = { ...this.currentPiece, y: this.currentPiece.y };
        while (!this.collide(ghost, 0, 1)) {
            ghost.y++;
        }
        return ghost;
    }

    lockPiece() {
        const shape = this.currentPiece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const gridY = this.currentPiece.y + r;
                    const gridX = this.currentPiece.x + c;
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = {
                            color: this.currentPiece.color,
                            glow: this.currentPiece.glow
                        };
                    }
                }
            }
        }
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every(cell => cell !== null)) {
                this.createParticles(r);
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(null));
                cleared++;
                r++; // Re-check line at current index
            }
        }

        if (cleared > 0) {
            this.lines += cleared;
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[cleared] * this.level;

            if (cleared === 4) {
                audioEngine.playTetris();
                this.shakeTime = 20;
            } else {
                audioEngine.playClear();
            }

            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
            }
            this.updateUI();
        }
    }

    createParticles(row) {
        for (let c = 0; c < COLS; c++) {
            const cell = this.grid[row][c];
            const color = cell ? cell.color : '#00f0ff';
            for (let p = 0; p < 6; p++) {
                this.particles.push({
                    x: c * BLOCK_SIZE + BLOCK_SIZE / 2,
                    y: row * BLOCK_SIZE + BLOCK_SIZE / 2,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    color: color,
                    alpha: 1,
                    size: Math.random() * 6 + 2
                });
            }
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.03;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        audioEngine.playGameOver();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetris_high_score', this.highScore.toString());
        }
        document.getElementById('overlay-title').innerText = 'GAME OVER';
        document.getElementById('overlay-desc').innerText = `Final Score: ${this.score}`;
        document.getElementById('start-btn').innerText = 'TRY AGAIN';
        document.getElementById('game-overlay').classList.add('active');
        this.updateUI();
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('game-overlay');
        if (this.isPaused) {
            document.getElementById('overlay-title').innerText = 'PAUSED';
            document.getElementById('overlay-desc').innerText = 'Take a breather!';
            document.getElementById('start-btn').innerText = 'RESUME';
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    updateUI() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('high-score').innerText = this.highScore;
        document.getElementById('level').innerText = this.level;
        document.getElementById('lines').innerText = this.lines;
    }

    gameLoop(time = 0) {
        if (this.isGameOver || this.isPaused) return;
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }

        this.updateParticles();
        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    draw() {
        this.ctx.save();
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * 8;
            const dy = (Math.random() - 0.5) * 8;
            this.ctx.translate(dx, dy);
            this.shakeTime--;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid Lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Draw Matrix Blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c]) {
                    this.drawBlock(this.ctx, c, r, this.grid[r][c].color, this.grid[r][c].glow);
                }
            }
        }

        // Draw Ghost Piece
        if (this.currentPiece) {
            const ghost = this.getGhostPosition();
            if (ghost) {
                const shape = ghost.shape;
                for (let r = 0; r < shape.length; r++) {
                    for (let c = 0; c < shape[r].length; c++) {
                        if (shape[r][c]) {
                            this.drawGhostBlock(this.ctx, ghost.x + c, ghost.y + r, this.currentPiece.color);
                        }
                    }
                }
            }

            // Draw Current Piece
            const shape = this.currentPiece.shape;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawBlock(this.ctx, this.currentPiece.x + c, this.currentPiece.y + r, this.currentPiece.color, this.currentPiece.glow);
                    }
                }
            }
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            this.ctx.restore();
        });

        this.ctx.restore();
    }

    drawBlock(ctx, x, y, color, glowColor, size = BLOCK_SIZE) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = glowColor || color;
        ctx.shadowBlur = 10;
        ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
        // Bevel / Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * size + 2, y * size + 2, size - 4, 3);
        ctx.restore();
    }

    drawGhostBlock(ctx, x, y, color, size = BLOCK_SIZE) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
        ctx.restore();
    }

    drawHold() {
        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        if (!this.holdPiece) return;
        const info = TETROMINOES[this.holdPiece];
        const shape = info.shape;
        const miniSize = 24;
        const offsetX = (this.holdCanvas.width - shape[0].length * miniSize) / 2;
        const offsetY = (this.holdCanvas.height - shape.length * miniSize) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    this.drawMiniBlock(this.holdCtx, offsetX + c * miniSize, offsetY + r * miniSize, info.color, miniSize);
                }
            }
        }
    }

    drawNext() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const miniSize = 24;
        this.nextQueue.forEach((piece, index) => {
            const shape = piece.shape;
            const offsetX = (this.nextCanvas.width - shape[0].length * miniSize) / 2;
            const offsetY = 20 + index * 90;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawMiniBlock(this.nextCtx, offsetX + c * miniSize, offsetY + r * miniSize, piece.color, miniSize);
                    }
                }
            }
        });
    }

    drawMiniBlock(ctx, x, y, color, size) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        ctx.restore();
    }

    initEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.isGameOver && e.code !== 'Space') return;
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.move(-1);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.move(1);
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.drop();
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.rotate(1);
                    break;
                case 'KeyZ':
                    this.rotate(-1);
                    break;
                case 'Space':
                    if (this.isGameOver) this.start();
                    else this.hardDrop();
                    break;
                case 'KeyC':
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.hold();
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
            }
        });

        // Overlay & Buttons
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.isPaused) this.togglePause();
            else this.start();
        });
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('sound-btn').addEventListener('click', (e) => {
            audioEngine.enabled = !audioEngine.enabled;
            e.target.innerText = audioEngine.enabled ? '🔊' : '🔇';
        });

        // Theme Switcher
        const themes = ['default', 'retro', 'pastel'];
        let currentThemeIndex = 0;
        document.getElementById('theme-btn').addEventListener('click', () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const theme = themes[currentThemeIndex];
            if (theme === 'default') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', theme);
        });

        // Touch Controls
        document.getElementById('touch-left').addEventListener('click', () => this.move(-1));
        document.getElementById('touch-right').addEventListener('click', () => this.move(1));
        document.getElementById('touch-down').addEventListener('click', () => this.drop());
        document.getElementById('touch-rotate').addEventListener('click', () => this.rotate(1));
        document.getElementById('touch-drop').addEventListener('click', () => this.hardDrop());
        document.getElementById('touch-hold').addEventListener('click', () => this.hold());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new TetrisGame();
});
