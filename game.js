const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game State
let score = 0;
let balloons = [];
let particles = [];
let pumpPressed = false;
let inflatingBalloon = null;
let currentLetterIndex = 0;
let imagesLoaded = false;
let birds = [];
let gameOver = false;

// Load saved weather state from localStorage
const savedWeather = localStorage.getItem('balloonGameWeather');
let weather = savedWeather ? JSON.parse(savedWeather) : {
    type: 'sunny', // 'sunny', 'rainy', 'cloudy'
    raindrops: [],
    sunRays: [],
    changeInterval: 15000, // Change weather every 15 seconds
    lastChange: Date.now(),
    timeOfDay: 0, // 0-1, where 0 is midnight, 0.5 is noon
    dayNightSpeed: 0.00005, // Speed of day/night cycle
    stars: []
};

// Reset transient properties
weather.raindrops = [];
weather.sunRays = [];
weather.stars = [];
weather.lastChange = Date.now();


const images = {
    balloonPatterns: [],
    letters: [],
    pumpBody: new Image(),
    pumpHandle: new Image(),
    pumpInflator: new Image()
};


function loadImages() {
    let loadedCount = 0;
    const totalImages = 10 + 26 + 3; // 10 balloon patterns + 26 letters + 3 pump parts

    function onImageLoad() {
        loadedCount++;
        if (loadedCount >= totalImages) {
            imagesLoaded = true;
            console.log('All images loaded!');
        }
    }

    function onImageError(e) {
        console.warn('Failed to load image:', e.target.src);
        loadedCount++;
        if (loadedCount >= totalImages) {
            imagesLoaded = true;
        }
    }

    // Load balloon patterns
    const patternNumbers = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
    patternNumbers.forEach((num, index) => {
        const img = new Image();
        img.onload = onImageLoad;
        img.onerror = onImageError;
        img.src = `Graphics/ballon_pattern${num}.png`;
        images.balloonPatterns[index] = img;
    });

    // Load letter images
    for (let i = 1; i <= 26; i++) {
        const img = new Image();
        img.onload = onImageLoad;
        img.onerror = onImageError;
        const num = 10000 + i;
        img.src = `Graphics/Symbol ${num}.png`;
        images.letters[i - 1] = img;
    }

    // Load pump parts
    images.pumpBody.onload = onImageLoad;
    images.pumpBody.onerror = onImageError;
    images.pumpBody.src = 'Graphics/pumpbody.png';

    images.pumpHandle.onload = onImageLoad;
    images.pumpHandle.onerror = onImageError;
    images.pumpHandle.src = 'Graphics/pump_handle.png';

    images.pumpInflator.onload = onImageLoad;
    images.pumpInflator.onerror = onImageError;
    images.pumpInflator.src = 'Graphics/pump_inflator.png';
}

loadImages();

// Cloud class for background
class Cloud {
    constructor(x, y, scale) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.speed = 0.2 + Math.random() * 0.3;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Draw cloud with white fill and subtle shadow
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

    update() {
        this.x += this.speed;
        if (this.x > canvas.width + 150) {
            this.x = -200;
            this.y = Math.random() * (canvas.height * 0.6);
        }
    }
}

// Bird class (obstacle)
class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.speed = 2 + Math.random() * 2;
        this.wingAngle = 0;
        this.wingSpeed = 0.15;
        this.color = Math.random() > 0.5 ? '#FF6B6B' : '#4ECDC4';
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flapping wings animation
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
        
        // Left wing
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.3, wingOffset, this.size * 0.5, this.size * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Right wing
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.3, -wingOffset, this.size * 0.5, this.size * 0.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    update() {
        this.x += this.speed;
        
        // Add slight vertical movement
        this.y += Math.sin(this.wingAngle * 0.5) * 0.5;
        
        // Reset if off screen
        if (this.x > canvas.width + 100) {
            this.x = -100;
            this.y = 100 + Math.random() * (canvas.height * 0.5);
        }
        
        return true;
    }

    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.size;
    }
}

// Raindrop class for weather effect
class Raindrop {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.speed = 5 + Math.random() * 5;
        this.length = 15 + Math.random() * 10;
    }

    update() {
        this.y += this.speed;
        return this.y < canvas.height;
    }

    draw() {
        ctx.strokeStyle = 'rgba(174, 214, 241, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
    }
}

// Sun ray class for weather effect
class SunRay {
    constructor(index, total) {
        this.angle = (index / total) * Math.PI * 2;
        this.length = 60;
        this.pulseOffset = Math.random() * Math.PI * 2;
    }

