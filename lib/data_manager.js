import { SharedArray } from 'k6/data';

const USERID_FILE = '../datasets/users.txt';
export const Users = new SharedArray('users', () => {
  const txtfile = open(USERID_FILE);
  const userArr = txtfile.split('\n').filter(line => line.trim() !== '');
  console.log(`Loaded ${userArr.length} userIds from ${USERID_FILE}`);
  return userArr;
});

export const MoviesInDb = new SharedArray('movies', () => {
  const txtfile = open('../datasets/movie_ids_in_db.txt');
  const movieArr = txtfile.split('\n').filter(line => line.trim() !== '');
  console.log(`Loaded ${movieArr.length} movieIds from ../datasets/movie_ids_in_db.txt`);
  return movieArr;
});

export const MovieContentIdInDb = new SharedArray('movies_contentIds', () => {
  const txtfile = open('../datasets/movie_content_ids.txt');
  const movieArr = txtfile.split('\n').filter(line => line.trim() !== '');
  console.log(`Loaded ${movieArr.length} movieContentIds from ../datasets/movie_content_ids.txt`);
  return movieArr;
});

export const PersonInDb = new SharedArray('persons', () => {
  const txtfile = open('../datasets/person_ids_in_db.txt');
  const personArr = txtfile.split('\n').filter(line => line.trim() !== '');
  console.log(`Loaded ${personArr.length} personIds from ../datasets/person_ids_in_db.txt`);
  return personArr;
});