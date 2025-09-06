from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import storage
import os
from Class.chat import automated_chat

app = Flask(__name__)
CORS(app)

BUCKET_NAME = "legal-doc-bucket1"
PROJECT_ID = "sodium-coil-470706-f4"
# hi
def upload_blob_and_get_uri(bucket_name, source_file_name, destination_blob_name, project_id):
    storage_client = storage.Client(project=project_id)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(source_file_name)
    gs_uri = f"gs://{bucket_name}/{destination_blob_name}"
    print(f"File {source_file_name} uploaded to {destination_blob_name} in bucket {bucket_name}.")
    print(f"GS URI: {gs_uri}")
    return gs_uri

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and file.filename.lower().endswith('.pdf'):
        local_path = os.path.join("uploads", file.filename)
        os.makedirs("uploads", exist_ok=True)
        file.save(local_path)
        gs_uri = upload_blob_and_get_uri(
            BUCKET_NAME,
            local_path,
            file.filename,
            PROJECT_ID
        )
        return jsonify({"message": "File uploaded", "gcs_uri": gs_uri}), 200
    return jsonify({"error": "Invalid file type"}), 400


@app.route('/pdf-chat', methods=['POST'])
def pdf_chat():
    data = request.get_json()
    question = data.get('question')
    file_path = data.get('gsUri')  # or use another key if your frontend sends a different name

    # Optionally, you can manage chat_history per session/user if needed
    response = automated_chat(question, file_path=file_path, stream_response=True, chat_history=None)

    return jsonify({"answer": response})

if __name__ == '__main__':
    app.run(debug=True)