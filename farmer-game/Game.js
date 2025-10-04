/**
 * @fileoverview Main Game class — handles logic, state, and rendering.
 * 
 * 
/**
 * @fileoverview Main Game class with game logic, state management, and rendering
 * 
 * THIS BINDING PATTERNS DEMONSTRATED:
 * 
 * (a) ARROW FUNCTIONS - All anonymous callbacks converted to arrow functions:
 *     - Lexically capture `this` from enclosing scope at definition time
 *     - Used in: RAF loop, UI event listeners, array method callbacks (filter, forEach, map)
 *     - Example: this.tick = (ts) => { ... } preserves Game instance as `this`
 *     - Example: this.crops.forEach(c => c.update(dt, this)) preserves Game `this`
 * 
 * (b) .BIND() REQUIRED CONTEXTS - Two places where .bind(this) is necessary:
 *     1. Event listeners that require cleanup via removeEventListener (Game._onResize, Input._onKeyDown/_onKeyUp)
 *     2. Must use same function reference for add/remove operations
 *     - Arrow functions would create new instances, preventing proper cleanup
 *     - Example: this._onResize = this.onResize.bind(this)
 * 
 * (c) THREE EXPLICIT `this` BINDING CONTEXTS:
 *     1. RAF LOOP: Arrow function preserves Game instance as `this` 
 *        - requestAnimationFrame would otherwise bind `this` to window
 *     2. EVENT LISTENERS: Arrow functions vs .bind() patterns
 *        - UI buttons use arrows for lexical capture
 *        - Cleanup-required listeners use .bind() for method references  
 *     3. METHOD REFERENCES: Direct method calls maintain class instance as `this`
 *        - this.player.update(dt, this) - `this` in update() is the player
 *        - Each entity's draw/update methods get the entity as `this`
 */

import { Farmer, clamp, aabb } from './Farmer.js';
import { Crop, PowerUp, Scarecrow, Input } from './Crop.js';

// Game constants
const WIDTH = 900, HEIGHT = 540;
const TILE = 30;           // grid spacing
const GAME_LEN = 60;       // seconds per round
const GOAL = 15;           // points needed to win

const State = Object.freeze({ 
    MENU: "MENU", 
    PLAYING: "PLAYING", 
    PAUSED: "PAUSED", 
    GAME_OVER: "GAME_OVER", 
    WIN: "WIN" 
});

export class Game {
    constructor(canvas) {
        if (!canvas) {
            console.error("Canvas #game not found. Check index.html IDs.");
            return;
        }
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.state = State.MENU;

        // World entities
        this.player = new Farmer(WIDTH / 2 - 17, HEIGHT - 80);
        this.crops = [];
        this.powerUps = [];
        this.obstacles = [];
        this.pointTexts = []; // floating +score effects

        // Timing
        this.lastTime = 0;
        this.timeLeft = GAME_LEN;
        this.spawnEvery = 0.8;
        this.powerUpSpawnEvery = 12;
        this._accumSpawn = 0;
        this._accumPowerUpSpawn = 0;

        // Score & goal
        this.score = 0;
        this.goal = GOAL;

        // Input & resize
        this.input = new Input(this);
        // Bound handler so we can later remove it in dispose()
        this._onResize = this.onResize.bind(this);
        window.addEventListener("resize", this._onResize);

        // UI
        const get = id => document.getElementById(id) || console.error(`#${id} not found`);
        this.ui = {
            score: get("score"),
            time: get("time"),
            goal: get("goal"),
            status: get("status"),
            powerUpStatus: get("powerUpStatus"),
            start: get("btnStart"),
            reset: get("btnReset"),
        };
        if (this.ui.goal) this.ui.goal.textContent = String(this.goal);

        // Buttons use arrows so they keep `this` as the Game
        if (this.ui.start) this.ui.start.addEventListener("click", () => this.start());
        if (this.ui.reset) this.ui.reset.addEventListener("click", () => this.reset());

        // Main game loop (arrow keeps `this` bound to the Game)
        this.tick = (ts) => {
            const dt = Math.min((ts - this.lastTime) / 1000, 0.033); // cap ~30ms
            this.lastTime = ts;
            this.update(dt);
            this.render();
            requestAnimationFrame(this.tick);
        };
    }

