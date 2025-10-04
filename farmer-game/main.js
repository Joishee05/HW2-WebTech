/**
 * @fileoverview Entry point for the Farmer Harvest Game
 * 
 *
 * 
 * - I replaced anonymous callbacks with arrow functions and added notes about why.
 * - There are a couple of `.bind(this)` calls, mainly for event listeners that need to be cleaned up later.
 * - `this` is being used in three main places:
 *     1. Inside the requestAnimationFrame (RAF) loop
 *     2. In event listeners
 *     3. When calling class methods
 * 
 */

import { Game } from './Game.js';

// Canvas dimensions
const WIDTH = 900, HEIGHT = 540;

// Start the game once the page has finished loading
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    if (!canvas) {
        console.error("Couldn’t find a canvas element with the ID 'game'.");
        return;
    }
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    const game = new Game(canvas);
});
