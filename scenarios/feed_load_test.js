/**
 * FEED LOAD TEST
 * 
 * Feed sisteminin yük altındaki performansını test eder.
 * Tüm feed modlarını (following, discovery, explore, chronological) test eder.
 * Cursor pagination'ı da test eder.
 * 
 * Kullanım:
 *   k6 run scenarios/feed_load_test.js
 *   k6 run --env TEST_TYPE=smoke scenarios/feed_load_test.js
 *   k6 run --env TEST_TYPE=stress scenarios/feed_load_test.js
 */

import { sleep, check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { Users} from '../lib/data_manager.js';
import {
    getFeed,
    getFeedFollowing,
    getFeedDiscovery,
    getFeedExplore,
    getFeedChronological,
    markFeedItemViewed
} from '../lib/requests.js';
import {
    randomElement,
    randomInt,
    smokeTest,
    loadTest,
    stressTest,
    spikeTest,
    feedThresholds
} from '../lib/config.js';

// Custom metrics
const feedSuccess = new Counter('feed_success');
const feedFailed = new Counter('feed_failed');
const feedEmptyResults = new Counter('feed_empty_results');
const feedWithItems = new Counter('feed_with_items');
const feedDuration = new Trend('feed_duration');
const cursorPaginationSuccess = new Counter('cursor_pagination_success');

// Test type selection
const TEST_TYPE = __ENV.TEST_TYPE || 'load';
const testConfigs = {
    smoke: smokeTest,
    load: loadTest,
    stress: stressTest,
    spike: spikeTest,
};

export const options = {
    ...testConfigs[TEST_TYPE],
    thresholds: feedThresholds,
};

export function setup() {
    console.log(`📰 Feed Load Test Starting`);
    console.log(`   Test Type: ${TEST_TYPE}`);
    console.log(`   Users available: ${Users.length}`);
    return { startTime: new Date().toISOString() };
}

export default function () {
    const userId = randomElement(Users);
    
    // Randomly select feed mode
    const modes = ['following', 'discovery', 'explore', 'chronological'];
    const mode = randomElement(modes);
    
    group(`Feed - ${mode}`, () => {
        // First page request
        const startTime = Date.now();
        const res = getFeed(userId, mode, 20, null);
        const duration = Date.now() - startTime;
        
        feedDuration.add(duration);
        
        if (res.status === 200) {
            feedSuccess.add(1);
            
            try {
                const body = JSON.parse(res.body);
                const items = body.items || body.Items || [];
                
                if (items.length > 0) {
                    feedWithItems.add(1);
                    
                    // Test cursor pagination - get next page
                    const nextCursor = body.nextCursor || body.NextCursor;
                    if (nextCursor && Math.random() < 0.3) { // 30% chance to paginate
                        sleep(0.5);
                        const page2Res = getFeed(userId, mode, 20, nextCursor);
                        
                        if (page2Res.status === 200) {
                            cursorPaginationSuccess.add(1);
                        }
                    }
                    
                    // Mark random item as viewed (10% chance)
                    if (Math.random() < 0.1 && items.length > 0) {
                        const randomItem = randomElement(items);
                        const itemId = randomItem.id || randomItem.Id;
                        if (itemId) {
                            markFeedItemViewed(userId, itemId);
                        }
                    }
                } else {
                    feedEmptyResults.add(1);
                }
            } catch (e) {
                // JSON parse error - still count as success if status was 200
            }
        } else {
            feedFailed.add(1);
        }
    });
    
    sleep(randomInt(1, 3));
}

export function teardown(data) {
    console.log(`\n📰 Feed Load Test Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
}
