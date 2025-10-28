import http
import http.client
import urllib.parse
from time import sleep

BASE_URL = 'http://192.168.192.11:6091/api'

MOVIEID_LIST_FILE = '../datasets/movie_ids_in_db.txt'
PERSONID_LIST_FILE = '../datasets/person_ids_in_db.txt'
success_movies = list()
failed_movies = list()

def get_moviepage_url(movieId:int) -> str:
    return f'{BASE_URL}/movies/{movieId}/page'

def get_personpage_url(personId:int) -> str:
    return f'{BASE_URL}/Person/{personId}/Page'

def get_all_movie_ids() -> list[int]:
    with open(MOVIEID_LIST_FILE, 'r') as f:
        movie_ids = [int(line.strip()) for line in f if line.strip().isdigit()]
    return movie_ids

def get_all_person_ids() -> list[int]:
    with open(PERSONID_LIST_FILE, 'r') as f:
        movie_ids = [int(line.strip()) for line in f if line.strip().isdigit()]
    return movie_ids

def fetch_movie_page(movieId:int) -> http.client.HTTPResponse:
    url = get_moviepage_url(movieId)
    print(f'Fetching URL: {url}')
    parsed_url = urllib.parse.urlparse(url)
    conn = http.client.HTTPConnection(parsed_url.netloc)
    conn.request("GET", parsed_url.path)
    response = conn.getresponse()
    return response

def fetch_person_page(personId:int) -> http.client.HTTPResponse:
    url = get_personpage_url(personId)
    print(f'Fetching URL: {url}')
    parsed_url = urllib.parse.urlparse(url)
    conn = http.client.HTTPConnection(parsed_url.netloc)
    conn.request("GET", parsed_url.path)
    response = conn.getresponse()
    return response

def main():
    """
    movie_ids = get_all_movie_ids()
    for movieId in movie_ids:
        sleep(0.1)
        response = fetch_movie_page(movieId)
        if response.status == http.HTTPStatus.OK:
            print(f'Movie ID {movieId}: Success')
            success_movies.append(movieId)
        else:
            print(f'Movie ID {movieId}: Failed with status {response.status}')
            failed_movies.append(movieId)
        response.read()  # Ensure the response is fully read to free the connection
        response.close()

    print(f'Successfully {len(success_movies)} fetched movie pages for IDs: {success_movies}')
    print(f'Failed to {len(failed_movies)} fetch movie pages for IDs: {failed_movies}')
    """
    success_persons = dict()
    failed_persons = dict()
    person_ids =  get_all_person_ids()  # Example person IDs
    for personId in person_ids:
        response = fetch_person_page(personId)
        if response.status == http.HTTPStatus.OK:
            print(f'Person ID {personId}: Success')
            success_persons[personId] =  response.status
        else:
            print(f'Person ID {personId}: Failed with status {response.status}')
            failed_persons[personId] = response.status
        response.read()  # Ensure the response is fully read to free the connection
        response.close()

    print(f'Successfully {len(success_persons)} fetched person pages for IDs: {success_persons}')
    print(f'Failed to {len(failed_persons)} fetch person pages for IDs: {failed_persons}')
    for pid, status in failed_persons.items():
        if status != http.HTTPStatus.NOT_FOUND:
            print(f'Person ID {pid} failed with unexpected status: {status}')
if __name__ == '__main__':
    main()