    onResize() {
        // Keeping canvas fixed size for now
        // (could add scaling for high-DPI here)
    }

    start() {
        if (this.state === State.MENU || this.state === State.GAME_OVER || this.state === State.WIN) {
            this.reset();
            this.state = State.PLAYING;
            if (this.ui.status) this.ui.status.textContent = "Playing…";
            requestAnimationFrame(this.tick);
        } else if (this.state === State.PAUSED) {
            this.state = State.PLAYING;
            if (this.ui.status) this.ui.status.textContent = "Playing…";
        }
    }

    reset() {
        this.state = State.MENU;
        this.player = new Farmer(WIDTH / 2 - 17, HEIGHT - 80);
        this.crops.length = 0;
        this.powerUps.length = 0;
        this.obstacles.length = 0;
        this.pointTexts.length = 0;
        this.score = 0;
        this.timeLeft = GAME_LEN;
        this._accumSpawn = 0;
        this._accumPowerUpSpawn = 0;
        this.lastTime = performance.now();

        // Add some obstacles
        this.obstacles.push(new Scarecrow(200, 220), new Scarecrow(650, 160));

        this.syncUI();
        if (this.ui.status) this.ui.status.textContent = "Menu";
    }

    togglePause() {
        if (this.state === State.PLAYING) {
            this.state = State.PAUSED;
            if (this.ui.status) this.ui.status.textContent = "Paused";
        } else if (this.state === State.PAUSED) {
            this.state = State.PLAYING;
            if (this.ui.status) this.ui.status.textContent = "Playing…";
        }
    }

    syncUI() {
        if (this.ui.score) this.ui.score.textContent = String(this.score);
        if (this.ui.time) this.ui.time.textContent = Math.ceil(this.timeLeft);
        if (this.ui.goal) this.ui.goal.textContent = String(this.goal);
        this.updatePowerUpUI();
    }

    updatePowerUpUI() {
        if (!this.ui.powerUpStatus) return;
        
        const activePowerUps = Array.from(this.player.activePowerUps.entries());
        if (activePowerUps.length === 0) {
            this.ui.powerUpStatus.textContent = "";
            this.ui.powerUpStatus.className = "power-up-status";
        } else {
            const statusText = activePowerUps.map(([type, powerUp]) => {
                const timeLeft = Math.ceil(powerUp.timeLeft);
                return `${powerUp.data.effect}: ${timeLeft}s`;
            }).join(" | ");
            
            this.ui.powerUpStatus.textContent = statusText;
            this.ui.powerUpStatus.className = "power-up-status active";
        }
    }

    spawnCrop() {
        const gx = Math.floor(Math.random() * ((WIDTH - 2 * TILE) / TILE)) * TILE + TILE;
        const gy = Math.floor(Math.random() * ((HEIGHT - 2 * TILE) / TILE)) * TILE + TILE;
        
        // Random rarity
        const rand = Math.random();
        let cropType = rand < 0.7 ? "wheat" : rand < 0.9 ? "pumpkin" : "goldenApple";
        
        this.crops.push(new Crop(gx, gy, cropType));
    }
    
    spawnPowerUp() {
        const gx = Math.floor(Math.random() * ((WIDTH - 2 * TILE) / TILE)) * TILE + TILE;
        const gy = Math.floor(Math.random() * ((HEIGHT - 2 * TILE) / TILE)) * TILE + TILE;
        const types = ["speed", "scythe"];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerUps.push(new PowerUp(gx, gy, type));
    }