    draw(time) {
        const sunX = canvas.width - 100;
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

// Star class for night sky
class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * (canvas.height * 0.7);
        this.size = 1 + Math.random() * 2;
        this.twinkleSpeed = 0.02 + Math.random() * 0.03;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.brightness = 0.5 + Math.random() * 0.5;
    }

    draw(time, nightIntensity) {
        const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7;
        const alpha = this.brightness * twinkle * nightIntensity;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add small glow
        if (this.size > 1.5) {
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Balloon class
class Balloon {
    constructor(x, y, patternIndex, letterIndex) {
        this.x = x;
        this.y = y;
        this.patternIndex = patternIndex;
        this.letterIndex = letterIndex;
        this.size = 0;
        this.maxSize = 80;
        this.inflating = true;
        this.flying = false;
        this.vx = 0;
        this.vy = 0;
        this.wobble = 0;
        this.wobbleSpeed = 0.05 + Math.random() * 0.05;
        this.rotation = 0;
        this.popped = false;
        this.stringLength = 60;
    }

    inflate(amount) {
        if (this.inflating && this.size < this.maxSize) {
            this.size += amount;
            if (this.size >= this.maxSize) {
                this.size = this.maxSize;
                this.inflating = false;
                this.startFlying();
            }
        }
    }

    startFlying() {
        this.flying = true;
        // Random direction in all directions with good speed
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1; // Slight upward bias
    }

    update() {
        if (this.flying && !this.popped) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Wobble effect
            this.wobble += this.wobbleSpeed;
            this.rotation = Math.sin(this.wobble) * 0.1;
            
            // Bounce off left and right walls with less energy loss
            if (this.x < this.size || this.x > canvas.width - this.size) {
                this.vx *= -0.95;
                this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
                // Add random velocity when bouncing
                this.vy += (Math.random() - 0.5) * 2;
            }
            
            // Bounce off top and bottom with less energy loss
            if (this.y < this.size || this.y > canvas.height - this.size - this.stringLength) {
                this.vy *= -0.95;
                this.y = Math.max(this.size, Math.min(canvas.height - this.size - this.stringLength, this.y));
                // Add random velocity when bouncing
                this.vx += (Math.random() - 0.5) * 2;
            }
            
            // Add constant random drift for more movement
            this.vx += (Math.random() - 0.5) * 0.3;
            this.vy += (Math.random() - 0.5) * 0.3;
            
            // Maintain minimum speed to keep balloons moving
            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (currentSpeed < 1.5) {
                const boostAngle = Math.random() * Math.PI * 2;
                this.vx += Math.cos(boostAngle) * 0.5;
                this.vy += Math.sin(boostAngle) * 0.5;
            }
            
            // Limit maximum speed
            const maxSpeed = 5;
            if (currentSpeed > maxSpeed) {
                this.vx = (this.vx / currentSpeed) * maxSpeed;
                this.vy = (this.vy / currentSpeed) * maxSpeed;
            }
        }
        return true;
    }

    draw() {
        if (this.size <= 0 || this.popped) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw string
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.9);
        
        // Wavy string
        const stringWave = Math.sin(this.wobble * 2) * 10;
        ctx.quadraticCurveTo(stringWave, this.size + this.stringLength/2, 
                            0, this.size + this.stringLength);
        ctx.stroke();

        // Draw balloon pattern image
        const balloonImg = images.balloonPatterns[this.patternIndex];
        if (balloonImg && balloonImg.complete && balloonImg.naturalWidth > 0) {
            const scale = (this.size * 2.2) / Math.max(balloonImg.width, balloonImg.height);
            const width = balloonImg.width * scale;
            const height = balloonImg.height * scale;
            ctx.drawImage(balloonImg, -width/2, -height/2, width, height);
        }

        // Draw letter image on top of balloon
        const letterImg = images.letters[this.letterIndex];
        if (letterImg && letterImg.complete && letterImg.naturalWidth > 0 && this.size > 30) {
            const letterScale = (this.size * 0.8) / Math.max(letterImg.width, letterImg.height);
            const letterWidth = letterImg.width * letterScale;
            const letterHeight = letterImg.height * letterScale;
            ctx.drawImage(letterImg, -letterWidth/2, -letterHeight/2 - 5, letterWidth, letterHeight);
        }

        ctx.restore();
    }

    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx) / (this.size * this.size * 0.7) + 
               (dy * dy) / (this.size * this.size) < 1;
    }

    pop() {
        this.popped = true;
        // Create particles using balloon color
        const colors = ['#3bb3e0', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#e91e63', '#00bcd4'];
        const color = colors[this.patternIndex % colors.length];
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(this.x, this.y, color));
        }
        score++;
        scoreElement.textContent = score;
    }
}

