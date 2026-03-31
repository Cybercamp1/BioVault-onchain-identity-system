import os
import requests

def download_file(url, target_path):
    print(f"Downloading {url} to {target_path}...")
    response = requests.get(url)
    if response.status_code == 200:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, 'wb') as f:
            f.write(response.content)
        print("Done.")
    else:
        print(f"Failed to download {url}. Status code: {response.status_code}")

BASE_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"
MODELS_DIR = r"c:\Users\Nithish\Desktop\NEURAL-aI-VAULT\frontend\public\models"

files_to_download = [
    ("tiny_face_detector/tiny_face_detector_model-weights_manifest.json", "tiny_face_detector_model-weights_manifest.json"),
    ("tiny_face_detector/tiny_face_detector_model-shard1", "tiny_face_detector_model-shard1"),
    ("face_landmark_68/face_landmark_68_model-weights_manifest.json", "face_landmark_68_model-weights_manifest.json"),
    ("face_landmark_68/face_landmark_68_model-shard1", "face_landmark_68_model-shard1"),
    ("face_recognition/face_recognition_model-weights_manifest.json", "face_recognition_model-weights_manifest.json"),
    ("face_recognition/face_recognition_model-shard1", "face_recognition_model-shard1"),
    ("face_recognition/face_recognition_model-shard2", "face_recognition_model-shard2"),
]

for src, dest in files_to_download:
    url = f"{BASE_URL}/{src}"
    target = os.path.join(MODELS_DIR, dest)
    download_file(url, target)
