/**
 * DATABASE INDEX DETECTION TEST
 * 
 * Bu test özellikle index eksikliklerini tespit etmek için tasarlanmıştır.
 * Büyük veri setlerinde yavaş sorgular oluşturabilecek endpoint'leri test eder.
 * 
 * Amaç:
 * - N+1 query problemlerini tespit
 * - Missing index'leri tespit
 * - Full table scan yapan sorguları tespit
 * 
 * Kullanım:
 *   k6 run scenarios/index_detection_test.js
 * 
 * Test sonuçlarında p95 > 500ms olan endpoint'lerde index sorunu olabilir.
 */

import { sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import * as requests from '../lib/requests.js';
import { randomElement, randomInt, randomText } from '../lib/config.js';

// Load test data
const Users = new SharedArray('users', () => {
    const txtfile = open('../datasets/users.txt');
    return txtfile.split('\n').filter(line => line.trim() !== '');
});

// Detailed metrics per query pattern
const queryDuration = new Trend('query_duration', true);
const slowQueries = new Counter('slow_queries'); // > 500ms
const verySlowQueries = new Counter('very_slow_queries'); // > 1000ms

// High concurrency for detecting lock contention
export const options = {
    scenarios: {
        // High concurrency feed queries
        feed_queries: {
            executor: 'constant-vus',
            vus: 50,
            duration: '5m',
            exec: 'testFeedQueries',
        },
        // Paginated list queries
        list_queries: {
            executor: 'constant-vus',
            vus: 30,
            duration: '5m',
            exec: 'testListQueries',
            startTime: '30s',
        },
        // Search queries (full-text search)
        search_queries: {
            executor: 'constant-vus',
            vus: 20,
            duration: '5m',
            exec: 'testSearchQueries',
            startTime: '1m',
        },
        // Write + Read mixed (for lock detection)
        mixed_operations: {
            executor: 'constant-vus',
            vus: 20,
            duration: '5m',
            exec: 'testMixedOperations',
            startTime: '1m30s',
        },
    },
    thresholds: {
        // Strict thresholds to detect slow queries
        'query_duration{query:feed_following}': ['p(50)<100', 'p(95)<300'],
        'query_duration{query:feed_discovery}': ['p(50)<150', 'p(95)<400'],
        'query_duration{query:feed_explore}': ['p(50)<150', 'p(95)<400'],
        'query_duration{query:feed_chronological}': ['p(50)<100', 'p(95)<300'],
        'query_duration{query:profile_page}': ['p(50)<100', 'p(95)<300'],
        'query_duration{query:followers}': ['p(50)<100', 'p(95)<300'],
        'query_duration{query:following}': ['p(50)<100', 'p(95)<300'],
        'query_duration{query:search}': ['p(50)<200', 'p(95)<500'],
        'slow_queries': ['count<100'],
        'very_slow_queries': ['count<10'],
    },
};

function trackQueryDuration(name, duration) {
    queryDuration.add(duration, { query: name });
    
    if (duration > 500) {
        slowQueries.add(1);
        console.log(`⚠️ SLOW QUERY: ${name} took ${duration}ms`);
    }
    if (duration > 1000) {
        verySlowQueries.add(1);
        console.log(`🔴 VERY SLOW QUERY: ${name} took ${duration}ms`);
    }
}

export function setup() {
    console.log(`🔍 Index Detection Test Starting`);
    console.log(`   Purpose: Detect missing indexes and slow queries`);
    console.log(`   Users: ${Users.length}`);
    console.log(`   Watch for: slow_queries and very_slow_queries counters`);
    return { startTime: new Date().toISOString() };
}

// ============================================
// FEED QUERIES - Test index on CreatedDate, ActorUserId
// ============================================
export function testFeedQueries() {
    const userId = randomElement(Users);
    const modes = ['following', 'discovery', 'explore', 'chronological'];
    const mode = randomElement(modes);
    
    const start = Date.now();
    const res = requests.getFeed(userId, mode, 20, null);
    const duration = Date.now() - start;
    
    trackQueryDuration(`feed_${mode}`, duration);
    
    // Test pagination (cursor-based)
    if (res.status === 200) {
        try {
            const body = JSON.parse(res.body);
            const cursor = body.nextCursor || body.NextCursor;
            
            if (cursor) {
                const pagStart = Date.now();
                requests.getFeed(userId, mode, 20, cursor);
                const pagDuration = Date.now() - pagStart;
                
                trackQueryDuration(`feed_${mode}_page2`, pagDuration);
            }
        } catch (e) {}
    }
    
    sleep(0.2);
}

// ============================================
// LIST QUERIES - Test pagination indexes
// ============================================
export function testListQueries() {
    const userId = randomElement(Users);
    const targetUser = randomElement(Users);
    
    // Profile page - multiple joins
    group('Profile Queries', () => {
        let start = Date.now();
        requests.getProfilePage(targetUser, userId);
        trackQueryDuration('profile_page', Date.now() - start);
        
        sleep(0.2);
        
        // Followers - ordered list with pagination
        start = Date.now();
        requests.getFollowers(targetUser, 1, 50);
        trackQueryDuration('followers', Date.now() - start);
        
        sleep(0.2);
        
        // Followers page 2
        start = Date.now();
        requests.getFollowers(targetUser, 2, 50);
        trackQueryDuration('followers_page2', Date.now() - start);
        
        sleep(0.2);
        
        // Following
        start = Date.now();
        requests.getFollowing(targetUser, 1, 50);
        trackQueryDuration('following', Date.now() - start);
    });
    
    // Communities with pagination
    group('Community Queries', () => {
        let start = Date.now();
        requests.getCommunities(1, 50);
        trackQueryDuration('communities_list', Date.now() - start);
        
        sleep(0.2);
        
        start = Date.now();
        requests.getCommunities(5, 50); // Later pages test index efficiency
        trackQueryDuration('communities_page5', Date.now() - start);
    });
    
    sleep(0.5);
}

// ============================================
// SEARCH QUERIES - Full-text search performance
// ============================================
export function testSearchQueries() {
    const searchTerms = [
        'batman',
        'star wars',
        'the dark knight',
        'breaking bad',
        'game of thrones',
        'avengers',
        'godfather',
        'inception',
        'interstellar',
        'pulp fiction',
        'lord of the rings',
        'harry potter',
        'stranger things',
        'the office',
        'friends',
    ];
    
    const query = randomElement(searchTerms);
    
    // Content search
    group('Search', () => {
        let start = Date.now();
        requests.searchContent(query, 1, 20);
        trackQueryDuration('search', Date.now() - start);
        
        sleep(0.2);
        
        // User search
        start = Date.now();
        requests.searchUsers(query.substring(0, 3), 1, 20);
        trackQueryDuration('search_users', Date.now() - start);
    });
    
    sleep(0.3);
}

// ============================================
// MIXED OPERATIONS - Detect lock contention
// ============================================
export function testMixedOperations() {
    const userId = randomElement(Users);
    const targetUser = randomElement(Users);
    
    // Read-heavy with occasional writes
    group('Mixed Operations', () => {
        // Read: Feed
        let start = Date.now();
        requests.getFeed(userId, 'following', 20, null);
        trackQueryDuration('mixed_feed_read', Date.now() - start);
        
        sleep(0.1);
        
        // Write: Follow user (creates records)
        if (Math.random() < 0.3) {
            start = Date.now();
            requests.followUser(userId, targetUser);
            trackQueryDuration('mixed_follow_write', Date.now() - start);
        }
        
        sleep(0.1);
        
        // Read: Profile (after potential write)
        start = Date.now();
        requests.getProfilePage(userId, null);
        trackQueryDuration('mixed_profile_read', Date.now() - start);
        
        sleep(0.1);
        
        // Read: Following list (tests Connection table index)
        start = Date.now();
        requests.getFollowing(userId, 1, 20);
        trackQueryDuration('mixed_following_read', Date.now() - start);
    });
    
    sleep(0.5);
}

export function teardown(data) {
    console.log(`\n🔍 Index Detection Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
    console.log(`\n📊 ANALYSIS TIPS:`);
    console.log(`   - Check slow_queries and very_slow_queries counters`);
    console.log(`   - Look at p95/p99 for each query type`);
    console.log(`   - Queries with p95 > 500ms likely need index optimization`);
    console.log(`   - page2/page5 queries slower than page1 = pagination index issue`);
}
