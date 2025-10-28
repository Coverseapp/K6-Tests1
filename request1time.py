import requests as requests


file = "datasets/movie_ids_in_db.txt"

ids = []
with open(file, "r") as f:
    for line in f:
        ids.append(line.strip())

print(f"Total IDs to process: {len(ids)}")

print(ids)

for movie_id in ids:
    url = f"http://ec2-54-93-108-37.eu-central-1.compute.amazonaws.com:6091/api/movies/{movie_id}/page"
    response = requests.get(url)
    data = response.json()
    print(data)