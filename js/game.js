// ==========================================
// MAIN GAME
// ==========================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.highScoreElement = document.getElementById('highScoreValue');
        
        // State
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE)) || 0;
        this.gameOver = false;
        this.imagesLoaded = false;
        this.gameOverButton = null;
        
        // Power-up state
        this.birdsFrozen = false;
        this.freezeEndTime = 0;
        
        // Collections
        this.balloons = [];
        this.particles = [];
        this.clouds = [];
        this.birds = [];
        this.scorePopups = [];  // Floating score text
        
        // Symbol pools
        this.availableLetters = [];
        this.availableNumbers = [];
        this.usedSymbols = new Set();
        
        // Game objects
        this.inflatingBalloon = null;
        this.images = {
            balloonPatterns: [],
            letters: [],
            numbers: [],
            pumpBody: new Image(),
            pumpHandle: new Image(),
            pumpInflator: new Image()
        };
        
        // Initialize
        this.resizeCanvas();
        this.loadImages();
        this.initializeSymbolPools();
        this.updateHighScoreDisplay();
        
        // Create managers and objects
        this.weather = new WeatherManager();
        this.pump = new AirPump(this.images);
        this.backButton = new BackButton();
        this.input = new InputManager(this.canvas, this);
        
        this.initClouds();
        this.initBirds();
        
        // Event listeners
        window.addEventListener('resize', () => this.handleResize());
        
        // Start game loop
        this.gameLoop();
        this.checkLoadingComplete();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleResize() {
        this.resizeCanvas();
        this.initClouds();
        this.initBirds();
    }

    // ==========================================
    // IMAGE LOADING
    // ==========================================
    
    loadImages() {
        let loadedCount = 0;
        const totalImages = 10 + 26 + 10 + 3;

        const onLoad = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
                this.imagesLoaded = true;
                console.log('All images loaded!');
            }
        };

        const onError = (e) => {
            console.warn('Failed to load:', e.target.src);
            onLoad();
        };

        // Balloon patterns
        CONFIG.PATTERNS.forEach((num, i) => {
            const img = new Image();
            img.onload = onLoad;
            img.onerror = onError;
            img.src = `Graphics/ballon_pattern${num}.png`;
            this.images.balloonPatterns[i] = img;
        });

        // Letters
        for (let i = 1; i <= 26; i++) {
            const img = new Image();
            img.onload = onLoad;
            img.onerror = onError;
            img.src = `Graphics/Symbol ${10000 + i}.png`;
            this.images.letters[i - 1] = img;
        }

        // Numbers
        for (let i = 0; i <= 9; i++) {
            const img = new Image();
            img.onload = onLoad;
            img.onerror = onError;
            img.src = `Graphics/${i}.png`;
            this.images.numbers[i] = img;
        }

        // Pump parts
        this.images.pumpBody.onload = onLoad;
        this.images.pumpBody.onerror = onError;
        this.images.pumpBody.src = 'Graphics/pumpbody.png';

        this.images.pumpHandle.onload = onLoad;
        this.images.pumpHandle.onerror = onError;
        this.images.pumpHandle.src = 'Graphics/pump_handle.png';

        this.images.pumpInflator.onload = onLoad;
        this.images.pumpInflator.onerror = onError;
        this.images.pumpInflator.src = 'Graphics/pump_inflator.png';
    }

    // ==========================================
    // SYMBOL POOL MANAGEMENT
    // ==========================================
    
    initializeSymbolPools() {
        this.availableLetters = Array.from({ length: 26 }, (_, i) => i);
        this.availableNumbers = Array.from({ length: 10 }, (_, i) => i);
        this.usedSymbols.clear();
    }

    getRandomSymbol() {
        if (this.availableLetters.length === 0 && this.availableNumbers.length === 0) {
            this.initializeSymbolPools();
        }

        const hasLetters = this.availableLetters.length > 0;
        const hasNumbers = this.availableNumbers.length > 0;

        let useNumber;
        if (hasLetters && hasNumbers) {
            useNumber = Math.random() < 0.5;
        } else {
            useNumber = hasNumbers;
        }

        if (useNumber && hasNumbers) {
            const idx = Math.floor(Math.random() * this.availableNumbers.length);
            const numberIndex = this.availableNumbers.splice(idx, 1)[0];
            const key = `number_${numberIndex}`;
            this.usedSymbols.add(key);
            return { type: 'number', index: numberIndex, key };
        } else if (hasLetters) {
            const idx = Math.floor(Math.random() * this.availableLetters.length);
            const letterIndex = this.availableLetters.splice(idx, 1)[0];
            const key = `letter_${letterIndex}`;
            this.usedSymbols.add(key);
            return { type: 'letter', index: letterIndex, key };
        }
    }

    returnSymbolToPool(balloon) {
        if (!balloon.symbolKey) return;
        
        this.usedSymbols.delete(balloon.symbolKey);
        if (balloon.symbolType === 'letter') {
            this.availableLetters.push(balloon.symbolIndex);
        } else {
            this.availableNumbers.push(balloon.symbolIndex);
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    initClouds() {
        this.clouds = [];
        for (let i = 0; i < CONFIG.CLOUD.COUNT; i++) {
            this.clouds.push(new Cloud(
                Math.random() * this.canvas.width,
                Math.random() * (this.canvas.height * 0.6),
                randomRange(0.5, 1)
            ));
        }
    }

    initBirds() {
        this.birds = [];
        for (let i = 0; i < CONFIG.BIRD.COUNT; i++) {
            this.birds.push(new Bird(
                Math.random() * this.canvas.width,
                100 + Math.random() * (this.canvas.height * 0.5)
            ));
        }
    }

    // ==========================================
    // INPUT HANDLING
    // ==========================================
    
    handleClick(x, y) {
        // Game over button
        if (this.gameOver && this.gameOverButton) {
            if (pointInRect(x, y, this.gameOverButton)) {
                this.resetGame();
                return;
            }
            return;
        }

        // Back button
        if (this.backButton.contains(x, y)) {
            this.resetGame();
            return;
        }

        // Birds
        for (const bird of this.birds) {
            if (bird.contains(x, y)) {
                this.gameOver = true;
                return;
            }
        }

        // Balloons
        for (let i = this.balloons.length - 1; i >= 0; i--) {
            if (this.balloons[i].contains(x, y) && this.balloons[i].flying) {
                this.popBalloon(this.balloons[i]);
                return;
            }
        }

        // Auto button
        if (this.pump.containsAutoButton(x, y)) {
            this.pump.toggleAutoInflate();
            return;
        }

        // Pump handle
        if (this.pump.containsHandle(x, y)) {
            this.pump.press();
            this.createBalloonIfNeeded();
        }
    }

    handleRelease() {
        this.pump.release();
    }

    // ==========================================
    // GAME LOGIC
    // ==========================================
    
    createBalloonIfNeeded() {
        if (!this.inflatingBalloon || !this.inflatingBalloon.inflating) {
            const patternIndex = Math.floor(Math.random() * this.images.balloonPatterns.length);
            const symbolData = this.getRandomSymbol();
            
            // Determine if this should be a special balloon
            let specialType = null;
            if (Math.random() < CONFIG.SPECIAL_BALLOON.SPAWN_CHANCE) {
                const rand = Math.random();
                if (rand < 0.33) {
                    specialType = 'golden';
                } else if (rand < 0.66) {
                    specialType = 'timeFreeze';
                } else {
                    specialType = 'bomb';
                }
            }
            
            this.inflatingBalloon = new Balloon(
                this.pump.nozzleX,
                this.pump.nozzleY - 80,
                patternIndex,
                symbolData,
                this.images,
                specialType
            );
        }
    }

    popBalloon(balloon, isChainPop = false) {
        if (balloon.popped) return 0;
        
        balloon.popped = true;
        this.returnSymbolToPool(balloon);

        // Particles
        let particleColor = CONFIG.COLORS.BALLOON[balloon.patternIndex % CONFIG.COLORS.BALLOON.length];
        if (balloon.specialType === 'golden') {
            particleColor = '#FFD700';
        } else if (balloon.specialType === 'timeFreeze') {
            particleColor = '#00BFFF';
        } else if (balloon.specialType === 'bomb') {
            particleColor = '#FF4444';
        }
        
        for (let i = 0; i < CONFIG.PARTICLE.COUNT; i++) {
            this.particles.push(new Particle(balloon.x, balloon.y, particleColor));
        }

        // Calculate points based on balloon type
        let points = 1;
        if (balloon.specialType === 'golden') {
            points = CONFIG.SPECIAL_BALLOON.GOLDEN.POINTS;
        }

        // Handle special balloon effects
        if (balloon.specialType === 'timeFreeze') {
            this.activateTimeFreeze();
        } else if (balloon.specialType === 'bomb' && !isChainPop) {
            // Bomb explodes nearby balloons
            points += this.triggerBombExplosion(balloon.x, balloon.y);
        }

        // Add score
        this.score += points;
        this.scoreElement.textContent = this.score;
        
        // Create score popup
        this.scorePopups.push(new ScorePopup(
            balloon.x, 
            balloon.y, 
            points, 
            points > 1,
            balloon.specialType
        ));

        // High score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, this.highScore);
            this.updateHighScoreDisplay();
        }
        
        return points;
    }
    
    activateTimeFreeze() {
        this.birdsFrozen = true;
        this.freezeEndTime = Date.now() + CONFIG.SPECIAL_BALLOON.TIME_FREEZE.DURATION;
    }
    
    triggerBombExplosion(x, y) {
        const radius = CONFIG.SPECIAL_BALLOON.BOMB.RADIUS;
        let totalPoints = 0;
        
        // Find all nearby balloons
        for (const balloon of this.balloons) {
            if (balloon.popped || !balloon.flying) continue;
            
            const dx = balloon.x - x;
            const dy = balloon.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                // Pop this balloon (chain pop)
                totalPoints += this.popBalloon(balloon, true);
            }
        }
        
        // Extra explosion particles at center
        for (let i = 0; i < 30; i++) {
            this.particles.push(new Particle(x, y, '#FF6600'));
        }
        
        return totalPoints;
    }

    resetGame() {
        this.gameOver = false;
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.balloons = [];
        this.particles = [];
        this.scorePopups = [];
        this.inflatingBalloon = null;
        this.birdsFrozen = false;
        this.freezeEndTime = 0;
        this.initializeSymbolPools();
        this.initBirds();
    }

    updateHighScoreDisplay() {
        if (this.highScoreElement) {
            this.highScoreElement.textContent = this.highScore;
        }
    }

    // ==========================================
    // UPDATE
    // ==========================================
    
    update() {
        if (this.gameOver) return;

        this.weather.update(this.canvas.width);
        this.clouds.forEach(c => c.update(this.canvas.width, this.canvas.height));
        
        // Check if time freeze is over
        if (this.birdsFrozen && Date.now() > this.freezeEndTime) {
            this.birdsFrozen = false;
        }
        
        // Only update birds if not frozen
        if (!this.birdsFrozen) {
            this.birds.forEach(b => b.update(this.canvas.width, this.canvas.height));
        }

        // Pump
        const pumpResult = this.pump.update();
        if (pumpResult.needsNewBalloon && !this.inflatingBalloon) {
            this.createBalloonIfNeeded();
        }

        // Inflate
        if (this.inflatingBalloon?.inflating && this.pump.shouldInflate()) {
            this.inflatingBalloon.inflate(CONFIG.BALLOON.INFLATE_AMOUNT);
        }

        // Transfer inflated balloon
        if (this.inflatingBalloon && !this.inflatingBalloon.inflating && this.inflatingBalloon.flying) {
            this.inflatingBalloon.x = this.pump.nozzleX - 60;
            this.inflatingBalloon.y = this.pump.nozzleY - 75 - this.inflatingBalloon.size;

            // Enforce max balloons
            if (this.balloons.length >= CONFIG.MAX_BALLOONS) {
                const removed = this.balloons.shift();
                this.returnSymbolToPool(removed);
            }

            this.balloons.push(this.inflatingBalloon);
            this.inflatingBalloon = null;
            
            if (!this.pump.autoInflate) {
                this.pump.release();
            }
        }

        // Update balloons
        this.balloons = this.balloons.filter(b => {
            if (b.popped) return false;
            return b.update(this.canvas.width, this.canvas.height);
        });

        // Update particles
        this.particles = this.particles.filter(p => p.update());
        
        // Update score popups
        this.scorePopups = this.scorePopups.filter(p => p.update());
    }

    // ==========================================
    // DRAW
    // ==========================================
    
    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        const bgColors = this.weather.getBackgroundColors();
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, bgColors.top);
        gradient.addColorStop(1, bgColors.bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Stars
        this.weather.drawStars(ctx, Date.now());

        // Clouds
        this.clouds.forEach(c => c.draw(ctx));

        // Weather
        this.weather.draw(ctx, w, h);

        // Birds (with freeze effect if frozen)
        if (this.birdsFrozen) {
            ctx.save();
            ctx.filter = 'hue-rotate(180deg) saturate(0.5)';
            this.birds.forEach(b => b.draw(ctx));
            ctx.restore();
            
            // Draw freeze indicator
            this.drawFreezeIndicator();
        } else {
            this.birds.forEach(b => b.draw(ctx));
        }

        // Balloons
        this.balloons.forEach(b => b.draw(ctx));

        // Particles
        this.particles.forEach(p => p.draw(ctx));
        
        // Score popups
        this.scorePopups.forEach(p => p.draw(ctx));

        // Pump
        this.pump.draw(ctx, w, h, this.inflatingBalloon, this.imagesLoaded);

        // Back button
        this.backButton.draw(ctx);

        // Developer credit
        const isNight = this.weather.isNighttime();
        ctx.fillStyle = isNight ? 'rgba(255, 50, 50, 0.8)' : 'rgba(8, 8, 8, 0.6)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Developed by Sushil', 10, h - 10);

        // Game over
        if (this.gameOver) {
            this.drawGameOverModal();
        }
    }
    
    drawFreezeIndicator() {
        const ctx = this.ctx;
        const remaining = Math.max(0, this.freezeEndTime - Date.now());
        const seconds = Math.ceil(remaining / 1000);
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`⏱️ Birds Frozen: ${seconds}s`, this.canvas.width / 2, 100);
        ctx.restore();
    }

    drawGameOverModal() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dim
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        // Modal
        const modalW = 400;
        const modalH = 400;
        const modalX = (w - modalW) / 2;
        const modalY = (h - modalH) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 5;
        roundRect(ctx, modalX, modalY, modalW, modalH, 20);
        ctx.fill();
        ctx.stroke();

        // Red cross
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        const crossSize = 80;
        const crossX = w / 2;
        const crossY = modalY + 80;

        ctx.beginPath();
        ctx.moveTo(crossX - crossSize / 2, crossY - crossSize / 2);
        ctx.lineTo(crossX + crossSize / 2, crossY + crossSize / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(crossX + crossSize / 2, crossY - crossSize / 2);
        ctx.lineTo(crossX - crossSize / 2, crossY + crossSize / 2);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#333';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over!', w / 2, crossY + 80);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`Your Score: ${this.score}`, w / 2, crossY + 120);

        // Best score
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = this.score >= this.highScore ? '#f39c12' : '#999';
        ctx.fillText(`Best: ${this.highScore}`, w / 2, crossY + 155);

        // Button
        const btnW = 200;
        const btnH = 60;
        const btnX = (w - btnW) / 2;
        const btnY = crossY + 190;

        const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        btnGradient.addColorStop(0, '#3bb3e0');
        btnGradient.addColorStop(1, '#2980b9');
        ctx.fillStyle = btnGradient;
        roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.strokeStyle = '#1a5276';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Try Again', w / 2, btnY + btnH / 2);

        this.gameOverButton = { x: btnX, y: btnY, width: btnW, height: btnH };
    }

    // ==========================================
    // GAME LOOP
    // ==========================================
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    // ==========================================
    // LOADING
    // ==========================================
    
    checkLoadingComplete() {
        if (this.imagesLoaded) {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            const instructionModal = document.getElementById('instructionModal');
            if (instructionModal) instructionModal.classList.add('show');
        } else {
            setTimeout(() => this.checkLoadingComplete(), 100);
        }
    }
}

// ==========================================
// START GAME
// ==========================================

const game = new Game();

window.closeInstructions = function () {
    const modal = document.getElementById('instructionModal');
    if (modal) modal.classList.remove('show');
};
