// ==========================================
// WEATHER SYSTEM
// ==========================================

// Raindrop class
class Raindrop {
    constructor(canvasWidth) {
        this.x = Math.random() * canvasWidth;
        this.y = -10;
        this.speed = randomRange(5, 10);
        this.length = randomRange(15, 25);
    }

    update() {
        this.y += this.speed;
        return this.y < window.innerHeight;
    }

    draw(ctx) {
        ctx.strokeStyle = 'rgba(174, 214, 241, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
    }
}

// Sun ray class
class SunRay {
    constructor(index, total) {
        this.angle = (index / total) * Math.PI * 2;
        this.length = 60;
        this.pulseOffset = Math.random() * Math.PI * 2;
    }

    draw(ctx, time, canvasWidth) {
        const sunX = canvasWidth - 100;
        const sunY = 80;
        const pulse = Math.sin(time * 0.002 + this.pulseOffset) * 10;
        const currentLength = this.length + pulse;
        
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.4)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(this.angle) * 40, sunY + Math.sin(this.angle) * 40);
        ctx.lineTo(
            sunX + Math.cos(this.angle) * (40 + currentLength),
            sunY + Math.sin(this.angle) * (40 + currentLength)
        );
        ctx.stroke();
    }
}

// Star class
class Star {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * (canvasHeight * 0.7);
        this.size = randomRange(1, 3);
        this.twinkleSpeed = randomRange(0.02, 0.05);
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.brightness = randomRange(0.5, 1);
    }

    draw(ctx, time, nightIntensity) {
        const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7;
        const alpha = this.brightness * twinkle * nightIntensity;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow for larger stars
        if (this.size > 1.5) {
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Weather Manager
class WeatherManager {
    constructor() {
        this.loadState();
        this.initEffects();
    }
    
    loadState() {
        const saved = localStorage.getItem(STORAGE_KEYS.WEATHER);
        const defaults = {
            type: 'sunny',
            timeOfDay: 0,
            dayNightSpeed: CONFIG.WEATHER.DAY_NIGHT_SPEED,
            changeInterval: CONFIG.WEATHER.CHANGE_INTERVAL
        };
        
        const state = saved ? JSON.parse(saved) : defaults;
        Object.assign(this, state);
        
        this.raindrops = [];
        this.sunRays = [];
        this.stars = [];
        this.lastChange = Date.now();
    }
    
    initEffects() {
        // Create sun rays
        for (let i = 0; i < CONFIG.WEATHER.SUN_RAY_COUNT; i++) {
            this.sunRays.push(new SunRay(i, CONFIG.WEATHER.SUN_RAY_COUNT));
        }
        
        // Create stars
        for (let i = 0; i < CONFIG.WEATHER.STAR_COUNT; i++) {
            this.stars.push(new Star(window.innerWidth, window.innerHeight));
        }
    }
    
    update(canvasWidth) {
        // Update day/night cycle
        this.timeOfDay += this.dayNightSpeed;
        if (this.timeOfDay > 1) this.timeOfDay = 0;
        
        // Save state
        this.saveState();
        
        // Change weather periodically
        if (Date.now() - this.lastChange > this.changeInterval) {
            this.changeWeather();
            this.lastChange = Date.now();
        }
        
        // Update rain
        if (this.type === 'rainy') {
            if (Math.random() < 0.3) {
                this.raindrops.push(new Raindrop(canvasWidth));
            }
            this.raindrops = this.raindrops.filter(drop => drop.update());
        }
    }
    
    changeWeather() {
        const types = ['sunny', 'rainy', 'cloudy'];
        const currentIndex = types.indexOf(this.type);
        this.type = types[(currentIndex + 1) % types.length];
        this.raindrops = [];
    }
    
    saveState() {
        localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify({
            type: this.type,
            timeOfDay: this.timeOfDay,
            dayNightSpeed: this.dayNightSpeed,
            changeInterval: this.changeInterval
        }));
    }
    
    getBackgroundColors() {
        const t = this.timeOfDay;
        let topColor, bottomColor;
        
        if (t < 0.25) { // Dawn
            const progress = t / 0.25;
            topColor = lerpColor([25, 25, 50], [135, 206, 235], progress);
            bottomColor = lerpColor([15, 15, 35], [245, 230, 163], progress);
        } else if (t < 0.5) { // Day
            topColor = [135, 206, 235];
            bottomColor = [245, 230, 163];
        } else if (t < 0.75) { // Dusk
            const progress = (t - 0.5) / 0.25;
            topColor = lerpColor([135, 206, 235], [50, 30, 80], progress);
            bottomColor = lerpColor([245, 230, 163], [30, 20, 50], progress);
        } else { // Night
            topColor = [25, 25, 50];
            bottomColor = [15, 15, 35];
        }
        
        return {
            top: `rgb(${topColor[0]}, ${topColor[1]}, ${topColor[2]})`,
            bottom: `rgb(${bottomColor[0]}, ${bottomColor[1]}, ${bottomColor[2]})`
        };
    }
    
    getNightIntensity() {
        const t = this.timeOfDay;
        if (t < 0.25) return (0.25 - t) / 0.25;
        if (t > 0.75) return (t - 0.75) / 0.25;
        return 0;
    }
    
    isDaytime() {
        return this.timeOfDay >= 0.25 && this.timeOfDay <= 0.75;
    }
    
    isNighttime() {
        return !this.isDaytime();
    }
    
    draw(ctx, canvasWidth, canvasHeight) {
        const celestialX = canvasWidth - 100;
        const celestialY = 80;
        
        // Draw sun during day
        if (this.type === 'sunny' && this.isDaytime()) {
            this.sunRays.forEach(ray => ray.draw(ctx, Date.now(), canvasWidth));
            
            const sunGradient = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, 40);
            sunGradient.addColorStop(0, '#fff9e6');
            sunGradient.addColorStop(0.5, '#ffeb3b');
            sunGradient.addColorStop(1, '#ffd700');
            ctx.fillStyle = sunGradient;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw moon at night
        if (this.isNighttime()) {
            const moonGradient = ctx.createRadialGradient(celestialX - 10, celestialY - 10, 0, celestialX, celestialY, 35);
            moonGradient.addColorStop(0, '#ffffff');
            moonGradient.addColorStop(0.5, '#f0f0f0');
            moonGradient.addColorStop(1, '#d0d0d0');
            ctx.fillStyle = moonGradient;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // Moon craters
            ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
            ctx.beginPath();
            ctx.arc(celestialX - 10, celestialY - 5, 8, 0, Math.PI * 2);
            ctx.arc(celestialX + 8, celestialY + 10, 5, 0, Math.PI * 2);
            ctx.arc(celestialX + 5, celestialY - 12, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw rain
        if (this.type === 'rainy') {
            this.raindrops.forEach(drop => drop.draw(ctx));
            ctx.fillStyle = 'rgba(100, 120, 140, 0.1)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else if (this.type === 'cloudy') {
            ctx.fillStyle = 'rgba(200, 200, 210, 0.15)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }
    
    drawStars(ctx, time) {
        const intensity = this.getNightIntensity();
        if (intensity > 0) {
            this.stars.forEach(star => star.draw(ctx, time, intensity));
        }
    }
}