// Particle class for burst effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = 5 + Math.random() * 10;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // Gravity
        this.vx *= 0.98;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
        return this.life > 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        // Draw irregular shape for balloon piece
        ctx.beginPath();
        ctx.moveTo(-this.size/2, -this.size/2);
        ctx.lineTo(this.size/2, -this.size/3);
        ctx.lineTo(this.size/2, this.size/2);
        ctx.lineTo(-this.size/3, this.size/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// Air Pump class
class AirPump {
    constructor() {
        this.pumpScale = 0.5; // Scale for pump images
        this.handleY = 0;
        this.maxHandleY = 50;
        this.pressing = false;
        this.pumpCount = 0;
        this.updatePosition();
    }

    updatePosition() {
        this.x = canvas.width - 150;
        this.y = canvas.height - 120;
        this.nozzleX = this.x - 150;
        this.nozzleY = this.y - 30;
    }

    draw() {
        this.updatePosition();
        
        if (!imagesLoaded) {
            // Draw loading placeholder
            ctx.fillStyle = '#ccc';
            ctx.fillRect(this.x - 60, this.y - 100, 120, 150);
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', this.x, this.y);
            return;
        }

        ctx.save();

        // Calculate dimensions based on loaded images
        let bodyWidth = 200, bodyHeight = 200;
        if (images.pumpBody.complete && images.pumpBody.naturalWidth > 0) {
            bodyWidth = images.pumpBody.width * this.pumpScale;
            bodyHeight = images.pumpBody.height * this.pumpScale;
        }

        // Draw pump handle
        if (images.pumpHandle.complete && images.pumpHandle.naturalWidth > 0) {
            const handleWidth = images.pumpHandle.width * this.pumpScale;
            const handleHeight = images.pumpHandle.height * this.pumpScale;
            ctx.drawImage(
                images.pumpHandle, 
                this.x - handleWidth/2, 
                this.y - bodyHeight/2 - handleHeight + 90 + this.handleY,

                handleWidth, 
                handleHeight
            );
        }

        // Draw pump body
        if (images.pumpBody.complete && images.pumpBody.naturalWidth > 0) {
            ctx.drawImage(
                images.pumpBody, 
                this.x - bodyWidth/2, 
                this.y - bodyHeight/2, 
                bodyWidth, 
                bodyHeight
            );
        }

        // Draw pump inflator/nozzle
        if (images.pumpInflator.complete && images.pumpInflator.naturalWidth > 0) {
            const inflatorWidth = images.pumpInflator.width * this.pumpScale;
            const inflatorHeight = images.pumpInflator.height * this.pumpScale;
            ctx.drawImage(
                images.pumpInflator, 
                this.nozzleX - inflatorWidth/2, 
                this.nozzleY - inflatorHeight/2, 
                inflatorWidth, 
                inflatorHeight
            );
        }

        // Draw small inflating balloon at nozzle
        if (inflatingBalloon && inflatingBalloon.inflating) {
            this.drawInflatingBalloon();
        }

        ctx.restore();
    }

    drawInflatingBalloon() {
        if (!inflatingBalloon) return;
        
        const b = inflatingBalloon;
        ctx.save();
        ctx.translate(this.nozzleX - 60, this.nozzleY - 75 - b.size);


        // Draw balloon pattern image
        const balloonImg = images.balloonPatterns[b.patternIndex];
        if (balloonImg && balloonImg.complete && balloonImg.naturalWidth > 0) {
            const scale = (b.size * 2.2) / Math.max(balloonImg.width, balloonImg.height);
            const width = balloonImg.width * scale;
            const height = balloonImg.height * scale;
            ctx.drawImage(balloonImg, -width/2, -height/2, width, height);
        }

        // Draw letter image
        const letterImg = images.letters[b.letterIndex];
        if (letterImg && letterImg.complete && letterImg.naturalWidth > 0 && b.size > 20) {
            const letterScale = (b.size * 0.6) / Math.max(letterImg.width, letterImg.height);
            const letterWidth = letterImg.width * letterScale;
            const letterHeight = letterImg.height * letterScale;
            ctx.drawImage(letterImg, -letterWidth/2, -letterHeight/2, letterWidth, letterHeight);
        }

        ctx.restore();
    }

    press() {
        if (!this.pressing) {
            this.pressing = true;
            this.pumpCount++;
            
            // Create new balloon if needed
            if (!inflatingBalloon || !inflatingBalloon.inflating) {
                const patternIndex = Math.floor(Math.random() * images.balloonPatterns.length);
                const letterIndex = currentLetterIndex % 26;
                currentLetterIndex++;
                inflatingBalloon = new Balloon(this.nozzleX, this.nozzleY - 80, patternIndex, letterIndex);
            }
        }
    }

    release() {
        this.pressing = false;
    }

    update() {
        // Animate handle
        if (this.pressing && this.handleY < this.maxHandleY) {
            this.handleY += 8;
        } else if (!this.pressing && this.handleY > 0) {
            // Return handle to top when released
            this.handleY -= 4;
        }

        this.handleY = Math.max(0, Math.min(this.maxHandleY, this.handleY));

        // Inflate balloon based on handle position (not pressing state)
        // Inflate while handle is down (handleY > 5 threshold to avoid jitter)
        if (inflatingBalloon && inflatingBalloon.inflating && this.handleY > 5) {
            inflatingBalloon.inflate(2.5);
        }

        // Check if balloon is done inflating
        if (inflatingBalloon && !inflatingBalloon.inflating && inflatingBalloon.flying) {
            // Transfer balloon to flying balloons array
            inflatingBalloon.x = this.nozzleX - 60;
            inflatingBalloon.y = this.nozzleY - 75 - inflatingBalloon.size;
            balloons.push(inflatingBalloon);
            inflatingBalloon = null;
            // Auto-release the pump when balloon is done
            this.pressing = false;
        }
    }

    containsHandle(x, y) {
        // Get handle dimensions and position
        let bodyHeight = 200;
        if (images.pumpBody.complete && images.pumpBody.naturalWidth > 0) {
            bodyHeight = images.pumpBody.height * this.pumpScale;
        }
        
        let handleWidth = 100;
        let handleHeight = 100;
        if (images.pumpHandle.complete && images.pumpHandle.naturalWidth > 0) {
            handleWidth = images.pumpHandle.width * this.pumpScale;
            handleHeight = images.pumpHandle.height * this.pumpScale;
        }
        
        const handleX = this.x - handleWidth/2;
        const handleY = this.y - bodyHeight/2 - handleHeight + 90 + this.handleY;
        
        // Check if click is within handle area
        return x >= handleX && x <= handleX + handleWidth &&
               y >= handleY && y <= handleY + handleHeight;
    }
}

// Back button class
class BackButton {
    constructor() {
        this.x = 50;
        this.y = 50;
        this.radius = 30;
    }

    draw() {
        ctx.save();
        
        // Button circle
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Arrow
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - 15);
        ctx.lineTo(this.x - 10, this.y);
        ctx.lineTo(this.x + 10, this.y + 15);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }
}

