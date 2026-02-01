// ==========================================
// GAME ENTITIES
// ==========================================

// Cloud class
class Cloud {
    constructor(x, y, scale) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.speed = randomRange(CONFIG.CLOUD.SPEED_MIN, CONFIG.CLOUD.SPEED_MAX);
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.speed;
        if (this.x > canvasWidth + 150) {
            this.x = -200;
            this.y = Math.random() * (canvasHeight * 0.6);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.arc(50, -10, 50, 0, Math.PI * 2);
        ctx.arc(100, 0, 40, 0, Math.PI * 2);
        ctx.arc(30, 20, 30, 0, Math.PI * 2);
        ctx.arc(70, 20, 35, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Bird class (obstacle)
class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.BIRD.SIZE;
        this.speed = randomRange(CONFIG.BIRD.SPEED_MIN, CONFIG.BIRD.SPEED_MAX);
        this.wingAngle = 0;
        this.wingSpeed = CONFIG.BIRD.WING_SPEED;
        this.color = randomItem(CONFIG.COLORS.BIRD);
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.speed;
        this.y += Math.sin(this.wingAngle * 0.5) * 0.5;
        
        if (this.x > canvasWidth + 100) {
            this.x = -100;
            this.y = 100 + Math.random() * (canvasHeight * 0.5);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        this.wingAngle += this.wingSpeed;
        const wingOffset = Math.sin(this.wingAngle) * 10;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.beginPath();
        ctx.arc(this.size * 0.4, -this.size * 0.2, this.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(this.size * 0.6, -this.size * 0.2);
        ctx.lineTo(this.size * 0.9, -this.size * 0.15);
        ctx.lineTo(this.size * 0.6, -this.size * 0.1);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.3, wingOffset, this.size * 0.5, this.size * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.3, -wingOffset, this.size * 0.5, this.size * 0.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    contains(px, py) {
        return pointInCircle(px, py, this.x, this.y, this.size);
    }
}

// Balloon class
class Balloon {
    constructor(x, y, patternIndex, symbolData, images, specialType = null) {
        this.x = x;
        this.y = y;
        this.patternIndex = patternIndex;
        this.symbolType = symbolData.type;
        this.symbolIndex = symbolData.index;
        this.symbolKey = symbolData.key;
        this.images = images;
        this.specialType = specialType; // 'golden', 'timeFreeze', 'bomb', or null
        
        this.size = 0;
        this.maxSize = CONFIG.BALLOON.MAX_SIZE;
        this.stringLength = CONFIG.BALLOON.STRING_LENGTH;
        this.inflating = true;
        this.flying = false;
        this.popped = false;
        
        this.vx = 0;
        this.vy = 0;
        this.wobble = 0;
        this.wobbleSpeed = randomRange(CONFIG.BALLOON.WOBBLE_SPEED_MIN, CONFIG.BALLOON.WOBBLE_SPEED_MAX);
        this.rotation = 0;
        this.glowPhase = 0;
    }

    inflate(amount) {
        if (!this.inflating || this.size >= this.maxSize) return;
        
        this.size += amount;
        if (this.size >= this.maxSize) {
            this.size = this.maxSize;
            this.inflating = false;
            this.startFlying();
        }
    }

    startFlying() {
        this.flying = true;
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(3, 5);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1;
    }

    update(canvasWidth, canvasHeight) {
        if (!this.flying || this.popped) return true;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Wobble
        this.wobble += this.wobbleSpeed;
        this.rotation = Math.sin(this.wobble) * 0.1;
        
        // Glow animation for special balloons
        if (this.specialType) {
            this.glowPhase += 0.1;
        }
        
        // Bounce off walls
        const margin = this.size;
        const bottomMargin = this.size + this.stringLength;
        
        if (this.x < margin || this.x > canvasWidth - margin) {
            this.vx *= -CONFIG.BALLOON.BOUNCE_ENERGY;
            this.x = clamp(this.x, margin, canvasWidth - margin);
            this.vy += randomRange(-1, 1);
        }
        
        if (this.y < margin || this.y > canvasHeight - bottomMargin) {
            this.vy *= -CONFIG.BALLOON.BOUNCE_ENERGY;
            this.y = clamp(this.y, margin, canvasHeight - bottomMargin);
            this.vx += randomRange(-1, 1);
        }
        
        // Random drift
        this.vx += randomRange(-0.15, 0.15);
        this.vy += randomRange(-0.15, 0.15);
        
        // Maintain minimum speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < CONFIG.BALLOON.MIN_SPEED) {
            const boostAngle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(boostAngle) * 0.5;
            this.vy += Math.sin(boostAngle) * 0.5;
        }
        
        // Limit max speed
        if (speed > CONFIG.BALLOON.MAX_SPEED) {
            this.vx = (this.vx / speed) * CONFIG.BALLOON.MAX_SPEED;
            this.vy = (this.vy / speed) * CONFIG.BALLOON.MAX_SPEED;
        }
        
        return true;
    }

    draw(ctx) {
        if (this.size <= 0 || this.popped) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw glow effect for special balloons
        if (this.specialType && this.size > 10) {
            const glowPulse = Math.sin(this.glowPhase) * 0.3 + 0.7;
            let glowColor;
            if (this.specialType === 'golden') {
                glowColor = CONFIG.SPECIAL_BALLOON.GOLDEN.GLOW_COLOR;
            } else if (this.specialType === 'timeFreeze') {
                glowColor = CONFIG.SPECIAL_BALLOON.TIME_FREEZE.GLOW_COLOR;
            } else if (this.specialType === 'bomb') {
                glowColor = CONFIG.SPECIAL_BALLOON.BOMB.GLOW_COLOR;
            }
            
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20 + glowPulse * 15;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.9, this.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // String
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.9);
        const stringWave = Math.sin(this.wobble * 2) * 10;
        ctx.quadraticCurveTo(stringWave, this.size + this.stringLength / 2, 0, this.size + this.stringLength);
        ctx.stroke();

        // Balloon image
        const balloonImg = this.images.balloonPatterns[this.patternIndex];
        if (balloonImg?.complete && balloonImg.naturalWidth > 0) {
            const scale = (this.size * 2.2) / Math.max(balloonImg.width, balloonImg.height);
            const w = balloonImg.width * scale;
            const h = balloonImg.height * scale;
            ctx.drawImage(balloonImg, -w / 2, -h / 2, w, h);
        }

        // Symbol image (for normal balloons) or special icon
        if (this.specialType) {
            // Draw special balloon icon
            ctx.font = `bold ${this.size * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (this.specialType === 'golden') {
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#B8860B';
                ctx.lineWidth = 2;
                ctx.strokeText('🌟', 0, -5);
                ctx.fillText('🌟', 0, -5);
            } else if (this.specialType === 'timeFreeze') {
                ctx.fillStyle = '#00BFFF';
                ctx.strokeStyle = '#0080AA';
                ctx.lineWidth = 2;
                ctx.strokeText('⏱️', 0, -5);
                ctx.fillText('⏱️', 0, -5);
            } else if (this.specialType === 'bomb') {
                ctx.fillStyle = '#FF4444';
                ctx.strokeStyle = '#AA0000';
                ctx.lineWidth = 2;
                ctx.strokeText('💣', 0, -5);
                ctx.fillText('💣', 0, -5);
            }
        } else {
            // Normal balloon - draw symbol
            const symbolImg = this.symbolType === 'letter' 
                ? this.images.letters[this.symbolIndex] 
                : this.images.numbers[this.symbolIndex];
                
            if (symbolImg?.complete && symbolImg.naturalWidth > 0 && this.size > 30) {
                const scale = (this.size * 0.8) / Math.max(symbolImg.width, symbolImg.height);
                const w = symbolImg.width * scale;
                const h = symbolImg.height * scale;
                ctx.drawImage(symbolImg, -w / 2, -h / 2 - 5, w, h);
            }
        }

        ctx.restore();
    }

    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx) / (this.size * this.size * 0.7) + (dy * dy) / (this.size * this.size) < 1;
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = randomRange(CONFIG.PARTICLE.SIZE_MIN, CONFIG.PARTICLE.SIZE_MAX);
        this.vx = randomRange(-CONFIG.PARTICLE.SPEED / 2, CONFIG.PARTICLE.SPEED / 2);
        this.vy = randomRange(-CONFIG.PARTICLE.SPEED / 2, CONFIG.PARTICLE.SPEED / 2);
        this.life = 1;
        this.decay = randomRange(0.02, 0.04);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = randomRange(-0.15, 0.15);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.PARTICLE.GRAVITY;
        this.vx *= 0.98;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.moveTo(-this.size / 2, -this.size / 2);
        ctx.lineTo(this.size / 2, -this.size / 3);
        ctx.lineTo(this.size / 2, this.size / 2);
        ctx.lineTo(-this.size / 3, this.size / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// Back Button
class BackButton {
    constructor() {
        this.x = 50;
        this.y = 50;
        this.radius = 30;
    }

    draw(ctx) {
        ctx.save();
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - 15);
        ctx.lineTo(this.x - 10, this.y);
        ctx.lineTo(this.x + 10, this.y + 15);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    contains(px, py) {
        return pointInCircle(px, py, this.x, this.y, this.radius);
    }
}
// Score Popup class - floating score text that fades while rising
class ScorePopup {
    constructor(x, y, points, isSpecial = false, specialType = null) {
        this.x = x;
        this.y = y;
        this.points = points;
        this.isSpecial = isSpecial;
        this.specialType = specialType;
        this.life = 1;
        this.riseSpeed = CONFIG.SCORE_POPUP.RISE_SPEED;
        this.fadeSpeed = CONFIG.SCORE_POPUP.FADE_SPEED;
        this.scale = 1;
    }

    update() {
        this.y -= this.riseSpeed;
        this.life -= this.fadeSpeed;
        
        // Scale up initially then shrink
        if (this.life > 0.8) {
            this.scale = 1 + (1 - this.life) * 2;
        } else {
            this.scale = 1 + 0.4 * (this.life / 0.8);
        }
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        const fontSize = CONFIG.SCORE_POPUP.FONT_SIZE;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Determine color based on special type
        let color = '#ffffff';
        let strokeColor = '#333333';
        let text = `+${this.points}`;
        
        if (this.specialType === 'golden') {
            color = '#FFD700';
            strokeColor = '#B8860B';
            text = `+${this.points} 🌟`;
        } else if (this.specialType === 'timeFreeze') {
            color = '#00BFFF';
            strokeColor = '#0066AA';
            text = `+${this.points} ⏱️`;
        } else if (this.specialType === 'bomb') {
            color = '#FF6B6B';
            strokeColor = '#AA0000';
            text = `+${this.points} 💥`;
        } else if (this.isSpecial) {
            color = '#FFD700';
            strokeColor = '#B8860B';
        }
        
        // Draw text with outline
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
    }
}