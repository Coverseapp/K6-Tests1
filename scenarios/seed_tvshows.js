/**
 * SEED DATA TEST - TV Shows
 * 
 * Bu test veritabanına çok sayıda TV dizisi ekler.
 * Amaç: Index eksikliklerini tespit etmek için büyük veri seti oluşturmak.
 * 
 * Kullanım:
 *   k6 run scenarios/seed_tvshows.js
 *   k6 run --env START_ID=1 --env END_ID=50000 scenarios/seed_tvshows.js
 *   k6 run --env BASE_URL=http://api.example.com/api scenarios/seed_tvshows.js
 * 
 * Not: TMDB TV show ID'leri 1'den başlayıp yüz binlere kadar gider.
 */

import { sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getTvShowPage } from '../lib/requests.js';
import { seedThresholds, randomInt } from '../lib/config.js';

// Custom metrics
const tvShowsAdded = new Counter('tvshows_added');
const tvShowsNotFound = new Counter('tvshows_not_found');
const tvShowsFailed = new Counter('tvshows_failed');
const addTvShowDuration = new Trend('add_tvshow_duration');

// Config from env vars
const START_ID = parseInt(__ENV.START_ID) || 1;
const END_ID = parseInt(__ENV.END_ID) || 10000;
const RANDOM_MODE = __ENV.RANDOM_MODE === 'true';

export const options = {
    scenarios: {
        seed_tvshows: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: Math.ceil((END_ID - START_ID) / 10),
            maxDuration: '60m',
        },
    },
    thresholds: seedThresholds,
};

export function setup() {
    console.log(`📺 TV Show Seed Test Starting`);
    console.log(`   ID Range: ${START_ID} - ${END_ID}`);
    console.log(`   Mode: ${RANDOM_MODE ? 'Random' : 'Sequential'}`);
    console.log(`   Expected requests: ${END_ID - START_ID}`);
    return { startTime: new Date().toISOString() };
}

export default function () {
    const vuId = __VU;
    const iterNum = __ITER;
    
    let tvShowId;
    if (RANDOM_MODE) {
        tvShowId = randomInt(START_ID, END_ID);
    } else {
        tvShowId = START_ID + (vuId - 1) + (iterNum * 10);
        if (tvShowId > END_ID) return;
    }
    
    const startTime = Date.now();
    const res = getTvShowPage(tvShowId);
    const duration = Date.now() - startTime;
    
    addTvShowDuration.add(duration);
    
    if (res.status === 200) {
        tvShowsAdded.add(1);
    } else if (res.status === 404) {
        tvShowsNotFound.add(1);
    } else {
        tvShowsFailed.add(1);
        console.log(`❌ TV Show ${tvShowId} failed with status ${res.status}`);
    }
    
    sleep(0.1);
}

export function teardown(data) {
    console.log(`\n📺 TV Show Seed Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
}
