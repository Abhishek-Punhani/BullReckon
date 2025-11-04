#!/usr/bin/env python3
"""
Test script for Transcript Server API endpoints
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5006"

def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_extract_from_text():
    """Test extracting parameters from text"""
    print("\n" + "="*60)
    print("Testing text extraction endpoint...")
    print("="*60)
    
    transcript = """
User: Hi, I'd like to set up an investment portfolio.
Advisor: Great! How much capital do you have available to invest?
User: I have 10 lakh rupees set aside for this.
Advisor: Excellent. What's your investment timeframe?
User: I'm planning for the long term, around 5+ years.
Advisor: What kind of returns are you targeting?
User: I'm hoping for at least 12% annual returns.
Advisor: How would you describe your risk tolerance?
User: I'm pretty aggressive and comfortable with high risk for higher returns.
Advisor: When might you need access to this capital?
User: I don't need it soon - it's locked for years.
Advisor: Any specific constraints or preferences?
User: Yes, I want to limit IT exposure to max 25% and Banking to max 30%. Also, please exclude tobacco and gambling companies. Absolutely no leverage. And I want quarterly rebalancing with automatic execution.
Advisor: Got it! And small-cap allocation?
User: Keep small-cap limited to max 20%.
    """
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/transcript/extract",
            json={"transcript": transcript},
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_extract_from_file():
    """Test extracting parameters from file"""
    print("\n" + "="*60)
    print("Testing file extraction endpoint...")
    print("="*60)
    
    try:
        # Check if test file exists
        import os
        test_file_path = "test_transcript.txt"
        if not os.path.exists(test_file_path):
            print(f"Test file not found: {test_file_path}")
            print("Skipping file extraction test")
            return True
        
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_transcript.txt', f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/api/transcript/extract-file",
                files=files
            )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_incomplete_extraction():
    """Test extraction with incomplete data"""
    print("\n" + "="*60)
    print("Testing incomplete extraction...")
    print("="*60)
    
    incomplete_transcript = """
User: I want to invest some money.
Advisor: How much?
User: Around 5 lakh rupees.
Advisor: What's your timeframe?
User: Long term.
    """
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/transcript/extract",
            json={"transcript": incomplete_transcript},
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response:\n{json.dumps(result, indent=2)}")
        
        # Check if missing fields are identified
        if result.get('status') == 'incomplete':
            print("\n✅ Successfully identified incomplete extraction")
            print(f"Missing fields: {len(result.get('missing_mandatory_fields', []))}")
            return True
        else:
            print("\n❌ Expected incomplete status")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Run all tests"""
    print("="*60)
    print("TRANSCRIPT SERVER API TEST SUITE")
    print("="*60)
    
    results = []
    
    # Test 1: Health check
    results.append(("Health Check", test_health_check()))
    
    # Test 2: Extract from text
    results.append(("Text Extraction", test_extract_from_text()))
    
    # Test 3: Extract from file
    results.append(("File Extraction", test_extract_from_file()))
    
    # Test 4: Incomplete extraction
    results.append(("Incomplete Extraction", test_incomplete_extraction()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()

