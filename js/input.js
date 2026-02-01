// ==========================================
// INPUT HANDLING
// ==========================================

class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.mouseDown = false;
        this.setupListeners();
    }

    setupListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleEnd(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e), { passive: false });
    }

    handleStart(e) {
        e.preventDefault();
        const pos = getEventPos(e);
        this.mouseDown = true;
        this.game.handleClick(pos.x, pos.y);
    }

    handleMove(e) {
        e.preventDefault();
    }

    handleEnd(e) {
        e.preventDefault();
        this.mouseDown = false;
        this.game.handleRelease();
    }
}
