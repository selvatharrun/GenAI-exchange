from fastapi import FastAPI
from fastmcp import FastMCP
from google.cloud import storage
from starlette.middleware.cors import CORSMiddleware
import os
import uvicorn
from Class.chat import automated_chat

mcp = FastMCP("LegalDemystifierMCP")
# mcp = FastMCP.from_fastapi(app, "LegalDemystifierMCP")

BUCKET_NAME = "legal-doc-bucket1"
PROJECT_ID = "sodium-coil-470706-f4"

# Helper function for GCS upload
def upload_blob_and_get_uri(bucket_name, source_file_name, destination_blob_name, project_id):
    storage_client = storage.Client(project=project_id)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(source_file_name)
    gs_uri = f"gs://{bucket_name}/{destination_blob_name}"
    print(f"File {source_file_name} uploaded to {destination_blob_name} in bucket {bucket_name}.")
    print(f"GS URI: {gs_uri}")
    return gs_uri

# Tool to upload PDF to GCS
@mcp.tool
def upload_pdf_to_gcs(file_path: str, filename: str) -> dict:
    """Uploads a PDF file and returns the GCS URI."""
    if not filename.lower().endswith('.pdf'):
        return {"error": "Invalid file type"}
    
    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    local_path = os.path.join("uploads", filename)
    
    # For local testing, assume file_path is the path to the uploaded file
    # Copy file to uploads directory if needed (simulating file save)
    if file_path != local_path:
        with open(file_path, 'rb') as src, open(local_path, 'wb') as dst:
            dst.write(src.read())
    
    try:
        gs_uri = upload_blob_and_get_uri(
            BUCKET_NAME,
            local_path,
            filename,
            PROJECT_ID
        )
        print(gs_uri)
        return {"message": "File uploaded", "gcs_uri": gs_uri}
    except Exception as e:
        return {"error": f"Upload failed: {str(e)}"}

# Tool to query PDF contents
@mcp.tool
def query_pdf(question: str, gs_uri: str) -> dict:
    """Processes a question about a PDF stored in GCS using the automated_chat function."""
    try:
        response = automated_chat(question, file_path=gs_uri, stream_response=True, chat_history=None)
        return {"answer": response}
    except Exception as e:
        return {"error": f"Query failed: {str(e)}"}


mcp_app = mcp.http_app(path="/")

app = FastAPI(lifespan=mcp_app.lifespan)

# ---- CORS ----
allowed_origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "mcp-session-id", "MCP-Session-Id", "MCP-Protocol-Version", "Access-Control-Expose-Headers",
    ],
)

@app.get("/health")
def health_check():
    return "MCP Server Operational"

# # Mount MCP app
app.mount("/mcp", mcp_app)

# Run the server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
