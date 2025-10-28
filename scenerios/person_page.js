import {getMoviePage, getPersonPage} from '../lib/requests.js';
import { check, sleep } from 'k6';
import { PersonInDb } from '../lib/data_manager.js';
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
        { target: 100, duration: '2m' }, 
        { target: 0, duration: '30s' } 
      ],
      startTime: '15s',
      exec: 'personFlow',
      tags: { scenario: 'person_page_load', feature: 'person' },
      gracefulStop: '10s',
    },
  },
};

export function smoke() {
  const id = PersonInDb[Math.floor(Math.random() * PersonInDb.length)];
  getPersonPage(id);
  sleep(0.1 + Math.random() * 0.4); // 100-500ms arası rastgele bekleme
}

export function personFlow() {
  const id = PersonInDb[Math.floor(Math.random() * PersonInDb.length)];
  getPersonPage(id);
  sleep(0.1 + Math.random() * 0.4); // 100-500ms arası rastgele bekleme
}