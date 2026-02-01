// ==========================================
// GAME CONFIGURATION
// ==========================================

const CONFIG = {
    // Game limits
    MAX_BALLOONS: 20,
    
    // Balloon settings
    BALLOON: {
        MAX_SIZE: 80,
        STRING_LENGTH: 60,
        MIN_SPEED: 1.5,
        MAX_SPEED: 5,
        BOUNCE_ENERGY: 0.95,
        INFLATE_AMOUNT: 2.5,
        WOBBLE_SPEED_MIN: 0.05,
        WOBBLE_SPEED_MAX: 0.1
    },
    
    // Pump settings
    PUMP: {
        SCALE: 0.5,
        MAX_HANDLE_Y: 50,
        HANDLE_SPEED_DOWN: 8,
        HANDLE_SPEED_UP: 4,
        AUTO_PUMP_SPEED: 6
    },
    
    // Bird settings
    BIRD: {
        SIZE: 40,
        SPEED_MIN: 2,
        SPEED_MAX: 4,
        WING_SPEED: 0.15,
        COUNT: 3
    },
    
    // Cloud settings
    CLOUD: {
        COUNT: 8,
        SPEED_MIN: 0.2,
        SPEED_MAX: 0.5
    },
    
    // Weather settings
    WEATHER: {
        CHANGE_INTERVAL: 15000,
        DAY_NIGHT_SPEED: 0.00005,
        STAR_COUNT: 100,
        SUN_RAY_COUNT: 12
    },
    
    // Particle settings
    PARTICLE: {
        COUNT: 20,
        SIZE_MIN: 5,
        SIZE_MAX: 15,
        SPEED: 15,
        GRAVITY: 0.3
    },
    
    // Special balloon settings
    SPECIAL_BALLOON: {
        SPAWN_CHANCE: 0.15,  // 15% chance for special balloon
        GOLDEN: {
            POINTS: 5,
            COLOR: '#FFD700',
            GLOW_COLOR: 'rgba(255, 215, 0, 0.5)'
        },
        TIME_FREEZE: {
            DURATION: 3000,  // 3 seconds freeze
            COLOR: '#00BFFF',
            GLOW_COLOR: 'rgba(0, 191, 255, 0.5)'
        },
        BOMB: {
            RADIUS: 150,  // Explosion radius
            COLOR: '#FF4444',
            GLOW_COLOR: 'rgba(255, 68, 68, 0.5)'
        }
    },
    
    // Score popup settings
    SCORE_POPUP: {
        RISE_SPEED: 2,
        FADE_SPEED: 0.02,
        FONT_SIZE: 28
    },
    
    // Colors
    COLORS: {
        BALLOON: ['#3bb3e0', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#e91e63', '#00bcd4'],
        BIRD: ['#FF6B6B', '#4ECDC4']
    },
    
    // Pattern files
    PATTERNS: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]
};

// Storage keys
const STORAGE_KEYS = {
    HIGH_SCORE: 'balloonGameHighScore',
    WEATHER: 'balloonGameWeather'
};
