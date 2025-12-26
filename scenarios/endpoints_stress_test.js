/**
 * API ENDPOINTS STRESS TEST
 * 
 * Tüm kritik endpoint'leri aynı anda test eder.
 * Index eksikliklerini ve bottleneck'leri tespit etmek için kullanılır.
 * 
 * Kullanım:
 *   k6 run scenarios/endpoints_stress_test.js
 *   k6 run --env TEST_TYPE=stress scenarios/endpoints_stress_test.js
 */

import { sleep, check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import * as requests from '../lib/requests.js';
import {
    randomElement,
    randomInt,
    randomText,
    smokeTest,
    loadTest,
    stressTest,
    spikeTest,
} from '../lib/config.js';

// Load test data
const Users = new SharedArray('users', () => {
    const txtfile = open('../datasets/users.txt');
    return txtfile.split('\n').filter(line => line.trim() !== '');
});

const MovieIds = new SharedArray('movies', () => {
    try {
        const txtfile = open('../datasets/movie_ids_in_db.txt');
        return txtfile.split('\n').filter(line => line.trim() !== '');
    } catch (e) { return []; }
});

const PersonIds = new SharedArray('persons', () => {
    try {
        const txtfile = open('../datasets/person_ids_in_db.txt');
        return txtfile.split('\n').filter(line => line.trim() !== '');
    } catch (e) { return []; }
});

// Metrics per endpoint
const endpointDuration = new Trend('endpoint_duration', true);
const endpointSuccess = new Counter('endpoint_success');
const endpointFailed = new Counter('endpoint_failed');

// Test config
const TEST_TYPE = __ENV.TEST_TYPE || 'load';
const testConfigs = {
    smoke: smokeTest,
    load: loadTest,
    stress: stressTest,
    spike: spikeTest,
};

export const options = {
    scenarios: {
        feed_endpoints: {
            executor: 'ramping-vus',
            stages: testConfigs[TEST_TYPE].stages,
            exec: 'testFeedEndpoints',
        },
        content_endpoints: {
            executor: 'ramping-vus',
            stages: testConfigs[TEST_TYPE].stages,
            exec: 'testContentEndpoints',
            startTime: '5s',
        },
        profile_endpoints: {
            executor: 'ramping-vus',
            stages: testConfigs[TEST_TYPE].stages,
            exec: 'testProfileEndpoints',
            startTime: '10s',
        },
        interaction_endpoints: {
            executor: 'ramping-vus',
            stages: testConfigs[TEST_TYPE].stages,
            exec: 'testInteractionEndpoints',
            startTime: '15s',
        },
    },
    thresholds: {
        'endpoint_duration': ['p(95)<1000', 'p(99)<2000'],
        'endpoint_duration{endpoint:feed_following}': ['p(95)<500'],
        'endpoint_duration{endpoint:feed_discovery}': ['p(95)<500'],
        'endpoint_duration{endpoint:movie_page}': ['p(95)<800'],
        'endpoint_duration{endpoint:profile_page}': ['p(95)<600'],
        'http_req_failed': ['rate<0.05'],
    },
};

export function setup() {
    console.log(`🔥 Endpoints Stress Test Starting`);
    console.log(`   Test Type: ${TEST_TYPE}`);
    console.log(`   Users: ${Users.length}`);
    console.log(`   Movies in DB: ${MovieIds.length}`);
    console.log(`   Persons in DB: ${PersonIds.length}`);
    return { startTime: new Date().toISOString() };
}

// ============================================
// FEED ENDPOINTS
// ============================================
export function testFeedEndpoints() {
    const userId = randomElement(Users);
    const modes = ['following', 'discovery', 'explore', 'chronological'];
    
    for (const mode of modes) {
        group(`Feed - ${mode}`, () => {
            const start = Date.now();
            const res = requests.getFeed(userId, mode, 20, null);
            const duration = Date.now() - start;
            
            endpointDuration.add(duration, { endpoint: `feed_${mode}` });
            
            if (res.status === 200) {
                endpointSuccess.add(1);
            } else {
                endpointFailed.add(1);
            }
        });
        
        sleep(0.5);
    }
    
    sleep(randomInt(1, 2));
}

// ============================================
// CONTENT ENDPOINTS
// ============================================
export function testContentEndpoints() {
    const userId = randomElement(Users);
    
    // Movie page
    group('Movie Page', () => {
        const movieId = MovieIds.length > 0 
            ? randomElement(MovieIds) 
            : randomInt(1, 500);
            
        const start = Date.now();
        const res = requests.getMoviePage(movieId, userId);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'movie_page' });
        
        if (res.status === 200 || res.status === 404) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(0.5);
    
    // TV Show page
    group('TV Show Page', () => {
        const tvShowId = randomInt(1, 300);
        
        const start = Date.now();
        const res = requests.getTvShowPage(tvShowId, userId);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'tvshow_page' });
        
        if (res.status === 200 || res.status === 404) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(0.5);
    
    // Person page
    group('Person Page', () => {
        const personId = PersonIds.length > 0 
            ? randomElement(PersonIds) 
            : randomInt(1, 1000);
            
        const start = Date.now();
        const res = requests.getPersonPage(personId, userId);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'person_page' });
        
        if (res.status === 200 || res.status === 404) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(randomInt(1, 2));
}

// ============================================
// PROFILE ENDPOINTS
// ============================================
export function testProfileEndpoints() {
    const userId = randomElement(Users);
    const targetUser = randomElement(Users);
    
    // Profile page
    group('Profile Page', () => {
        const start = Date.now();
        const res = requests.getProfilePage(targetUser, userId);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'profile_page' });
        
        if (res.status === 200) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(0.5);
    
    // Followers
    group('Followers List', () => {
        const start = Date.now();
        const res = requests.getFollowers(targetUser, 1, 20);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'followers_list' });
        
        if (res.status === 200) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(0.5);
    
    // Following
    group('Following List', () => {
        const start = Date.now();
        const res = requests.getFollowing(targetUser, 1, 20);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'following_list' });
        
        if (res.status === 200) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(randomInt(1, 2));
}

// ============================================
// INTERACTION ENDPOINTS
// ============================================
export function testInteractionEndpoints() {
    const userId = randomElement(Users);
    
    // Search
    group('Search', () => {
        const queries = ['batman', 'star wars', 'inception', 'breaking bad', 'matrix'];
        const query = randomElement(queries);
        
        const start = Date.now();
        const res = requests.searchContent(query, 1, 20);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'search' });
        
        if (res.status === 200) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(0.5);
    
    // Communities
    group('Communities List', () => {
        const start = Date.now();
        const res = requests.getCommunities(1, 20);
        const duration = Date.now() - start;
        
        endpointDuration.add(duration, { endpoint: 'communities_list' });
        
        if (res.status === 200) {
            endpointSuccess.add(1);
        } else {
            endpointFailed.add(1);
        }
    });
    
    sleep(randomInt(1, 2));
}

export function teardown(data) {
    console.log(`\n🔥 Endpoints Stress Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
}
