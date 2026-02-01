// ==========================================
// AIR PUMP
// ==========================================

class AirPump {
    constructor(images) {
        this.images = images;
        this.pumpScale = CONFIG.PUMP.SCALE;
        this.handleY = 0;
        this.maxHandleY = CONFIG.PUMP.MAX_HANDLE_Y;
        this.pressing = false;
        this.pumpCount = 0;
        this.autoInflate = false;
        this.autoPumpDirection = 1;
        this.autoButtonBounds = null;
        this.updatePosition(window.innerWidth, window.innerHeight);
    }

    updatePosition(canvasWidth, canvasHeight) {
        this.x = canvasWidth - 150;
        this.y = canvasHeight - 120;
        this.nozzleX = this.x - 150;
        this.nozzleY = this.y - 30;
    }

    press() {
        if (!this.pressing) {
            this.pressing = true;
            this.pumpCount++;
        }
    }

    release() {
        this.pressing = false;
    }

    toggleAutoInflate() {
        this.autoInflate = !this.autoInflate;
        if (this.autoInflate) {
            this.pressing = false;
            this.autoPumpDirection = 1;
        }
    }

    update() {
        if (this.autoInflate) {
            // Auto-pump animation
            if (this.autoPumpDirection === 1 && this.handleY < this.maxHandleY) {
                this.handleY += CONFIG.PUMP.AUTO_PUMP_SPEED;
            } else if (this.autoPumpDirection === 1 && this.handleY >= this.maxHandleY) {
                this.autoPumpDirection = -1;
            } else if (this.autoPumpDirection === -1 && this.handleY > 0) {
                this.handleY -= CONFIG.PUMP.AUTO_PUMP_SPEED;
            } else if (this.autoPumpDirection === -1 && this.handleY <= 0) {
                this.autoPumpDirection = 1;
                return { needsNewBalloon: true };
            }
        } else {
            // Manual mode
            if (this.pressing && this.handleY < this.maxHandleY) {
                this.handleY += CONFIG.PUMP.HANDLE_SPEED_DOWN;
            } else if (!this.pressing && this.handleY > 0) {
                this.handleY -= CONFIG.PUMP.HANDLE_SPEED_UP;
            }
        }

        this.handleY = clamp(this.handleY, 0, this.maxHandleY);
        return { needsNewBalloon: false };
    }

    shouldInflate() {
        return this.handleY > 5;
    }

    draw(ctx, canvasWidth, canvasHeight, inflatingBalloon, imagesLoaded) {
        this.updatePosition(canvasWidth, canvasHeight);
        
        if (!imagesLoaded) {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(this.x - 60, this.y - 100, 120, 150);
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', this.x, this.y);
            return;
        }

        ctx.save();

        const bodyWidth = this.images.pumpBody.width * this.pumpScale;
        const bodyHeight = this.images.pumpBody.height * this.pumpScale;

        // Handle
        if (this.images.pumpHandle.complete) {
            const handleWidth = this.images.pumpHandle.width * this.pumpScale;
            const handleHeight = this.images.pumpHandle.height * this.pumpScale;
            ctx.drawImage(
                this.images.pumpHandle,
                this.x - handleWidth / 2,
                this.y - bodyHeight / 2 - handleHeight + 90 + this.handleY,
                handleWidth,
                handleHeight
            );
        }

        // Body
        if (this.images.pumpBody.complete) {
            ctx.drawImage(
                this.images.pumpBody,
                this.x - bodyWidth / 2,
                this.y - bodyHeight / 2,
                bodyWidth,
                bodyHeight
            );
        }

        // Inflator
        if (this.images.pumpInflator.complete) {
            const inflatorWidth = this.images.pumpInflator.width * this.pumpScale;
            const inflatorHeight = this.images.pumpInflator.height * this.pumpScale;
            ctx.drawImage(
                this.images.pumpInflator,
                this.nozzleX - inflatorWidth / 2,
                this.nozzleY - inflatorHeight / 2,
                inflatorWidth,
                inflatorHeight
            );
        }

        // Inflating balloon
        if (inflatingBalloon?.inflating) {
            this.drawInflatingBalloon(ctx, inflatingBalloon);
        }

        // Auto button
        this.drawAutoButton(ctx);

        ctx.restore();
    }

