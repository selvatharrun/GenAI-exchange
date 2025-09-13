from google.cloud import documentai
from google.cloud import storage
import os
from PIL import Image
import matplotlib.pyplot as plt


# Configure Document AI client
project_id = "sodium-coil-470706-f4"  
location = "us"  # Change if using different region
processor_id = "18d898182b219656"

# Initialize the client
client_options = {"api_endpoint": f"{location}-documentai.googleapis.com"}
client = documentai.DocumentProcessorServiceClient(client_options=client_options)

def process_document(file_path):
    """Process a document using Document AI. Accepts local file path or gs:// URI."""
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Use GCS input config for Document AI
    gcs_document = documentai.GcsDocument(
        gcs_uri=file_path,
        mime_type="application/pdf"  # Update mime type if needed
    )

    request = documentai.ProcessRequest(
        name=name,
        gcs_document=gcs_document
    )
    result = client.process_document(request=request)
    return result.document

def display_results(document):
    """Display the extracted text and other information"""
    print("Full text extracted:")
    print("="*50)
    print(document.text)
    
    print("\nForm fields found:")
    print("="*50)
    for page in document.pages:
        for field in page.form_fields:
            name = get_text(field.field_name, document)
            value = get_text(field.field_value, document)
            print(f"{name}: {value}")
            
def get_text(doc_element, document):
    """Extract text from a document element"""
    text = ""
    for segment in doc_element.text_anchor.text_segments:
        start_index = segment.start_index
        end_index = segment.end_index
        text += document.text[start_index:end_index]
    return text

try:
    # Process the document
    processed_doc = process_document(test_file_path)
    
    # Display results
    display_results(processed_doc)
    # Print confidence score
    print("\nDocument confidence score:", processed_doc.text_quality_scores[0].score)
    
except Exception as e:
    print(f"An error occurred: {str(e)}")