import {addReview} from '../lib/requests.js';
import { check, sleep } from 'k6';
import { MovieContentIdInDb, Users} from '../lib/data_manager.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',   
      vus: 5,
      duration: '10s',
      exec: 'smoke',              
      tags: { scenario: 'smoke', feature: 'movie' }, 
      gracefulStop: '5s',        
    },
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,                     
      timeUnit: '1s',
      preAllocatedVUs: 50,              
      maxVUs: 100,              
      stages: [
        { target: 100, duration: '1m' }, 
        { target: 100, duration: '1m' }, 
        { target: 0, duration: '30s' } 
      ],
      startTime: '15s',
      exec: 'reviewFlow',
      tags: { scenario: 'review_crud', feature: 'review' },
      gracefulStop: '10s',
    },
  },
};

function addReviewFunction(){
 const contentId = MovieContentIdInDb[Math.floor(Math.random() * MovieContentIdInDb.length)];
  const userId = Users[Math.floor(Math.random() * Users.length)];
  const score = Math.floor(Math.random() * 10); 
  const loremCount = 20 + Math.floor(Math.random() * 80);
  const text = '[k6 test] ' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(loremCount);
  addReview(contentId, userId, text, score, '2025-09-07T07:08:53.490Z', false);
  sleep(0.1 + Math.random() * 0.4); // 100-500ms arası rastgele bekleme
}

export function smoke() {
  addReviewFunction();
}

export function reviewFlow() {
   addReviewFunction();
}