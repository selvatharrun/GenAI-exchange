# GenAI-exchange

GenAI-exchange is a full-stack project to help demystify legal documents. It enables users—lawyers and non-lawyers alike—to quickly understand contracts and filings by:
- Summarizing long documents into clear, plain-language explanations while preserving legal precision.
- Extracting structured data such as parties, dates, amounts, obligations, clauses, and definitions.
- Powering grounded Q&A: answers are strictly based on the uploaded document’s text with citations to the relevant sections/clauses.
- Highlighting ambiguities and potential areas that may need professional review.
- Maintaining a neutral, factual tone and avoiding legal advice.

The system includes:
- A Next.js frontend for document upload and exploration.
- A Flask backend that receives PDF uploads and stores them in Google Cloud Storage (GCS), returning a gs:// URI that downstream services (e.g., Vertex AI / Document AI) can use for analysis.

## Project Structure

- frontend/ — Next.js app bootstrapped with create-next-app.
- backend/ — Flask server exposing an upload endpoint and example notebooks for Google Cloud Document AI.
  - app.py — Flask app with a /upload-pdf endpoint that uploads a received PDF to GCS and returns its gs:// URI.
  - testings/ — Prototyping notebooks for uploading to GCS and calling Document AI (sync/async).
- LICENSE, README.md — Repository meta.

## Architecture Overview

1. User uploads a legal PDF (e.g., contract, certificate, filing) from the frontend.
2. The frontend sends the file to the backend endpoint /upload-pdf (multipart/form-data).
3. The backend saves a temporary local copy, uploads it to a configured GCS bucket, and returns the GCS URI (e.g., gs://<bucket>/<filename>).  
4. Downstream services (e.g., Vertex AI / Document AI) consume the URI to extract structure, summarize content, and enable grounded, citation-backed Q&A.
5. The frontend displays summaries, extracted fields, and answers with references to sections/clauses.

---

## Prerequisites

- Node.js 18+ (for the frontend)
- Python 3.10+ (for the backend)
- A Google Cloud project with:
  - A GCS bucket to store uploaded PDFs.
  - Service Account credentials with Storage write permissions.
- gcloud CLI (optional but recommended)
- Package managers:
  - Frontend: npm/yarn/pnpm/bun
  - Backend: pip/venv (or conda)

---

## Backend (Flask) Setup

Backend main file: backend/app.py

### What it does

- Exposes POST /upload-pdf
  - Accepts multipart/form-data with a single file field named file.
  - Validates that the file is a PDF.
  - Saves it to ./uploads/ temporarily.
  - Uploads the file to the configured GCS bucket using google-cloud-storage.
  - Responds with JSON containing "gcs_uri": "gs://<bucket>/<filename>".

- CORS is enabled globally (via flask_cors.CORS(app)), allowing the frontend to call the backend during development.

### Dependencies

Install:

pip install Flask flask-cors google-cloud-storage

If you plan to run the example notebooks under backend/testings/, you may also need:

pip install google-cloud-documentai prettytable pandas

### Configuration

In backend/app.py, set:
- BUCKET_NAME — your GCS bucket
- PROJECT_ID — your Google Cloud project

Recommended: move these to environment variables and read via os.environ.

Authenticate Google Cloud:
- Create a Service Account with permissions to write to your bucket.
- Download a JSON key and set:
  - macOS/Linux:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
  - Windows PowerShell:
    setx GOOGLE_APPLICATION_CREDENTIALS "C:\path\to\service-account-key.json"

### Run the backend

cd backend
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install Flask flask-cors google-cloud-storage

python app.py

The server starts on http://127.0.0.1:5000.

### API Reference

- POST /upload-pdf
  - Content-Type: multipart/form-data
  - Form field:
    - file: the PDF file to upload
  - Responses:
    - 200 OK: {"message": "File uploaded", "gcs_uri": "gs://<bucket>/<file>" }
    - 400 Bad Request: error message

Example:

curl -X POST http://localhost:5000/upload-pdf \
  -F "file=@/absolute/path/to/your.pdf"

---

## Frontend (Next.js) Setup

cd frontend
# choose one package manager
npm install
# or: yarn install
# or: pnpm install
# or: bun install

npm run dev
# or: yarn dev
# or: pnpm dev
# or: bun dev

Visit http://localhost:3000

Integrate your upload UI to POST to http://localhost:5000/upload-pdf in development, or your deployed backend URL in production.

---

## End-to-End Legal Document Workflow

1. Start the Flask backend and the Next.js frontend.
2. Upload a legal PDF (contract, certificate, filing).
3. Receive the gs:// URI from the backend.
4. Use the URI with Document AI / Vertex AI to:
   - Summarize the document.
   - Extract key fields (parties, dates, amounts, obligations).
   - Power grounded Q&A with citations (sections/clauses).
5. Display results in the UI, with clear references and plain-language explanations.

---

## Document AI Notebooks (Prototyping)

Under backend/testings/:
- chatTest.ipynb — Upload to GCS and retrieve gs:// URI.
- documentai-sync-v1.0.0.ipynb — Synchronous Document AI sample.
- documentai-async-v1.0.0.ipynb — Asynchronous Document AI sample.

These require valid authentication, a processor ID, and the listed Python packages.

---

## Deployment Notes

- Backend:
  - Consider Cloud Run, GKE, or a VM.
  - Provide env vars (or Secret Manager) for bucket/project config.
  - Use Workload Identity/Service Accounts for auth.
  - Restrict CORS to trusted origins.

- Frontend:
  - Deploy on Vercel or other Next.js-compatible hosting.
  - Configure the backend base URL for production.

---

## Security & Compliance

- Do not commit service account keys.
- Enforce least-privilege IAM on the bucket.
- Validate file types and sizes.
- Consider scanning for malicious content.
- Ground all responses in the document; avoid legal advice.

---

## License

See LICENSE.