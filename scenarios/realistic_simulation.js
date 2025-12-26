/**
 * REALISTIC USER SIMULATION TEST
 * 
 * Gerçek kullanıcı davranışını simüle eder:
 * - Feed'e göz atma
 * - İçerik beğenme/puanlama
 * - Review yazma
 * - Kullanıcı takip etme
 * - Community'ye katılma ve post paylaşma
 * - Playlist oluşturma
 * 
 * Her VU bir kullanıcıyı simüle eder ve rastgele aksiyonlar gerçekleştirir.
 * 
 * Kullanım:
 *   k6 run scenarios/realistic_simulation.js
 *   k6 run --env TEST_TYPE=load scenarios/realistic_simulation.js
 */

import { sleep, check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import * as requests from '../lib/requests.js';
import {
    randomElement,
    randomInt,
    randomText,
    randomDate,
    smokeTest,
    loadTest,
    stressTest,
    defaultThresholds
} from '../lib/config.js';

// Load test data
const Users = new SharedArray('users', () => {
    const txtfile = open('../datasets/users.txt');
    return txtfile.split('\n').filter(line => line.trim() !== '');
});

const MovieContentIds = new SharedArray('movies_contentIds', () => {
    try {
        const txtfile = open('../datasets/movie_content_ids.txt');
        return txtfile.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        console.log('Warning: movie_content_ids.txt not found, using empty array');
        return [];
    }
});

// Custom metrics - by action type
const browsingFeed = new Counter('action_browse_feed');
const viewedContent = new Counter('action_viewed_content');
const ratedContent = new Counter('action_rated_content');
const favoritedContent = new Counter('action_favorited_content');
const followedUser = new Counter('action_followed_user');
const createdReview = new Counter('action_created_review');
const joinedCommunity = new Counter('action_joined_community');
const createdPost = new Counter('action_created_post');
const createdPlaylist = new Counter('action_created_playlist');
const actionSuccess = new Counter('action_success');
const actionFailed = new Counter('action_failed');

// Test config
const TEST_TYPE = __ENV.TEST_TYPE || 'load';
const testConfigs = {
    smoke: smokeTest,
    load: loadTest,
    stress: stressTest,
};

export const options = {
    ...testConfigs[TEST_TYPE],
    thresholds: defaultThresholds,
};

// Action weights (probability distribution)
const ACTIONS = [
    { name: 'browse_feed', weight: 30, fn: browseFeed },
    { name: 'view_content', weight: 20, fn: viewContent },
    { name: 'rate_content', weight: 10, fn: rateContent },
    { name: 'favorite_content', weight: 8, fn: favoriteContent },
    { name: 'follow_user', weight: 10, fn: followUser },
    { name: 'write_review', weight: 5, fn: writeReview },
    { name: 'join_community', weight: 7, fn: joinCommunityAction },
    { name: 'create_post', weight: 5, fn: createPost },
    { name: 'create_playlist', weight: 3, fn: createPlaylistAction },
    { name: 'search', weight: 2, fn: searchAction },
];

// Calculate total weight for random selection
const TOTAL_WEIGHT = ACTIONS.reduce((sum, a) => sum + a.weight, 0);

function selectAction() {
    let random = Math.random() * TOTAL_WEIGHT;
    for (const action of ACTIONS) {
        random -= action.weight;
        if (random <= 0) return action;
    }
    return ACTIONS[0];
}

export function setup() {
    console.log(`🎭 Realistic User Simulation Starting`);
    console.log(`   Test Type: ${TEST_TYPE}`);
    console.log(`   Users: ${Users.length}`);
    console.log(`   Contents: ${MovieContentIds.length}`);
    console.log(`   Actions configured:`);
    ACTIONS.forEach(a => console.log(`     - ${a.name}: ${(a.weight/TOTAL_WEIGHT*100).toFixed(1)}%`));
    return { startTime: new Date().toISOString() };
}

// ============================================
// ACTION IMPLEMENTATIONS
// ============================================

function browseFeed(userId) {
    group('Browse Feed', () => {
        const modes = ['following', 'discovery', 'explore', 'chronological'];
        const mode = randomElement(modes);
        
        const res = requests.getFeed(userId, mode, 20, null);
        
        if (res.status === 200) {
            browsingFeed.add(1);
            actionSuccess.add(1);
            
            // Simulate scrolling through feed
            try {
                const body = JSON.parse(res.body);
                const nextCursor = body.nextCursor || body.NextCursor;
                
                if (nextCursor && Math.random() < 0.5) {
                    sleep(randomInt(1, 3));
                    requests.getFeed(userId, mode, 20, nextCursor);
                }
            } catch (e) {}
        } else {
            actionFailed.add(1);
        }
    });
}

function viewContent(userId) {
    group('View Content', () => {
        // Random choice: movie, tvshow, or person profile
        const contentType = randomElement(['movie', 'tvshow', 'profile']);
        
        if (contentType === 'movie') {
            const movieId = randomInt(1, 1000); // Random TMDB ID
            const res = requests.getMoviePage(movieId, userId);
            if (res.status === 200) {
                viewedContent.add(1);
                actionSuccess.add(1);
            }
        } else if (contentType === 'tvshow') {
            const tvShowId = randomInt(1, 500);
            const res = requests.getTvShowPage(tvShowId, userId);
            if (res.status === 200) {
                viewedContent.add(1);
                actionSuccess.add(1);
            }
        } else {
            const targetUser = randomElement(Users);
            const res = requests.getProfilePage(targetUser, userId);
            if (res.status === 200) {
                viewedContent.add(1);
                actionSuccess.add(1);
            }
        }
    });
}

function rateContent(userId) {
    group('Rate Content', () => {
        if (MovieContentIds.length === 0) {
            actionFailed.add(1);
            return;
        }
        
        const contentId = randomElement(MovieContentIds);
        const score = randomInt(1, 10);
        
        const res = requests.rateContent(contentId, userId, score);
        
        if (res.status === 200 || res.status === 201) {
            ratedContent.add(1);
            actionSuccess.add(1);
        } else {
            actionFailed.add(1);
        }
    });
}

function favoriteContent(userId) {
    group('Favorite Content', () => {
        if (MovieContentIds.length === 0) {
            actionFailed.add(1);
            return;
        }
        
        const contentId = randomElement(MovieContentIds);
        const res = requests.addToFavorites(contentId, userId);
        
        if (res.status === 200 || res.status === 201 || res.status === 409) {
            favoritedContent.add(1);
            actionSuccess.add(1);
        } else {
            actionFailed.add(1);
        }
    });
}

function followUser(userId) {
    group('Follow User', () => {
        // Pick a random user to follow (not self)
        let targetUser = randomElement(Users);
        while (targetUser === userId && Users.length > 1) {
            targetUser = randomElement(Users);
        }
        
        const res = requests.followUser(userId, targetUser);
        
        if (res.status === 200 || res.status === 409) {
            followedUser.add(1);
            actionSuccess.add(1);
        } else {
            actionFailed.add(1);
        }
    });
}

function writeReview(userId) {
    group('Write Review', () => {
        if (MovieContentIds.length === 0) {
            actionFailed.add(1);
            return;
        }
        
        const contentId = randomElement(MovieContentIds);
        const reviewText = randomText(randomInt(20, 50));
        const score = randomInt(1, 10);
        const watchDate = randomDate(2020, 2024);
        const isSpoiler = Math.random() < 0.1;
        
        const res = requests.addReview(contentId, userId, reviewText, score, watchDate, isSpoiler);
        
        if (res.status === 201 || res.status === 200) {
            createdReview.add(1);
            actionSuccess.add(1);
        } else {
            actionFailed.add(1);
        }
    });
}

function joinCommunityAction(userId) {
    group('Join Community', () => {
        // First, get list of communities
        const communitiesRes = requests.getCommunities(1, 20);
        
        if (communitiesRes.status === 200) {
            try {
                const body = JSON.parse(communitiesRes.body);
                const communities = body.items || body.Items || body || [];
                
                if (communities.length > 0) {
                    const community = randomElement(communities);
                    const communityId = community.id || community.Id;
                    
                    if (communityId) {
                        const joinRes = requests.joinCommunity(communityId, userId);
                        
                        if (joinRes.status === 200 || joinRes.status === 409) {
                            joinedCommunity.add(1);
                            actionSuccess.add(1);
                            return;
                        }
                    }
                }
            } catch (e) {}
        }
        actionFailed.add(1);
    });
}

function createPost(userId) {
    group('Create Community Post', () => {
        // First get communities user might be member of
        const communitiesRes = requests.getCommunities(1, 10);
        
        if (communitiesRes.status === 200) {
            try {
                const body = JSON.parse(communitiesRes.body);
                const communities = body.items || body.Items || body || [];
                
                if (communities.length > 0) {
                    const community = randomElement(communities);
                    const communityId = community.id || community.Id;
                    
                    if (communityId) {
                        const postText = randomText(randomInt(10, 30));
                        const postRes = requests.createCommunityPost(communityId, userId, postText);
                        
                        if (postRes.status === 201 || postRes.status === 200) {
                            createdPost.add(1);
                            actionSuccess.add(1);
                            return;
                        }
                    }
                }
            } catch (e) {}
        }
        actionFailed.add(1);
    });
}

function createPlaylistAction(userId) {
    group('Create Playlist', () => {
        const playlistName = `Test Playlist ${randomInt(1, 10000)}`;
        const description = randomText(10);
        
        const res = requests.createPlaylist(userId, playlistName, description, true);
        
        if (res.status === 201 || res.status === 200) {
            createdPlaylist.add(1);
            actionSuccess.add(1);
            
            // Add some content to playlist
            if (MovieContentIds.length > 0) {
                try {
                    const body = JSON.parse(res.body);
                    const playlistId = body.id || body.Id;
                    
                    if (playlistId) {
                        const numToAdd = randomInt(1, 5);
                        for (let i = 0; i < numToAdd; i++) {
                            const contentId = randomElement(MovieContentIds);
                            requests.addToPlaylist(playlistId, contentId, userId);
                            sleep(0.2);
                        }
                    }
                } catch (e) {}
            }
        } else {
            actionFailed.add(1);
        }
    });
}

function searchAction(userId) {
    group('Search', () => {
        const searchTerms = ['batman', 'star wars', 'marvel', 'godfather', 'inception', 
                            'breaking bad', 'friends', 'matrix', 'avengers', 'dark knight'];
        const query = randomElement(searchTerms);
        
        const res = requests.searchContent(query, 1, 20);
        
        if (res.status === 200) {
            actionSuccess.add(1);
        } else {
            actionFailed.add(1);
        }
    });
}

// ============================================
// MAIN TEST LOOP
// ============================================

export default function () {
    const userId = randomElement(Users);
    
    // Perform 3-5 actions per iteration (simulating a user session)
    const numActions = randomInt(3, 5);
    
    for (let i = 0; i < numActions; i++) {
        const action = selectAction();
        
        try {
            action.fn(userId);
        } catch (e) {
            actionFailed.add(1);
            console.log(`Error in action ${action.name}: ${e.message}`);
        }
        
        // Natural pause between actions (1-5 seconds)
        sleep(randomInt(1, 5));
    }
    
    // Session break
    sleep(randomInt(2, 5));
}

export function teardown(data) {
    console.log(`\n🎭 Realistic User Simulation Complete`);
    console.log(`   Started: ${data.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
    console.log(`   Check custom metrics for action breakdown`);
}
