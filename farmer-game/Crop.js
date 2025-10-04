/**
 * @fileoverview Crop, PowerUp, Scarecrow, and Input classes

 */

import { Entity } from './Farmer.js';

/**
 * Crop class - collectible items (wheat, pumpkin, golden apple)
 */
export class Crop extends Entity {
    constructor(x, y, type = "wheat") {
        super(x, y, 20, 26);
        this.type = type;
        this.sway = Math.random() * Math.PI * 2; // makes crops wiggle a little

        // What each crop is worth + how it looks
        this.cropData = {
            wheat: { value: 1, size: 8, stemColor: "#2f7d32", headColor: "#d9a441" },
            pumpkin: { value: 3, size: 12, stemColor: "#4a7c59", headColor: "#ff6f00" },
            goldenApple: { value: 5, size: 10, stemColor: "#2f7d32", headColor: "#ffd700" }
        };

        this.data = this.cropData[type] || this.cropData.wheat;
        this.value = this.data.value;
    }

    update(dt, game) {
        // make the crop sway over time
        this.sway += dt * 2;
    }

    draw(ctx) {
        const { x, y, w, h } = this;
        const data = this.data;

        // stem
        ctx.strokeStyle = data.stemColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.quadraticCurveTo(x + w / 2 + Math.sin(this.sway) * 3, y + h / 2, x + w / 2, y);
        ctx.stroke();

        // head depends on type
        if (this.type === "pumpkin") {
            // pumpkin = orange circle with little ridges
            ctx.fillStyle = data.headColor;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + 4, data.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#e65100";
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                ctx.beginPath();
                ctx.arc(x + w / 2, y + 4, data.size - 2, angle - 0.2, angle + 0.2);
                ctx.stroke();
            }
        } else if (this.type === "goldenApple") {
            // shiny golden apple with a leaf
            ctx.fillStyle = data.headColor;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + 2, data.size, 0, Math.PI * 2);
            ctx.fill();

            // shimmer
            ctx.fillStyle = "#ffef3d";
            ctx.beginPath();
            ctx.arc(x + w / 2 - 3, y - 1, 3, 0, Math.PI * 2);
            ctx.fill();

            // leaf
            ctx.fillStyle = "#4caf50";
            ctx.beginPath();
            ctx.ellipse(x + w / 2 + 4, y - 4, 3, 6, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // wheat (default)
            ctx.fillStyle = data.headColor;
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y, data.size, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * PowerUps → temporary buffs (speed boost, scythe)
 */
export class PowerUp extends Entity {
    constructor(x, y, type = "speed") {
        super(x, y, 24, 24);
        this.type = type;
        this.duration = 8; // seconds
        this.pulse = 0;    // visual pulse effect

        this.powerData = {
            speed: { color: "#00bcd4", effect: "Speed Boost", multiplier: 1.8 },
            scythe: { color: "#ff5722", effect: "Scythe", range: 80 }
        };

        this.data = this.powerData[type] || this.powerData.speed;
    }

    update(dt, game) {
        this.pulse += dt * 4; // animate glow faster for visibility
    }

    draw(ctx) {
        const { x, y, w, h } = this;
        const data = this.data;
        const pulseIntensity = (Math.sin(this.pulse) + 1) * 0.3 + 0.4;

        // glowing aura
        ctx.fillStyle = data.color;
        ctx.globalAlpha = pulseIntensity;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // icon inside
        ctx.fillStyle = data.color;
        if (this.type === "speed") {
            // lightning bolt
            ctx.beginPath();
            ctx.moveTo(x + w / 2 - 4, y + 4);
            ctx.lineTo(x + w / 2 + 2, y + h / 2 - 2);
            ctx.lineTo(x + w / 2 - 2, y + h / 2);
            ctx.lineTo(x + w / 2 + 4, y + h - 4);
            ctx.lineTo(x + w / 2 - 2, y + h / 2 + 2);
            ctx.lineTo(x + w / 2 + 2, y + h / 2);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === "scythe") {
            // scythe blade
            ctx.strokeStyle = data.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2 - 3, 6, 0, Math.PI, false);
            ctx.stroke();

            // handle
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y + h / 2 + 3);
            ctx.lineTo(x + w / 2, y + h - 2);
            ctx.stroke();
        }
    }
}

/**
 * Scarecrow - static obstacle
 */
export class Scarecrow extends Entity {
    constructor(x, y) {
        super(x, y, 26, 46);
    }

    draw(ctx) {
        const { x, y, w, h } = this;

        // pole
        ctx.fillStyle = "#9b7653";
        ctx.fillRect(x + w / 2 - 3, y, 6, h);

        // head
        ctx.fillStyle = "#c28e0e";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // arms
        ctx.strokeStyle = "#6b4f2a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y + 18);
        ctx.lineTo(x + w, y + 18);
        ctx.stroke();
    }
}

/**
 * Input handler -  keeps track of pressed keys
 * 
 * 👆 This is a good example of why `.bind(this)` is sometimes necessary.
 * - We bind the methods once in the constructor and keep references.  
 * - That way, we can *remove* the same listeners later in dispose().  
 * - If we used arrow functions directly in addEventListener, every call would
 *   create a new function object.
 */
export class Input {
    constructor(game) {
        this.game = game;
        this.keys = new Set();

        // Bound once so we can remove them later
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);

        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
    }

    onKeyDown(e) {
        if (e.key === "p" || e.key === "P") this.game.togglePause();
        this.keys.add(e.key);
    }

    onKeyUp(e) {
        this.keys.delete(e.key);
    }

    dispose() {
        // removing works only because we saved bound refs
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
    }
}
