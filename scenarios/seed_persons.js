/**
 * SEED DATA TEST - Persons (Actors, Directors, etc.)
 * 
 * Bu test veritabanına çok sayıda person (oyuncu, yönetmen vs.) ekler.
 * 
 * Kullanım:
 *   k6 run scenarios/seed_persons.js
 *   k6 run --env START_ID=1 --env END_ID=100000 scenarios/seed_persons.js
 */

import { sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import http from 'k6/http';
import { getPersonPage } from '../lib/requests.js';
import { seedThresholds, randomInt } from '../lib/config.js';
import { NotFoundPersonIds } from '../lib/data_manager.js';
// Custom metrics
const personsAdded = new Counter('persons_added');
const personsNotFound = new Counter('persons_not_found');
const personsFailed = new Counter('persons_failed');
const addPersonDuration = new Trend('add_person_duration');


const START_ID = parseInt(__ENV.START_ID) || 1;
const END_ID = parseInt(__ENV.END_ID) || 5000;
const RANDOM_MODE = __ENV.RANDOM_MODE === 'true';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 404));

const notFoundedIdsSet = new Set(NotFoundPersonIds);

export const options = {
    scenarios: {
        seed_persons: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: Math.ceil((END_ID - START_ID) / 10),
            maxDuration: '60m',
        },
    },
    thresholds: seedThresholds,
};

export function setup() {
    console.log(`👤 Person Seed Test Starting`);
    console.log(`   ID Range: ${START_ID} - ${END_ID}`);
    console.log(`   Mode: ${RANDOM_MODE ? 'Random' : 'Sequential'}`);
    console.log(`   Skipping ${NotFoundPersonIds.length} already known not-found IDs`);
    return { startTime: new Date().toISOString() };
}

export default function () {
    const vuId = __VU;
    const iterNum = __ITER;
    
    let personId;
    if (RANDOM_MODE) {
        personId = randomInt(START_ID, END_ID, NotFoundPersonIds);
    } else {
        personId = START_ID + vuId - 1 + (iterNum * 10);
        while (notFoundedIdsSet.has(personId)) personId += 10;
        if (personId > END_ID) return;
    }
    
    const startTime = Date.now();
    const res = getPersonPage(personId, null, true, true);
    const duration = Date.now() - startTime;
    
    addPersonDuration.add(duration);
    
    if (res.status === 200) {
        personsAdded.add(1);
    } else if (res.status === 404) {
        personsNotFound.add(1);
        console.log(`NOTFOUND_PERSON_ID:${personId}`);
    } else {
        personsFailed.add(1);
    }
    
    sleep(0.1);
}

export function teardown(data) {
    console.log(`\n👤 Person Seed Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
}
