#!/usr/bin/env python3
"""
Test script for the legal precedent finding functionality.
This script demonstrates how the find_legal_precedents MCP tool works.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test the precedent function directly
try:
    from Class.Precedent import find_precedents
    PRECEDENT_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import Precedent module: {e}")
    PRECEDENT_AVAILABLE = False

def test_precedent_function():
    """Test the precedent finding function with sample legal clauses"""
    
    if not PRECEDENT_AVAILABLE:
        print("❌ Precedent module not available for testing")
        return
    
    # Test cases with different types of legal clauses
    test_cases = [
        {
            "clause": "The tenant shall pay rent on or before the 5th day of each month. Failure to pay rent within 10 days of the due date shall constitute a material breach of this agreement.",
            "location": "California",
            "description": "Rental agreement clause (California)"
        },
        {
            "clause": "This agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of laws principles.",
            "location": "New York", 
            "description": "Choice of law clause (New York)"
        },
        {
            "clause": "The Company shall not be liable for any indirect, incidental, special, consequential or punitive damages arising out of or relating to this Agreement.",
            "location": "US",
            "description": "Limitation of liability clause (Federal US)"
        },
        {
            "clause": "Either party may terminate this agreement with 30 days written notice to the other party.",
            "location": "India",
            "description": "Termination clause (India)"
        }
    ]
    
    print("🔍 Testing Legal Precedent Finding Function")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}: {test_case['description']}")
        print(f"📍 Location: {test_case['location']}")
        print(f"📄 Clause: {test_case['clause'][:100]}...")
        
        try:
            # This would be the actual call in the MCP tool
            result = find_precedents(test_case['clause'], test_case['location'])
            print(f"✅ Result Length: {len(result)} characters")
            print(f"📝 Preview: {result[:200]}...")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        print("-" * 40)

def demo_mcp_tool_format():
    """Demonstrate the expected MCP tool output format"""
    
    print("\n🛠️  MCP Tool Output Format")
    print("=" * 60)
    
    # This is what the MCP tool will return
    sample_output = {
        "success": True,
        "clause": "The tenant shall pay rent on or before the 5th day of each month...",
        "location": "California",
        "precedents": "1. Green v. Superior Court (1985) - California Supreme Court...",
        "error": None
    }
    
    print("Expected MCP Tool Response Structure:")
    for key, value in sample_output.items():
        if isinstance(value, str) and len(value) > 50:
            print(f"  {key}: {value[:50]}...")
        else:
            print(f"  {key}: {value}")
    
    print("\n📞 Usage in MCP Client:")
    print("  Tool Name: find_legal_precedents")
    print("  Parameters:")
    print("    - clause (required): Legal clause text")
    print("    - location (optional): Jurisdiction (default: 'US')")

if __name__ == "__main__":
    test_precedent_function()
    demo_mcp_tool_format()
    
    print("\n🎉 Legal Precedent MCP Tool is ready!")
    print("Add this to your MCP client to find relevant case law precedents.")