import {getMoviePage} from '../lib/requests.js';
import { check, sleep } from 'k6';
import { MoviesInDb } from '../lib/data_manager.js';
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
      preAllocatedVUs: 20,              
      maxVUs: 20,              
      stages: [
        { target: 10, duration: '1m' }, 
        { target: 10, duration: '2m' }, 
        { target: 0, duration: '30s' } 
      ],
      startTime: '15s',
      exec: 'movieFlow',
      tags: { scenario: 'movie_page_load', feature: 'movie' },
      gracefulStop: '10s',
    },
  },
};

export function smoke() {
  const id = MoviesInDb[Math.floor(Math.random() * MoviesInDb.length)];
  getMoviePage(id);
  sleep(0.1 + Math.random() * 0.4); // 100-500ms arası rastgele bekleme
}

export function movieFlow() {
  const id = MoviesInDb[Math.floor(Math.random() * MoviesInDb.length)];
  getMoviePage(id);
  sleep(0.1 + Math.random() * 0.4); // 100-500ms arası rastgele bekleme
}