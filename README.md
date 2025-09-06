GenAI-exchange
GenAI-exchange is a full-stack application designed to simplify the understanding of legal documents for both lawyers and non-lawyers. It processes contracts, filings, and other legal PDFs to deliver:

Plain-language summaries that retain legal accuracy.
Structured data extraction (e.g., parties, dates, amounts, obligations, clauses, definitions).
Grounded Q&A with answers directly tied to the document's text, including citations to relevant sections/clauses.
Ambiguity detection to flag areas for professional review.
Neutral, factual outputs, avoiding legal advice.

Features

Frontend: A Next.js application for intuitive document uploads and interactive result exploration.
Backend: A Flask server that handles PDF uploads, stores them in Google Cloud Storage (GCS), and returns gs:// URIs for downstream AI processing (e.g., Google Cloud Document AI, Vertex AI).
AI Integration: Leverages Google Cloud services for document summarization, data extraction, and citation-backed Q&A.
Security: Validates file types, enforces least-privilege IAM, and supports secure deployment practices.

Project Structure
GenAI-exchange/
├── backend/                   # Flask backend
│   ├── app.py                # Main Flask app with /upload-pdf endpoint
│   ├── testings/             # Prototyping notebooks for GCS and Document AI
│   │   ├── chatTest.ipynb
│   │   ├── documentai-sync-v1.0.0.ipynb
│   │   └── documentai-async-v1.0.0.ipynb
├── frontend/                  # Next.js frontend
├── LICENSE                   # License file
└── README.md                 # Project documentation

Architecture Overview

Upload: Users upload legal PDFs via the Next.js frontend.
Backend Processing: The frontend sends the PDF to the Flask backend's /upload-pdf endpoint (multipart/form-data).
Storage: The backend temporarily saves the PDF locally, uploads it to a GCS bucket, and returns a gs:// URI.
AI Analysis: Downstream services (e.g., Document AI, Vertex AI) use the URI to summarize content, extract structured data, and enable grounded Q&A.
Display: The frontend presents summaries, extracted fields, and Q&A with citations in a user-friendly interface.

Prerequisites

Node.js: v18+ (for frontend)
Python: v3.10+ (for backend)
Google Cloud:
A project with a GCS bucket for PDF storage.
A Service Account with Storage write permissions (JSON key file).
Optional: Document AI and Vertex AI enabled for AI processing.


gcloud CLI: Recommended for authentication and testing.
Package Managers:
Frontend: npm, yarn, pnpm, or bun.
Backend: pip with virtualenv (or conda).



Setup Instructions
Backend (Flask)

Navigate to the backend directory:
cd backend


Create and activate a virtual environment:
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1


Install dependencies:
pip install --upgrade pip
pip install Flask flask-cors google-cloud-storage

For prototyping notebooks in backend/testings/:
pip install google-cloud-documentai prettytable pandas


Configure environment variables:

Set your Google Cloud Project ID and GCS bucket name in backend/app.py or via environment variables:export BUCKET_NAME="your-gcs-bucket"
export PROJECT_ID="your-project-id"


Set the Service Account key path:# macOS/Linux
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
# Windows PowerShell
setx GOOGLE_APPLICATION_CREDENTIALS "C:\path\to\service-account-key.json"




Run the backend:
python app.py

The server runs on http://127.0.0.1:5000.


Frontend (Next.js)

Navigate to the frontend directory:
cd frontend


Install dependencies (choose one package manager):
npm install
# or: yarn install
# or: pnpm install
# or: bun install


Run the development server:
npm run dev
# or: yarn dev
# or: pnpm dev
# or: bun dev

The frontend runs on http://localhost:3000.

Integrate with backend:

Configure the frontend to send POST requests to http://localhost:5000/upload-pdf during development or your deployed backend URL in production.



API Reference

POST /upload-pdf
Content-Type: multipart/form-data
Form Field: file (PDF file to upload)
Responses:
200 OK: {"message": "File uploaded", "gcs_uri": "gs://<bucket>/<filename>"}
400 Bad Request: {"error": "Invalid file or missing PDF"}


Example:curl -X POST http://localhost:5000/upload-pdf \
  -F "file=@/path/to/your.pdf"





End-to-End Workflow

Start the Flask backend (python app.py) and Next.js frontend (npm run dev).
Upload a legal PDF (e.g., contract, filing) via the frontend.
The backend returns a gs:// URI after storing the PDF in GCS.
Use the URI with Google Cloud Document AI or Vertex AI to:
Generate plain-language summaries.
Extract structured data (parties, dates, amounts, etc.).
Enable grounded Q&A with section/clause citations.


The frontend displays results with clear, clickable references.

Prototyping Notebooks
The backend/testings/ directory contains Jupyter notebooks for prototyping:

chatTest.ipynb: Uploads PDFs to GCS and retrieves gs:// URIs.
documentai-sync-v1.0.0.ipynb: Synchronous Document AI processing.
documentai-async-v1.0.0.ipynb: Asynchronous Document AI processing.

Requirements: Valid Google Cloud authentication, a Document AI processor ID, and the dependencies listed above.
Deployment
Backend

Options: Deploy on Google Cloud Run, GKE, or a VM.
Configuration:
Use environment variables or Google Secret Manager for BUCKET_NAME, PROJECT_ID, and credentials.
Enable Workload Identity or Service Accounts for secure authentication.
Restrict CORS to trusted origins (remove global flask_cors.CORS(app) in production).


Security:
Validate file types (PDF only) and enforce size limits.
Scan uploads for malicious content.
Use least-privilege IAM policies for the GCS bucket.



Frontend

Options: Deploy on Vercel, Netlify, or other Next.js-compatible platforms.
Configuration:
Set the backend base URL as an environment variable (e.g., NEXT_PUBLIC_API_URL).
Optimize for production with npm run build.



Security & Compliance

Do not commit Service Account keys to version control.
Validate file types and sizes on the backend.
Enforce least-privilege IAM policies for GCS and AI services.
Ground responses strictly in the document's content to avoid legal advice.
Consider antivirus scanning for uploaded PDFs.

Contributing
We welcome contributions! To get started:

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a Pull Request with a clear description.

Please follow the code of conduct and ensure tests pass before submitting.
License
See the LICENSE file for details.
