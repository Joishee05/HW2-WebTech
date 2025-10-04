/**
 * Farmer class - main player character with movement and power-up system
 */

// Game area size (shared with other files)
const WIDTH = 900, HEIGHT = 540;

/**
 * Keep a number within a range.
 *
 */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Simple box vs. box collision 
 * Checks if two objects overlap on the canvas.
 */
const aabb = (a, b) => 
    a.x < b.x + b.w && 
    a.x + a.w > b.x && 
    a.y < b.y + b.h && 
    a.y + a.h > b.y;

/**
 * Base class for anything that shows up in the game world.
 * Farmer, crops, obstacles, etc. all extend this.
 */
class Entity {
    constructor(x, y, w, h) { 
        this.x = x; 
        this.y = y; 
        this.w = w; 
        this.h = h; 
        this.dead = false; 
    }
    
    update(dt, game) { }
    draw(ctx) { }
}

/**
 * Farmer = the player.
 * Handles movement, bumping into obstacles, and active power-ups.
 */
export class Farmer extends Entity {
    constructor(x, y) {
        super(x, y, 34, 34);
        this.baseSpeed = 260;
        this.speed = this.baseSpeed;
        this.vx = 0; 
        this.vy = 0;
        this.color = "#8b5a2b";  // farmer’s body
        
        // Power-ups (speed boost, scythe, etc.)
        this.activePowerUps = new Map(); // type - { timeLeft, data }
        this.hasScythe = false;
    }
    
    /**
     * Move farmer based on keyboard input
     */
    handleInput(input) {
        const L = input.keys.has("ArrowLeft"), R = input.keys.has("ArrowRight");
        const U = input.keys.has("ArrowUp"), D = input.keys.has("ArrowDown");
        this.vx = (R - L) * this.speed;
        this.vy = (D - U) * this.speed;
    }
    
    /**
     * Update farmer each frame:
     * - Check power-ups
     * - Move with collision detection
     */
    update(dt, game) {
        this.updatePowerUps(dt);
        
        const oldX = this.x, oldY = this.y;
        this.x = clamp(this.x + this.vx * dt, 0, WIDTH - this.w);
        this.y = clamp(this.y + this.vy * dt, 0, HEIGHT - this.h);
        
        // Stop movement if bumping into an obstacle
        if (game.obstacles.some(o => aabb(this, o))) {
            this.x = oldX; 
            this.y = oldY;
        }
    }
    
    /**
     * Tick down timers and apply power-up effects
     */
    updatePowerUps(dt) {
        this.speed = this.baseSpeed;
        this.hasScythe = false;
        
        // Arrow function keeps `this` pointing to Farmer
        this.activePowerUps.forEach((powerUp, type) => {
            powerUp.timeLeft -= dt;
            if (powerUp.timeLeft <= 0) {
                this.activePowerUps.delete(type);
            } else {
                if (type === "speed") {
                    this.speed = this.baseSpeed * powerUp.data.multiplier;
                } else if (type === "scythe") {
                    this.hasScythe = true;
                }
            }
        });
    }
    
    /**
     * Add a new power-up
     */
    addPowerUp(powerUp) {
        this.activePowerUps.set(powerUp.type, {
            timeLeft: powerUp.duration,
            data: powerUp.data
        });
    }
    
    /**
     * Draw farmer + visual effects for power-ups
     */
    draw(ctx) {
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // Hat
        ctx.fillStyle = "#c28e0e";
        ctx.fillRect(this.x + 4, this.y - 6, this.w - 8, 8);        // brim
        ctx.fillRect(this.x + 10, this.y - 18, this.w - 20, 12);    // top
        
        // Power-up indicators
        if (this.hasScythe) {
            ctx.strokeStyle = "#ff5722";
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 40, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        if (this.activePowerUps.has("speed")) {
            ctx.fillStyle = "#00bcd4";
            ctx.globalAlpha = 0.4;
            ctx.fillRect(this.x - 2, this.y + 8, 4, 18);
            ctx.fillRect(this.x + this.w - 2, this.y + 8, 4, 18);
            ctx.globalAlpha = 1;
        }
    }
}

// Export utilities for reuse
export { clamp, aabb, Entity };
