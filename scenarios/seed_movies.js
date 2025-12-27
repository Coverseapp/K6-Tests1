/**
 * SEED DATA TEST - Movies
 * 
 * Bu test veritabanına çok sayıda film ekler.
 * Amaç: Index eksikliklerini tespit etmek için büyük veri seti oluşturmak.
 * 
 * Kullanım:
 *   k6 run scenarios/seed_movies.js
 *   k6 run --env START_ID=1 --env END_ID=50000 scenarios/seed_movies.js
 *   k6 run --env BASE_URL=http://api.example.com/api scenarios/seed_movies.js
 * 
 * Not: TMDB movie ID'leri 1'den başlayıp milyonlara kadar gider.
 * Popüler filmler genellikle düşük ID'lere sahip.
 */

import { sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getMoviePage } from '../lib/requests.js';
import { seedThresholds, randomInt } from '../lib/config.js';

// Custom metrics
const moviesAdded = new Counter('movies_added');
const moviesNotFound = new Counter('movies_not_found');
const moviesFailed = new Counter('movies_failed');
const addMovieDuration = new Trend('add_movie_duration');

// Config from env vars
const START_ID = parseInt(__ENV.START_ID) || 1;
const END_ID = parseInt(__ENV.END_ID) || 10000;
const RANDOM_MODE = __ENV.RANDOM_MODE === 'false'; // true = random IDs, false = sequential

export const options = {
    scenarios: {
        seed_movies: {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: END_ID - START_ID,
            maxDuration: '60m',
        },
    },
    thresholds: seedThresholds,
};

export function setup() {
    console.log(`🎬 Movie Seed Test Starting`);
    console.log(`   ID Range: ${START_ID} - ${END_ID}`);
    console.log(`   Mode: ${RANDOM_MODE ? 'Random' : 'Sequential'}`);
    console.log(`   Expected requests: ${END_ID - START_ID}`);
    return { startTime: new Date().toISOString() };
}

export default function () {
    const vuId = __VU;
    const iterNum = __ITER;
    
    let movieId;
    if (RANDOM_MODE) {
        // Random mode - pick random IDs from range
        movieId = randomInt(START_ID, END_ID);
    } else {
        // Sequential mode - each VU handles a portion
        movieId = START_ID + (vuId - 1) + (iterNum * 10);
        if (movieId > END_ID) return;
    }
    
    const startTime = Date.now();
    const res = getMoviePage(movieId);
    const duration = Date.now() - startTime;
    
    addMovieDuration.add(duration);
    
    if (res.status === 200) {
        moviesAdded.add(1);
    } else if (res.status === 404) {
        moviesNotFound.add(1);
    } else {
        moviesFailed.add(1);
        console.log(` Movie ${movieId} failed with status ${res.status}`);
        console.log(` Response: ${res.body}`);
    }
    
    // Small delay to not overwhelm the API
    sleep(0.1);
}

export function teardown(data) {
    console.log(`\n🎬 Movie Seed Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
}