// Initialize game objects
let clouds = [];
let pump = new AirPump();
let backButton = new BackButton();

// Create clouds
function initClouds() {
    clouds = [];
    for (let i = 0; i < 8; i++) {
        clouds.push(new Cloud(
            Math.random() * canvas.width,
            Math.random() * (canvas.height * 0.6),
            0.5 + Math.random() * 0.5
        ));
    }
}
initClouds();

// Create birds
function initBirds() {
    birds = [];
    for (let i = 0; i < 3; i++) {
        birds.push(new Bird(
            Math.random() * canvas.width,
            100 + Math.random() * (canvas.height * 0.5)
        ));
    }
}
initBirds();

// Initialize weather
function initWeather() {
    // Create sun rays
    weather.sunRays = [];
    for (let i = 0; i < 12; i++) {
        weather.sunRays.push(new SunRay(i, 12));
    }
    
    // Create stars
    weather.stars = [];
    for (let i = 0; i < 100; i++) {
        weather.stars.push(new Star());
    }
}
initWeather();

function changeWeather() {
    const weatherTypes = ['sunny', 'rainy', 'cloudy'];
    const currentIndex = weatherTypes.indexOf(weather.type);
    weather.type = weatherTypes[(currentIndex + 1) % weatherTypes.length];
    weather.raindrops = [];
}

