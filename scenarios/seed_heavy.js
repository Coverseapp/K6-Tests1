/**
 * HEAVY SEED TEST - Bulk Data Population
 * 
 * Bu test veritabanına maksimum hızda veri ekler.
 * Tüm content tiplerini (movie, tvshow, person) paralel olarak seed eder.
 * 
 * ⚠️ UYARI: Bu test çok yoğun! Production'da kullanmayın.
 * 
 * Kullanım:
 *   k6 run scenarios/seed_heavy.js
 *   k6 run --env MOVIE_START=1 --env MOVIE_END=100000 scenarios/seed_heavy.js
 */

import { sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getMoviePage, getTvShowPage, getPersonPage } from '../lib/requests.js';
import { randomInt } from '../lib/config.js';

// Custom metrics
const contentAdded = new Counter('content_added');
const contentNotFound = new Counter('content_not_found');
const contentFailed = new Counter('content_failed');
const requestDuration = new Trend('request_duration');

// Config - ID ranges for each content type
const MOVIE_START = parseInt(__ENV.MOVIE_START) || 1;
const MOVIE_END = parseInt(__ENV.MOVIE_END) || 50000;
const TVSHOW_START = parseInt(__ENV.TVSHOW_START) || 1;
const TVSHOW_END = parseInt(__ENV.TVSHOW_END) || 30000;
const PERSON_START = parseInt(__ENV.PERSON_START) || 1;
const PERSON_END = parseInt(__ENV.PERSON_END) || 100000;

export const options = {
    scenarios: {
        movies: {
            executor: 'constant-arrival-rate',
            rate: 50,           // 50 requests per second
            timeUnit: '1s',
            duration: '30m',
            preAllocatedVUs: 20,
            maxVUs: 50,
            exec: 'seedMovies',
        },
        tvshows: {
            executor: 'constant-arrival-rate',
            rate: 30,
            timeUnit: '1s',
            duration: '30m',
            preAllocatedVUs: 15,
            maxVUs: 30,
            exec: 'seedTvShows',
            startTime: '1s',    // Slight offset
        },
        persons: {
            executor: 'constant-arrival-rate',
            rate: 40,
            timeUnit: '1s',
            duration: '30m',
            preAllocatedVUs: 15,
            maxVUs: 40,
            exec: 'seedPersons',
            startTime: '2s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],  // Daha toleranslı - seed yoğun
        http_req_failed: ['rate<0.10'],     // %10 hata toleransı (404'ler dahil)
    },
};

export function setup() {
    console.log(`🚀 HEAVY SEED TEST Starting`);
    console.log(`   Movies: ${MOVIE_START} - ${MOVIE_END} (${MOVIE_END - MOVIE_START} potential)`);
    console.log(`   TV Shows: ${TVSHOW_START} - ${TVSHOW_END} (${TVSHOW_END - TVSHOW_START} potential)`);
    console.log(`   Persons: ${PERSON_START} - ${PERSON_END} (${PERSON_END - PERSON_START} potential)`);
    console.log(`   Estimated duration: 30 minutes`);
    return { startTime: new Date().toISOString() };
}

export function seedMovies() {
    const movieId = randomInt(MOVIE_START, MOVIE_END);
    
    const startTime = Date.now();
    const res = getMoviePage(movieId);
    requestDuration.add(Date.now() - startTime);
    
    if (res.status === 200) {
        contentAdded.add(1);
    } else if (res.status === 404) {
        contentNotFound.add(1);
    } else {
        contentFailed.add(1);
    }
}

export function seedTvShows() {
    const tvShowId = randomInt(TVSHOW_START, TVSHOW_END);
    
    const startTime = Date.now();
    const res = getTvShowPage(tvShowId);
    requestDuration.add(Date.now() - startTime);
    
    if (res.status === 200) {
        contentAdded.add(1);
    } else if (res.status === 404) {
        contentNotFound.add(1);
    } else {
        contentFailed.add(1);
    }
}

export function seedPersons() {
    const personId = randomInt(PERSON_START, PERSON_END);
    
    const startTime = Date.now();
    const res = getPersonPage(personId);
    requestDuration.add(Date.now() - startTime);
    
    if (res.status === 200) {
        contentAdded.add(1);
    } else if (res.status === 404) {
        contentNotFound.add(1);
    } else {
        contentFailed.add(1);
    }
}

export function teardown(data) {
    console.log(`\n🚀 HEAVY SEED TEST Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
    console.log(`   Check metrics for added/notfound/failed counts`);
}
