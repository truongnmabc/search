#!/bin/bash

# Test script cho Search API
BASE_URL="http://localhost:3000"

echo "🚀 Testing Search API..."

# Test health check
echo "1. Testing health check..."
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n2. Adding sample documents..."
# Add sample documents
curl -s -X POST "$BASE_URL/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test1",
    "title": "Machine Learning Fundamentals",
    "content": "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
    "category": "technology",
    "tags": ["AI", "ML", "algorithms"]
  }' | jq '.'

curl -s -X POST "$BASE_URL/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test2",
    "title": "Deep Learning with Neural Networks",
    "content": "Deep learning uses artificial neural networks with multiple layers to model complex patterns in data.",
    "category": "technology",
    "tags": ["AI", "deep learning", "neural networks"]
  }' | jq '.'

echo -e "\n3. Testing search..."
# Test search
curl -s -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "limit": 5
  }' | jq '.'

echo -e "\n4. Testing quick search..."
# Test quick search
curl -s -X POST "$BASE_URL/search/quick" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "neural networks"
  }' | jq '.'

echo -e "\n5. Testing boolean search..."
# Test boolean search
curl -s -X POST "$BASE_URL/search/boolean" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning AND deep learning",
    "operator": "AND"
  }' | jq '.'

echo -e "\n6. Testing semantic search..."
# Test semantic search
curl -s -X POST "$BASE_URL/search/semantic" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "limit": 3
  }' | jq '.'

echo -e "\n7. Testing similar documents..."
# Test similar documents
curl -s "$BASE_URL/search/similar/test1?limit=3" | jq '.'

echo -e "\n8. Testing user behavior tracking..."
# Test user behavior
curl -s -X POST "$BASE_URL/users/user1/behavior" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "data": {
      "documentId": "test1",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }' | jq '.'

echo -e "\n9. Testing personalized search..."
# Test personalized search
curl -s -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "userId": "user1",
    "limit": 5,
    "context": {
      "device": "mobile",
      "location": {
        "lat": 10.762622,
        "lng": 106.660172
      }
    }
  }' | jq '.'

echo -e "\n10. Getting system stats..."
# Get stats
curl -s "$BASE_URL/stats" | jq '.'

echo -e "\n✅ API testing completed!"