function updateWeather() {
    // Update day/night cycle
    weather.timeOfDay += weather.dayNightSpeed;
    if (weather.timeOfDay > 1) {
        weather.timeOfDay = 0;
    }
    
    // Save weather state to localStorage
    localStorage.setItem('balloonGameWeather', JSON.stringify({
        type: weather.type,
        timeOfDay: weather.timeOfDay,
        dayNightSpeed: weather.dayNightSpeed,
        changeInterval: weather.changeInterval
    }));
    
    // Change weather periodically
    if (Date.now() - weather.lastChange > weather.changeInterval) {
        changeWeather();
        weather.lastChange = Date.now();
    }

    // Update raindrops
    if (weather.type === 'rainy') {
        // Add new raindrops
        if (Math.random() < 0.3) {
            weather.raindrops.push(new Raindrop());
        }
        // Update existing raindrops
        weather.raindrops = weather.raindrops.filter(drop => drop.update());
    }
}

function getBackgroundColors() {
    const t = weather.timeOfDay;
    let topColor, bottomColor;
    
    // Dawn (0-0.25): Dark to light
    if (t < 0.25) {
        const progress = t / 0.25;
        topColor = lerpColor([25, 25, 50], [135, 206, 235], progress);
        bottomColor = lerpColor([15, 15, 35], [245, 230, 163], progress);
    }
    // Day (0.25-0.5): Full daylight
    else if (t < 0.5) {
        topColor = [135, 206, 235];
        bottomColor = [245, 230, 163];
    }
    // Dusk (0.5-0.75): Light to dark
    else if (t < 0.75) {
        const progress = (t - 0.5) / 0.25;
        topColor = lerpColor([135, 206, 235], [50, 30, 80], progress);
        bottomColor = lerpColor([245, 230, 163], [30, 20, 50], progress);
    }
    // Night (0.75-1): Full night
    else {
        topColor = [25, 25, 50];
        bottomColor = [15, 15, 35];
    }
    
    return {
        top: `rgb(${topColor[0]}, ${topColor[1]}, ${topColor[2]})`,
        bottom: `rgb(${bottomColor[0]}, ${bottomColor[1]}, ${bottomColor[2]})`
    };
}

function lerpColor(color1, color2, t) {
    return [
        Math.round(color1[0] + (color2[0] - color1[0]) * t),
        Math.round(color1[1] + (color2[1] - color1[1]) * t),
        Math.round(color1[2] + (color2[2] - color1[2]) * t)
    ];
}