    drawInflatingBalloon(ctx, balloon) {
        ctx.save();
        ctx.translate(this.nozzleX - 60, this.nozzleY - 75 - balloon.size);

        // Draw glow for special balloons
        if (balloon.specialType && balloon.size > 10) {
            let glowColor;
            if (balloon.specialType === 'golden') {
                glowColor = CONFIG.SPECIAL_BALLOON.GOLDEN.GLOW_COLOR;
            } else if (balloon.specialType === 'timeFreeze') {
                glowColor = CONFIG.SPECIAL_BALLOON.TIME_FREEZE.GLOW_COLOR;
            } else if (balloon.specialType === 'bomb') {
                glowColor = CONFIG.SPECIAL_BALLOON.BOMB.GLOW_COLOR;
            }
            
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, balloon.size * 0.8, balloon.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Balloon pattern
        const balloonImg = this.images.balloonPatterns[balloon.patternIndex];
        if (balloonImg?.complete && balloonImg.naturalWidth > 0) {
            const scale = (balloon.size * 2.2) / Math.max(balloonImg.width, balloonImg.height);
            const w = balloonImg.width * scale;
            const h = balloonImg.height * scale;
            ctx.drawImage(balloonImg, -w / 2, -h / 2, w, h);
        }

        // Special balloon icon or normal symbol
        if (balloon.specialType && balloon.size > 20) {
            ctx.font = `bold ${balloon.size * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (balloon.specialType === 'golden') {
                ctx.fillText('🌟', 0, 0);
            } else if (balloon.specialType === 'timeFreeze') {
                ctx.fillText('⏱️', 0, 0);
            } else if (balloon.specialType === 'bomb') {
                ctx.fillText('💣', 0, 0);
            }
        } else {
            // Normal symbol
            const symbolImg = balloon.symbolType === 'letter'
                ? this.images.letters[balloon.symbolIndex]
                : this.images.numbers[balloon.symbolIndex];
                
            if (symbolImg?.complete && symbolImg.naturalWidth > 0 && balloon.size > 20) {
                const scale = (balloon.size * 0.6) / Math.max(symbolImg.width, symbolImg.height);
                const w = symbolImg.width * scale;
                const h = symbolImg.height * scale;
                ctx.drawImage(symbolImg, -w / 2, -h / 2, w, h);
            }
        }

        ctx.restore();
    }

    drawAutoButton(ctx) {
        const size = 40;
        const x = this.nozzleX + 60;
        const y = this.nozzleY - 20;
        
        ctx.save();
        
        ctx.fillStyle = this.autoInflate ? '#ff6b6b' : '#4CAF50';
        ctx.beginPath();
        ctx.roundRect(x - size / 2, y - size / 2, size, size, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.autoInflate ? 'OFF' : 'AUTO', x, y - 2);
        ctx.fillText(this.autoInflate ? 'AUTO' : 'PUMP', x, y + 10);
        
        ctx.restore();
        
        this.autoButtonBounds = { x: x - size / 2, y: y - size / 2, width: size, height: size };
    }

    containsHandle(px, py) {
        const bodyHeight = (this.images.pumpBody.height || 200) * this.pumpScale;
        const handleWidth = (this.images.pumpHandle.width || 100) * this.pumpScale;
        const handleHeight = (this.images.pumpHandle.height || 100) * this.pumpScale;
        
        const hx = this.x - handleWidth / 2;
        const hy = this.y - bodyHeight / 2 - handleHeight + 90 + this.handleY;
        
        return px >= hx && px <= hx + handleWidth && py >= hy && py <= hy + handleHeight;
    }

    containsAutoButton(px, py) {
        if (!this.autoButtonBounds) return false;
        return pointInRect(px, py, this.autoButtonBounds);
    }
}
