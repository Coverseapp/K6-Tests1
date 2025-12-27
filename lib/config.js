// K6 Test Configuration
// Common configuration for all load tests

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api';

// Thresholds - performance SLOs
export const defaultThresholds = {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    http_reqs: ['rate>100'],                          // Min 100 req/s
};

export const seedThresholds = {
    http_req_duration: ['p(95)<2000'],  // Seed operations can be slower
    http_req_failed: ['rate<1'],     // Allow up to 5% errors (404s for non-existent IDs)
};

export const feedThresholds = {
    http_req_duration: ['p(95)<300', 'p(99)<500'],  // Feed should be fast
    http_req_failed: ['rate<0.01'],
};

// Load test stages
export const smokeTest = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
    ],
};

export const loadTest = {
    stages: [
        { duration: '1m', target: 50 },    // Ramp up
        { duration: '3m', target: 50 },    // Stay at 50 users
        { duration: '1m', target: 100 },   // Increase to 100
        { duration: '3m', target: 100 },   // Stay at 100
        { duration: '2m', target: 0 },     // Ramp down
    ],
};

export const stressTest = {
    stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
    ],
};

export const spikeTest = {
    stages: [
        { duration: '1m', target: 10 },
        { duration: '10s', target: 500 },   // Spike!
        { duration: '3m', target: 500 },
        { duration: '10s', target: 10 },
        { duration: '1m', target: 0 },
    ],
};

// Seed test - for populating database
export const seedTest = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '10m', target: 10 },   // Long duration for seeding
        { duration: '30s', target: 0 },
    ],
};

export const heavySeedTest = {
    stages: [
        { duration: '1m', target: 20 },
        { duration: '30m', target: 20 },   // Very long for heavy seeding
        { duration: '1m', target: 0 },
    ],
};

// Random helpers
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement(arr) {
    return arr[randomInt(0, arr.length - 1)];
}

export function randomDate(startYear = 2020, endYear = 2024) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
        .toISOString().split('T')[0];
}

export function randomText(wordCount = 10) {
    const words = ['great', 'movie', 'amazing', 'story', 'characters', 'acting', 'loved', 
                   'perfect', 'beautiful', 'incredible', 'masterpiece', 'boring', 'slow',
                   'exciting', 'thrilling', 'emotional', 'funny', 'sad', 'epic', 'classic'];
    let text = '';
    for (let i = 0; i < wordCount; i++) {
        text += randomElement(words) + ' ';
    }
    return text.trim();
}
