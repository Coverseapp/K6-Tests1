import { SharedArray } from 'k6/data';

function parseNumericIds(txtfile) {
  return txtfile
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .map(line => parseInt(line, 10))
    .filter(n => Number.isFinite(n));
}

const USERID_FILE = '../datasets/users.txt';
export const Users = new SharedArray('users', () => {
  const txtfile = open(USERID_FILE);
  const userArr = txtfile.split('\n').filter(line => line.trim() !== '');
  console.log(`Loaded ${userArr.length} userIds from ${USERID_FILE}`);
  return userArr;
});

export const MoviesInDb = new SharedArray('movies', () => {
  const txtfile = open('../datasets/movie_ids_in_db.txt');
  const movieArr = parseNumericIds(txtfile);
  console.log(`Loaded ${movieArr.length} movieIds from ../datasets/movie_ids_in_db.txt`);
  return movieArr;
});

export const MovieContentIdInDb = new SharedArray('movies_contentIds', () => {
  const txtfile = open('../datasets/movie_content_ids.txt');
  const movieArr = parseNumericIds(txtfile);
  console.log(`Loaded ${movieArr.length} movieContentIds from ../datasets/movie_content_ids.txt`);
  return movieArr;
});

export const PersonInDb = new SharedArray('persons', () => {
  const txtfile = open('../datasets/person_ids_in_db.txt');
  const personArr = parseNumericIds(txtfile);
  console.log(`Loaded ${personArr.length} personIds from ../datasets/person_ids_in_db.txt`);
  return personArr;
});

export const NotFoundPersonIds = new SharedArray('not_found_persons', () => {
  try {
    const txtfile = open('../datasets/not_found_person_ids.txt');
    const personArr = parseNumericIds(txtfile);
    console.log(`Loaded ${personArr.length} not found personIds from ../datasets/not_found_person_ids.txt`);
    return personArr;
  } catch (e) {
    console.log('No existing not found person ids file at ../datasets/not_found_person_ids.txt');
    return [];
  }
});