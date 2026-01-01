// Extended Request Library for K6 Tests
// Contains all API endpoint functions

import { check, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5091/api';

// ============================================
// CONTENT ENDPOINTS (Movies, TVShows, Person)
// ============================================

export function getMoviePage(movieId, userId = null) {
    let url = `${BASE_URL}/movies/${movieId}/page`;
    let headers = { "bypassCache": "true" };
    if (userId) {
        url += `?userId=${userId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'movie', endpoint: 'GET /movies/:id/page' },
        headers: headers
    });
    check(res, {
        'movie page status 200': r => r.status === 200,
        'movie page status 404': r => r.status === 404
    });
    return res;
}

export function getTvShowPage(tvShowId, userId = null) {
    let url = `${BASE_URL}/tvshows/${tvShowId}/page`;
    let headers = { "bypassCache": "true" };
    if (userId) {
        url += `?userId=${userId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'tvshow', endpoint: 'GET /tvshows/:id/page' },
        headers: headers
    });
    check(res, {
        'tvshow page status 200': r => r.status === 200,
        'tvshow page status 404': r => r.status === 404
    });
    return res;
}

export function getPersonPage(personId, userId = null, allow404 = false, bypassCache = true) {
    let url = `${BASE_URL}/person/${personId}/page`;
    let headers = { "bypassCache": bypassCache ? "true" : "false" };
    if (userId) {
        url += `?userId=${userId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'person', endpoint: 'GET /person/:id/page' },
        headers: headers
    });
    if (allow404) {
        check(res, {
            'person page status 200/404': r => r.status === 200 || r.status === 404,
        });
    } else {
        check(res, {
            'person page status 200': r => r.status === 200,
        });
    }
    return res;
}

// ============================================
// PROFILE ENDPOINTS
// ============================================

export function getProfilePage(targetUserId, requesterId = null) {
    let url = `${BASE_URL}/profile/${targetUserId}/page`;
    if (requesterId) {
        url += `?userId=${requesterId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'profile', endpoint: 'GET /profile/:id/page' }
    });
    check(res, { 'profile status 200': r => r.status === 200 });
    return res;
}

// ============================================
// FEED ENDPOINTS
// ============================================

export function getFeed(userId, mode = 'following', pageSize = 20, cursor = null) {
    userId = userId.trim('\\');
    let url = `${BASE_URL}/feed?userId=${userId}&mode=${mode}&pageSize=${pageSize}`;
    if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const res = http.get(url, {
        tags: { feature: 'feed', endpoint: `GET /feed?mode=${mode}` }
    });
    check(res, { 'feed status 200': r => r.status === 200 });
    return res;
}

export function getFeedFollowing(userId, pageSize = 20, cursor = null) {
    return getFeed(userId, 'following', pageSize, cursor);
}

export function getFeedDiscovery(userId, pageSize = 20, cursor = null) {
    return getFeed(userId, 'discovery', pageSize, cursor);
}

export function getFeedExplore(userId, pageSize = 20, cursor = null) {
    return getFeed(userId, 'explore', pageSize, cursor);
}

export function getFeedChronological(userId, pageSize = 20, cursor = null) {
    return getFeed(userId, 'chronological', pageSize, cursor);
}

export function markFeedItemViewed(userId, feedItemId) {
    const url = `${BASE_URL}/feed/${feedItemId}/view?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'feed', endpoint: 'POST /feed/:id/view' }
    });
    check(res, { 'mark viewed status 200': r => r.status === 200 || r.status === 204 });
    return res;
}

// ============================================
// REVIEW ENDPOINTS
// ============================================

export function addReview(contentId, userId, text, score, watchDate = null, isSpoiler = false) {
    const url = `${BASE_URL}/reviews?userId=${userId}`;
    const payload = JSON.stringify({
        contentId: contentId,
        content: text,
        score: score,
        watchDate: watchDate || new Date().toISOString().split('T')[0],
        isSpoiler: isSpoiler
    });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'review', endpoint: 'POST /reviews' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'review created 201': r => r.status === 201 });
    return res;
}

export function getReviews(contentId, page = 1, pageSize = 10) {
    const url = `${BASE_URL}/reviews/content/${contentId}?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'review', endpoint: 'GET /reviews/content/:id' }
    });
    check(res, { 'reviews status 200': r => r.status === 200 });
    return res;
}

