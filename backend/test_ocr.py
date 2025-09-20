#!/usr/bin/env python3
"""
Test script for the OCR functionality.
This script tests the process_pdf_with_document_ai function.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Class.OCR import process_pdf_with_document_ai

def test_ocr_function():
    """Test the OCR function with a sample GCS URI"""
    
    # Test with invalid URI
    print("Testing with invalid URI...")
    result = process_pdf_with_document_ai("invalid-uri")
    print(f"Result: {result['success']}, Error: {result['error']}")
    assert not result['success'], "Should fail with invalid URI"
    
    # Test with None input
    print("\nTesting with None input...")
    result = process_pdf_with_document_ai(None)
    print(f"Result: {result['success']}, Error: {result['error']}")
    assert not result['success'], "Should fail with None input"
    
    # Test with empty string
    print("\nTesting with empty string...")
    result = process_pdf_with_document_ai("")
    print(f"Result: {result['success']}, Error: {result['error']}")
    assert not result['success'], "Should fail with empty string"
    
    print("\n✅ All validation tests passed!")
    
    # Note: To test with a real GCS URI, you would need:
    # 1. A valid GCS URI (gs://bucket-name/file.pdf)
    # 2. Proper Google Cloud credentials
    # 3. Document AI API enabled
    
    print("\nTo test with a real PDF, use:")
    print("result = process_pdf_with_document_ai('gs://your-bucket/your-file.pdf')")
    print("print(result)")

if __name__ == "__main__":
    test_ocr_function()