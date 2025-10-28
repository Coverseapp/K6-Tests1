import { check, sleep } from 'k6';
import http, { head } from 'k6/http';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api';

export function getProfilePage(targetUserId, requesterUserId) {
  const url = `${BASE_URL}/profile/${targetUserId}/page?userId=${requesterUserId}`;
  const res = http.get(url, {
    tags: { feature: 'profile', endpoint: 'GET /profile/:id/page' }
  });

  check(res, { 'status 200': r => r.status === 200 });

  return res;
}

export function getMoviePage(movieId, requesterUserId=null){
    let url = `${BASE_URL}/movies/${movieId}/page`;
    let headers = {"bypassCache":"true"};
    if(requesterUserId){
        url += `?userId=${requesterUserId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'movie', endpoint: 'GET /movies/:id/page' },
        headers: headers
      });
    
    check(res, { 'status 200': r => r.status === 200 , 'status 404': r => r.status === 404 });
    return res;
}

export function getPersonPage(personId, requesterUserId=null){
    let url = `${BASE_URL}/person/${personId}/page`;
    if(requesterUserId){
        url += `?userId=${requesterUserId}`;
    }
    const res = http.get(url, {
        tags: { feature: 'person', endpoint: 'GET /person/:id/page' }
      }); 
    check(res, { 'status 200': r => r.status === 200 , 'status 404': r => r.status === 404 });
    return res;
}

export function addReview(contentId, userId, text, score, watchDate, isSpoiler) {
  const url = `${BASE_URL}/reviews?userId=${userId}`;
  const payload = JSON.stringify({
    contentId: contentId,
    content: text,
    score: score,
    watchDate: watchDate,
    isSpoiler: isSpoiler
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { feature: 'review', endpoint: 'POST /reviews' }
  };
  const res = http.post(url, payload, params);
  check(res, { 'status 201': r => r.status === 201 });

  return res;
}