export function likeReview(reviewId, userId) {
    const url = `${BASE_URL}/reviews/${reviewId}/like?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'review', endpoint: 'POST /reviews/:id/like' }
    });
    check(res, { 'like review status 200': r => r.status === 200 || r.status === 204 });
    return res;
}

// ============================================
// CONNECTION (FOLLOW) ENDPOINTS
// ============================================

export function followUser(followerId, followingId) {
    const url = `${BASE_URL}/connection/follow?userId=${followerId}`;
    const payload = JSON.stringify({ followingUserId: followingId });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'connection', endpoint: 'POST /connection/follow' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'follow status 200/409': r => r.status === 200 || r.status === 409 });
    return res;
}

export function unfollowUser(followerId, followingId) {
    const url = `${BASE_URL}/connection/unfollow?userId=${followerId}`;
    const payload = JSON.stringify({ followingUserId: followingId });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'connection', endpoint: 'POST /connection/unfollow' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'unfollow status 200': r => r.status === 200 || r.status === 404 });
    return res;
}

export function getFollowers(userId, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/connection/${userId}/followers?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'connection', endpoint: 'GET /connection/:id/followers' }
    });
    check(res, { 'followers status 200': r => r.status === 200 });
    return res;
}

export function getFollowing(userId, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/connection/${userId}/following?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'connection', endpoint: 'GET /connection/:id/following' }
    });
    check(res, { 'following status 200': r => r.status === 200 });
    return res;
}

// ============================================
// CONTENT INTERACTION ENDPOINTS
// ============================================

export function addToFavorites(contentId, userId) {
    const url = `${BASE_URL}/content/favorites?userId=${userId}`;
    const payload = JSON.stringify({ contentId: contentId });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'content', endpoint: 'POST /content/favorites' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'add favorite 200/409': r => r.status === 200 || r.status === 409 || r.status === 201 });
    return res;
}

export function removeFromFavorites(contentId, userId) {
    const url = `${BASE_URL}/content/favorites/${contentId}?userId=${userId}`;
    const res = http.del(url, null, {
        tags: { feature: 'content', endpoint: 'DELETE /content/favorites/:id' }
    });
    check(res, { 'remove favorite status': r => r.status === 200 || r.status === 404 });
    return res;
}

export function rateContent(contentId, userId, score) {
    const url = `${BASE_URL}/content/${contentId}/rate?userId=${userId}`;
    const payload = JSON.stringify({ score: score });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'content', endpoint: 'POST /content/:id/rate' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'rate content status': r => r.status === 200 || r.status === 201 });
    return res;
}

export function markAsWatched(contentId, userId, watchDate = null) {
    const url = `${BASE_URL}/content/${contentId}/watched?userId=${userId}`;
    const payload = JSON.stringify({ 
        watchDate: watchDate || new Date().toISOString().split('T')[0] 
    });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'content', endpoint: 'POST /content/:id/watched' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'mark watched status': r => r.status === 200 || r.status === 201 || r.status === 409 });
    return res;
}

// ============================================
// COMMUNITY ENDPOINTS
// ============================================

export function getCommunities(page = 1, pageSize = 20) {
    const url = `${BASE_URL}/community?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'community', endpoint: 'GET /community' }
    });
    check(res, { 'communities status 200': r => r.status === 200 });
    return res;
}