function drawWeather() {
    const t = weather.timeOfDay;
    const isDaytime = t >= 0.25 && t <= 0.75;
    const isNighttime = t < 0.25 || t > 0.75;
    
    // Calculate celestial body position (sun/moon)
    const celestialX = canvas.width - 100;
    const celestialY = 80;
    
    if (weather.type === 'sunny' && isDaytime) {
        // Draw sun
        // Sun rays
        weather.sunRays.forEach(ray => ray.draw(Date.now()));
        
        // Sun circle
        const sunGradient = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, 40);
        sunGradient.addColorStop(0, '#fff9e6');
        sunGradient.addColorStop(0.5, '#ffeb3b');
        sunGradient.addColorStop(1, '#ffd700');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 40, 0, Math.PI * 2);
        ctx.fill();
    } else if (isNighttime) {
        // Draw moon
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
    
    if (weather.type === 'rainy') {
        // Draw rain
        weather.raindrops.forEach(drop => drop.draw());
        
        // Dark overlay for rain
        ctx.fillStyle = 'rgba(100, 120, 140, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (weather.type === 'cloudy') {
        // Extra dark clouds (already have clouds in background)
        ctx.fillStyle = 'rgba(200, 200, 210, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Input handling
let mouseDown = false;
let gameOverButton = null;

function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function handleStart(e) {
    e.preventDefault();
    const pos = getEventPos(e);
    mouseDown = true;

    // Check if clicking Try Again button
    if (gameOver && gameOverButton) {
        if (pos.x >= gameOverButton.x && pos.x <= gameOverButton.x + gameOverButton.width &&
            pos.y >= gameOverButton.y && pos.y <= gameOverButton.y + gameOverButton.height) {
            // Reset game
            gameOver = false;
            score = 0;
            scoreElement.textContent = score;
            balloons = [];
            particles = [];
            inflatingBalloon = null;
            currentLetterIndex = 0;
            initBirds();
            return;
        }
        return;
    }

    // Check back button
    if (backButton.contains(pos.x, pos.y)) {
        // Reset game
        score = 0;
        scoreElement.textContent = score;
        balloons = [];
        currentLetterIndex = 0;
        return;
    }

    // Check if clicking on birds (game over)
    for (let i = birds.length - 1; i >= 0; i--) {
        if (birds[i].contains(pos.x, pos.y)) {
            gameOver = true;
            return;
        }
    }

    // Check if clicking on flying balloons to pop them
    for (let i = balloons.length - 1; i >= 0; i--) {
        if (balloons[i].contains(pos.x, pos.y) && balloons[i].flying) {
            balloons[i].pop();
            return;
        }
    }

    // Check pump handle
    if (pump.containsHandle(pos.x, pos.y)) {
        pump.press();
    }
}

function handleMove(e) {
    e.preventDefault();
}

function handleEnd(e) {
    e.preventDefault();
    mouseDown = false;
    pump.release();
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });
canvas.addEventListener('touchcancel', handleEnd, { passive: false });

// Game loop
function update() {
    if (gameOver) return;
    
    // Update weather
    updateWeather();
    
    // Update clouds
    clouds.forEach(cloud => cloud.update());

    // Update birds
    birds.forEach(bird => bird.update());

    // Update pump
    pump.update();

    // Update balloons
    balloons = balloons.filter(balloon => {
        if (balloon.popped) return false;
        return balloon.update();
    });

    // Update particles
    particles = particles.filter(particle => particle.update());
}

function draw() {
    // Clear canvas with dynamic background based on time of day
    const bgColors = getBackgroundColors();
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, bgColors.top);
    gradient.addColorStop(1, bgColors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars if night time
    const nightIntensity = Math.max(0, weather.timeOfDay < 0.25 ? (0.25 - weather.timeOfDay) / 0.25 : 
                                      weather.timeOfDay > 0.75 ? (weather.timeOfDay - 0.75) / 0.25 : 0);
    if (nightIntensity > 0) {
        weather.stars.forEach(star => star.draw(Date.now(), nightIntensity));
    }

    // Draw clouds
    clouds.forEach(cloud => cloud.draw());

    // Draw weather effects
    drawWeather();

    // Draw birds
    birds.forEach(bird => bird.draw());

    // Draw balloons
    balloons.forEach(balloon => balloon.draw());

    // Draw particles
    particles.forEach(particle => particle.draw());

    // Draw pump
    pump.draw();

    // Draw back button
    backButton.draw();

    // Draw developer credit
    const isNight = weather.timeOfDay < 0.25 || weather.timeOfDay > 0.75;
    ctx.fillStyle = isNight ? 'rgba(255, 50, 50, 0.8)' : 'rgba(8, 8, 8, 0.6)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Developed by Sushil', 10, canvas.height - 10);

    // Draw game over modal
    if (gameOver) {
        drawGameOverModal();
    }
}

function drawGameOverModal() {
    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Modal background
    const modalWidth = 400;
    const modalHeight = 350;
    const modalX = (canvas.width - modalWidth) / 2;
    const modalY = (canvas.height - modalHeight) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    roundRect(modalX, modalY, modalWidth, modalHeight, 20);
    ctx.fill();
    ctx.stroke();

    // Big red cross
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    const crossSize = 80;
    const crossX = canvas.width / 2;
    const crossY = modalY + 80;
    
    ctx.beginPath();
    ctx.moveTo(crossX - crossSize/2, crossY - crossSize/2);
    ctx.lineTo(crossX + crossSize/2, crossY + crossSize/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(crossX + crossSize/2, crossY - crossSize/2);
    ctx.lineTo(crossX - crossSize/2, crossY + crossSize/2);
    ctx.stroke();

    // Game Over text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over!', canvas.width / 2, crossY + 80);

    // Score text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Your Score: ' + score, canvas.width / 2, crossY + 120);

    // Try Again button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = crossY + 160;

    // Button background
    const gradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    gradient.addColorStop(0, '#3bb3e0');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    ctx.fill();
    
    ctx.strokeStyle = '#1a5276';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Button text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Try Again', canvas.width / 2, buttonY + buttonHeight / 2);

    // Store button bounds for click detection
    gameOverButton = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
}

function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    initClouds();
    initBirds();
});

// Loading screen and instruction modal management
function checkLoadingComplete() {
    if (imagesLoaded) {
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        // Show instruction modal
        const instructionModal = document.getElementById('instructionModal');
        if (instructionModal) {
            instructionModal.classList.add('show');
        }
    } else {
        setTimeout(checkLoadingComplete, 100);
    }
}

// Make closeInstructions globally accessible
window.closeInstructions = function() {
    const instructionModal = document.getElementById('instructionModal');
    if (instructionModal) {
        instructionModal.classList.remove('show');
    }
};

// Start checking for loading completion
checkLoadingComplete();
