// Configuration for API endpoints
// Update these URLs after deploying your backends

const CONFIG = {
    // For local development
    LOCAL: {
        API_BASE_URL: 'http://localhost:5000',
        DEEPFACE_URL: 'http://localhost:5001'
    },
    
    // For production (GitHub Pages)
    PRODUCTION: {
        // Replace these with your actual deployed backend URLs
        API_BASE_URL: 'https://epscord-password-manager-api.hf.space',  // Your Node.js backend
        DEEPFACE_URL: 'https://epscord-password-manager-deepface.hf.space'      // Your Python backend
    }
};

// Automatically detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';

// Export the appropriate config
const API_BASE_URL = isLocalhost ? CONFIG.LOCAL.API_BASE_URL : CONFIG.PRODUCTION.API_BASE_URL;
const DEEPFACE_URL = isLocalhost ? CONFIG.LOCAL.DEEPFACE_URL : CONFIG.PRODUCTION.DEEPFACE_URL;