export function getCommunityPage(communityId, userId = null) {
    let url = `${BASE_URL}/community/${communityId}`;
    if (userId) {
        url += `?userId=${userId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'community', endpoint: 'GET /community/:id' }
    });
    check(res, { 'community page status 200': r => r.status === 200 });
    return res;
}

export function joinCommunity(communityId, userId) {
    const url = `${BASE_URL}/community/${communityId}/join?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'community', endpoint: 'POST /community/:id/join' }
    });
    check(res, { 'join community status': r => r.status === 200 || r.status === 409 });
    return res;
}

export function leaveCommunity(communityId, userId) {
    const url = `${BASE_URL}/community/${communityId}/leave?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'community', endpoint: 'POST /community/:id/leave' }
    });
    check(res, { 'leave community status': r => r.status === 200 || r.status === 404 });
    return res;
}

export function getCommunityPosts(communityId, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/community/${communityId}/posts?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'community', endpoint: 'GET /community/:id/posts' }
    });
    check(res, { 'community posts status 200': r => r.status === 200 });
    return res;
}

export function createCommunityPost(communityId, userId, text) {
    const url = `${BASE_URL}/community/${communityId}/posts?userId=${userId}`;
    const payload = JSON.stringify({ text: text });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'community', endpoint: 'POST /community/:id/posts' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'create post status 201': r => r.status === 201 || r.status === 200 });
    return res;
}

export function likeCommunityPost(postId, userId) {
    const url = `${BASE_URL}/community/posts/${postId}/like?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'community', endpoint: 'POST /community/posts/:id/like' }
    });
    check(res, { 'like post status': r => r.status === 200 || r.status === 204 });
    return res;
}

// ============================================
// PLAYLIST ENDPOINTS
// ============================================

export function createPlaylist(userId, name, description = '', isPublic = true) {
    const url = `${BASE_URL}/playlists?userId=${userId}`;
    const payload = JSON.stringify({
        name: name,
        description: description,
        isPublic: isPublic
    });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'playlist', endpoint: 'POST /playlists' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'create playlist 201': r => r.status === 201 || r.status === 200 });
    return res;
}

export function addToPlaylist(playlistId, contentId, userId) {
    const url = `${BASE_URL}/playlists/${playlistId}/content?userId=${userId}`;
    const payload = JSON.stringify({ contentId: contentId });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'playlist', endpoint: 'POST /playlists/:id/content' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'add to playlist status': r => r.status === 200 || r.status === 201 || r.status === 409 });
    return res;
}

export function likePlaylist(playlistId, userId) {
    const url = `${BASE_URL}/playlists/${playlistId}/like?userId=${userId}`;
    const res = http.post(url, null, {
        tags: { feature: 'playlist', endpoint: 'POST /playlists/:id/like' }
    });
    check(res, { 'like playlist status': r => r.status === 200 || r.status === 204 });
    return res;
}

// ============================================
// SEARCH ENDPOINTS
// ============================================

export function searchContent(query, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'search', endpoint: 'GET /search' }
    });
    check(res, { 'search status 200': r => r.status === 200 });
    return res;
}

export function searchUsers(query, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/search/users?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'search', endpoint: 'GET /search/users' }
    });
    check(res, { 'search users status 200': r => r.status === 200 });
    return res;
}

// ============================================
// COMMENT ENDPOINTS
// ============================================

export function addComment(reviewId, userId, text) {
    const url = `${BASE_URL}/comments?userId=${userId}`;
    const payload = JSON.stringify({
        reviewId: reviewId,
        commentText: text
    });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'comment', endpoint: 'POST /comments' }
    };
    const res = http.post(url, payload, params);
    check(res, { 'add comment 201': r => r.status === 201 || r.status === 200 });
    return res;
}

export function getComments(reviewId, page = 1, pageSize = 20) {
    const url = `${BASE_URL}/comments/review/${reviewId}?page=${page}&pageSize=${pageSize}`;
    const res = http.get(url, {
        tags: { feature: 'comment', endpoint: 'GET /comments/review/:id' }
    });
    check(res, { 'get comments status 200': r => r.status === 200 });
    return res;
}