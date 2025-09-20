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

def process_document(gcs_uri):
    """Process a document using Document AI. Accepts GCS URI (gs://) as input."""
    if not gcs_uri.startswith("gs://"):
        raise ValueError("Input must be a GCS URI starting with 'gs://'")
    
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Use GCS input config for Document AI
    gcs_document = documentai.GcsDocument(
        gcs_uri=gcs_uri,
        mime_type="application/pdf"  # Update mime type if needed
    )

    request = documentai.ProcessRequest(
        name=name,
        gcs_document=gcs_document
    )
    result = client.process_document(request=request)
    return result.document

def extract_text_with_pages(document):
    """Extract text with page-wise breakdown and return structured data"""
    result = {
        "full_text": document.text,
        "pages": [],
        "form_fields": [],
        "confidence_score": None
    }
    
    # Extract confidence score if available
    if document.text_quality_scores:
        result["confidence_score"] = document.text_quality_scores[0].score
    
    # Process each page
    for page_num, page in enumerate(document.pages, 1):
        page_info = {
            "page_number": page_num,
            "text": "",
            "form_fields": []
        }
        
        # Extract text segments for this page
        if hasattr(page, 'tokens'):
            page_text_segments = []
            for token in page.tokens:
                if token.layout.text_anchor.text_segments:
                    for segment in token.layout.text_anchor.text_segments:
                        start_index = segment.start_index if hasattr(segment, 'start_index') else 0
                        end_index = segment.end_index if hasattr(segment, 'end_index') else len(document.text)
                        page_text_segments.append(document.text[start_index:end_index])
            page_info["text"] = " ".join(page_text_segments)
        
        # Extract form fields for this page
        for field in page.form_fields:
            field_name = get_text(field.field_name, document) if field.field_name else ""
            field_value = get_text(field.field_value, document) if field.field_value else ""
            
            field_info = {
                "name": field_name,
                "value": field_value
            }
            page_info["form_fields"].append(field_info)
            result["form_fields"].append({
                "page": page_num,
                "name": field_name,
                "value": field_value
            })
        
        result["pages"].append(page_info)
    
    return result

def display_results(document):
    """Display the extracted text and other information (legacy function for backwards compatibility)"""
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
    if not doc_element or not doc_element.text_anchor:
        return ""
    
    text = ""
    for segment in doc_element.text_anchor.text_segments:
        start_index = segment.start_index if hasattr(segment, 'start_index') else 0
        end_index = segment.end_index if hasattr(segment, 'end_index') else len(document.text)
        text += document.text[start_index:end_index]
    return text

def process_pdf_with_document_ai(gcs_uri):
    """
    Main function to process a PDF from GCS URI using Document AI.
    Returns structured text data with page details for MCP app usage.
    
    Args:
        gcs_uri (str): GCS URI of the PDF file (e.g., 'gs://bucket-name/file.pdf')
    
    Returns:
        dict: Structured data containing:
            - full_text: Complete extracted text
            - pages: List of page-wise text and form fields
            - form_fields: All form fields with page numbers
            - confidence_score: Document quality confidence score
            - success: Boolean indicating success
            - error: Error message if any
    """
    try:
        # Validate input
        if not gcs_uri or not isinstance(gcs_uri, str):
            return {
                "success": False,
                "error": "Invalid GCS URI provided",
                "full_text": "",
                "pages": [],
                "form_fields": [],
                "confidence_score": None
            }
        
        # Process the document
        processed_doc = process_document(gcs_uri)
        
        # Extract structured text with page details
        result = extract_text_with_pages(processed_doc)
        
        # Add success flag
        result["success"] = True
        result["error"] = None
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Document processing failed: {str(e)}",
            "full_text": "",
            "pages": [],
            "form_fields": [],
            "confidence_score": None
        }

# Example usage (commented out for production use)
# if __name__ == "__main__":
#     # Example GCS URI
#     test_gcs_uri = "gs://your-bucket/your-file.pdf"
#     result = process_pdf_with_document_ai(test_gcs_uri)
#     print("Processing result:", result)