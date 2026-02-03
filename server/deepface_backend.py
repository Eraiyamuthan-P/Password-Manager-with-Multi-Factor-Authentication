from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import numpy as np
import cv2
import base64
import traceback

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


# Helper function to decode base64 → OpenCV image
def decode_base64_image(data):
    try:
        header, encoded = data.split(',', 1) if ',' in data else ('', data)
        img_bytes = base64.b64decode(encoded)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print("Base64 decode error:", str(e))
        return None


# ---------------------- ENROLL ----------------------
@app.route('/api/enroll', methods=['POST'])
def enroll():
    data = request.json
    img_data = data.get('image')

    if not img_data:
        return jsonify({'error': 'No image provided'}), 400

    img = decode_base64_image(img_data)
    if img is None:
        return jsonify({'error': 'Invalid image data'}), 400

    print("Image shape (enroll):", img.shape)

    try:
        # Use RetinaFace detector for best accuracy
        reps = DeepFace.represent(
            img_path=img,
            model_name='ArcFace',
            detector_backend='retinaface',
            enforce_detection=True
        )

        embedding = np.array(reps[0]['embedding'], dtype=np.float32)
        base64_desc = base64.b64encode(embedding.tobytes()).decode('utf-8')

        print("Face enrolled successfully!")
        return jsonify({'success': True, 'faceDescriptor': base64_desc})

    except Exception as e:
        print("Enroll error:", traceback.format_exc())
        return jsonify({'error': 'Face not detected. Try again with a clear front photo.'}), 400


# ---------------------- VERIFY ----------------------
@app.route('/api/verify', methods=['POST'])
def verify():
    data = request.json
    img_data = data.get('image')
    stored_embedding_b64 = data.get('storedEmbedding')

    if not img_data or not stored_embedding_b64:
        return jsonify({'error': 'Missing image or stored embedding'}), 400

    img = decode_base64_image(img_data)
    if img is None:
        return jsonify({'error': 'Invalid image data'}), 400

    print("Image shape (verify):", img.shape)

    try:
        reps = DeepFace.represent(
            img_path=img,
            model_name='ArcFace',
            detector_backend='retinaface',
            enforce_detection=True
        )

        current_embedding = np.array(reps[0]['embedding'], dtype=np.float32)
        stored_embedding = np.frombuffer(base64.b64decode(stored_embedding_b64), dtype=np.float32)

        # Euclidean distance between embeddings
        distance = np.linalg.norm(current_embedding - stored_embedding)
        print("Face distance:", distance)

        threshold = 0.8  # lower = stricter
        match = distance < threshold

        return jsonify({'success': match, 'distance': float(distance)})

    except Exception as e:
        print("Verify error:", traceback.format_exc())
        return jsonify({'error': 'Face not detected. Try again with a clear front photo.'}), 400


# ---------------------- CORS FIX ----------------------
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response


if __name__ == '__main__':
    # Disable auto-reloader to prevent infinite restart loops
    # use_reloader=False prevents watchdog from monitoring file changes
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