    update(dt) {
        if (this.state !== State.PLAYING) return;

        // Countdown timer
        this.timeLeft = clamp(this.timeLeft - dt, 0, GAME_LEN);
        if (this.timeLeft <= 0) {
            this.state = (this.score >= this.goal) ? State.WIN : State.GAME_OVER;
            if (this.ui.status) this.ui.status.textContent = 
                (this.state === State.WIN) ? "You Win!" : "Game Over";
            this.syncUI();
            return;
        }

        // Player input & movement
        this.player.handleInput(this.input);
        this.player.update(dt, this);

        // Spawning crops & powerups
        this._accumSpawn += dt;
        while (this._accumSpawn >= this.spawnEvery) {
            this._accumSpawn -= this.spawnEvery;
            this.spawnCrop();
        }
        this._accumPowerUpSpawn += dt;
        while (this._accumPowerUpSpawn >= this.powerUpSpawnEvery) {
            this._accumPowerUpSpawn -= this.powerUpSpawnEvery;
            this.spawnPowerUp();
        }

        // Crop collection (normal vs scythe area effect)
        let collectedCrops;
        if (this.player.hasScythe) {
            const scytheRange = 80;
            collectedCrops = this.crops.filter(c => {
                const dx = (this.player.x + this.player.w / 2) - (c.x + c.w / 2);
                const dy = (this.player.y + this.player.h / 2) - (c.y + c.h / 2);
                return Math.sqrt(dx * dx + dy * dy) <= scytheRange;
            });
        } else {
            collectedCrops = this.crops.filter(c => aabb(this.player, c));
        }
        
        if (collectedCrops.length) {
            collectedCrops.forEach(c => {
                c.dead = true;
                this.pointTexts.push({
                    x: c.x + c.w / 2,
                    y: c.y,
                    points: c.value,
                    life: 1,
                    color: c.data.headColor
                });
            });
            const points = collectedCrops.reduce((sum, c) => sum + c.value, 0);
            this.score += points;
            if (this.ui.score) this.ui.score.textContent = String(this.score);
            if (this.score >= this.goal) {
                this.state = State.WIN;
                if (this.ui.status) this.ui.status.textContent = "You Win!";
            }
        }
        
        // Power-up collection
        const collectedPowerUps = this.powerUps.filter(p => aabb(this.player, p));
        if (collectedPowerUps.length) {
            collectedPowerUps.forEach(p => {
                p.dead = true;
                this.player.addPowerUp(p);
            });
        }

        // Clean up dead entities & update others
        this.crops = this.crops.filter(c => !c.dead);
        this.powerUps = this.powerUps.filter(p => !p.dead);
        this.crops.forEach(c => c.update(dt, this));
        this.powerUps.forEach(p => p.update(dt, this));
        
        // Floating score text updates
        this.pointTexts.forEach(pt => {
            pt.life -= dt * 2;
            pt.y -= dt * 30;
        });
        this.pointTexts = this.pointTexts.filter(pt => pt.life > 0);

        // Update UI
        if (this.ui.time) this.ui.time.textContent = Math.ceil(this.timeLeft);
        this.updatePowerUpUI();
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Background grid
        ctx.fillStyle = "#dff0d5";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.strokeStyle = "#c7e0bd";
        ctx.lineWidth = 1;
        for (let y = TILE; y < HEIGHT; y += TILE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }
        for (let x = TILE; x < WIDTH; x += TILE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }

        // Entities
        this.crops.forEach(c => c.draw(ctx));
        this.powerUps.forEach(p => p.draw(ctx));
        this.obstacles.forEach(o => o.draw(ctx));
        this.player.draw(ctx);

        // Floating +points
        this.pointTexts.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.font = "bold 16px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`+${pt.points}`, pt.x, pt.y);
            ctx.globalAlpha = 1;
            ctx.textAlign = "left";
        });

        // State labels
        ctx.fillStyle = "#333";
        ctx.font = "16px system-ui, sans-serif";
        if (this.state === State.MENU) {
            ctx.fillText("Press Start to play", 20, 28);
        } else if (this.state === State.PAUSED) {
            ctx.fillText("Paused (press P to resume)", 20, 28);
        } else if (this.state === State.GAME_OVER) {
            ctx.fillText("Time up! Press Reset to return to Menu", 20, 28);
        } else if (this.state === State.WIN) {
            ctx.fillText("Harvest complete! Press Reset for another round", 20, 28);
        }
    }

    dispose() {
        this.input.dispose();
        // Only works because we stored the bound reference earlier
        window.removeEventListener("resize", this._onResize);
    }
}
