# Multi-Layer Search Server

Hệ thống tìm kiếm 4 tầng với TypeScript, sử dụng Inverted Index, BM25, Vector Search (BERT) và Personalization.

## 🏗️ Kiến trúc 4 tầng

### Tầng 1: Inverted Index

- **Mục đích**: Lọc nhanh bằng keyword matching
- **Công nghệ**: Inverted Index với tokenization và normalization
- **Tính năng**: Boolean search (AND, OR, NOT), stop word filtering

### Tầng 2: BM25/TF-IDF

- **Mục đích**: Rút gọn tập kết quả bằng relevance scoring
- **Công nghệ**: BM25 algorithm với TF-IDF alternative
- **Tính năng**: Relevance ranking, term frequency analysis

### Tầng 3: Vector Search + ML

- **Mục đích**: Re-ranking bằng semantic similarity
- **Công nghệ**: BERT embeddings (Xenova/all-MiniLM-L6-v2)
- **Tính năng**: Semantic search, similar documents, cosine similarity

### Tầng 4: Personalization + Context

- **Mục đích**: Cá nhân hóa kết quả dựa trên user profile và context
- **Tính năng**: User preferences, behavior tracking, location-based, temporal

## 🚀 Cài đặt

```bash
# Cài đặt dependencies
pnpm install

# Build project
pnpm run build

# Chạy development
pnpm run dev

# Chạy production
pnpm start
```

## 📡 API Endpoints

### Search APIs

#### Tìm kiếm đầy đủ (4 tầng)

```http
POST /search
Content-Type: application/json

{
  "query": "machine learning algorithms",
  "userId": "user123",
  "limit": 20,
  "context": {
    "location": {
      "lat": 10.762622,
      "lng": 106.660172
    },
    "device": "mobile"
  }
}
```

#### Tìm kiếm nhanh (Layer 1)

```http
POST /search/quick
Content-Type: application/json

{
  "query": "artificial intelligence"
}
```

#### Boolean Search

```http
POST /search/boolean
Content-Type: application/json

{
  "query": "machine learning AND deep learning",
  "operator": "AND"
}
```

#### Semantic Search

```http
POST /search/semantic
Content-Type: application/json

{
  "query": "neural networks",
  "limit": 10
}
```

#### Tìm documents tương tự

```http
GET /search/similar/{documentId}?limit=5
```

### Document Management

#### Thêm document

```http
POST /documents
Content-Type: application/json

{
  "id": "doc1",
  "title": "Introduction to Machine Learning",
  "content": "Machine learning is a subset of artificial intelligence...",
  "category": "technology",
  "tags": ["AI", "ML", "algorithms"],
  "url": "https://example.com/ml-intro"
}
```

#### Batch thêm documents

```http
POST /documents/batch
Content-Type: application/json

{
  "documents": [
    {
      "id": "doc1",
      "title": "Document 1",
      "content": "Content 1..."
    },
    {
      "id": "doc2",
      "title": "Document 2",
      "content": "Content 2..."
    }
  ]
}
```

#### Xóa document

```http
DELETE /documents/{documentId}
```

### User Management

#### Ghi lại user behavior

```http
POST /users/{userId}/behavior
Content-Type: application/json

{
  "action": "click",
  "data": {
    "documentId": "doc1",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### Cập nhật user profile

```http
PUT /users/{userId}/profile
Content-Type: application/json

{
  "preferences": {
    "categories": ["technology", "science"],
    "languages": ["en", "vi"],
    "topics": ["AI", "ML"]
  },
  "demographics": {
    "age": 25,
    "location": "Ho Chi Minh City",
    "interests": ["programming", "data science"]
  }
}
```

### System APIs

#### Health check

```http
GET /health
```

#### Thống kê hệ thống

```http
GET /stats
```

## ⚙️ Cấu hình

Tạo file `.env` từ `env.example`:

```bash
cp env.example .env
```

Các biến môi trường chính:

```env
# Server
PORT=3000
NODE_ENV=development

# Search Configuration
MAX_RESULTS_LAYER1=10000
MAX_RESULTS_LAYER2=1000
MAX_RESULTS_LAYER3=100
MAX_FINAL_RESULTS=20

# Personalization Weights
USER_PROFILE_WEIGHT=0.3
CONTEXT_WEIGHT=0.2
TEMPORAL_WEIGHT=0.1
```

## 🧪 Testing

### Test với curl

```bash
# Health check
curl http://localhost:3000/health

# Thêm document
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test1",
    "title": "Test Document",
    "content": "This is a test document for search functionality"
  }'

# Tìm kiếm
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test document",
    "limit": 10
  }'
```

## 📊 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "layers": {
    "layer1": true,
    "layer2": true,
    "layer3": true,
    "layer4": true
  },
  "details": {
    "layer1": {
      "totalDocuments": 100,
      "totalTerms": 5000,
      "uniqueTerms": 1000
    },
    "layer2": {
      "totalDocuments": 100,
      "averageDocumentLength": 150
    },
    "layer3": {
      "totalEmbeddings": 100,
      "isModelLoaded": true
    },
    "layer4": {
      "totalUserProfiles": 50
    }
  }
}
```

### Stats Response

```json
{
  "success": true,
  "data": {
    "layer1": {
      "totalDocuments": 100,
      "totalTerms": 5000,
      "uniqueTerms": 1000,
      "averageTermsPerDocument": 50
    },
    "layer2": {
      "totalDocuments": 100,
      "averageDocumentLength": 150,
      "uniqueTerms": 1000,
      "bm25Params": {
        "k1": 1.2,
        "b": 0.75
      }
    },
    "layer3": {
      "totalEmbeddings": 100,
      "vectorDimension": 384,
      "isModelLoaded": true,
      "modelName": "Xenova/all-MiniLM-L6-v2"
    },
    "layer4": {
      "totalUserProfiles": 50,
      "contextWeights": {
        "userProfile": 0.3,
        "context": 0.2,
        "temporal": 0.1,
        "location": 0.1
      }
    },
    "isInitialized": true
  }
}
```

## 🔧 Development

### Cấu trúc thư mục

```
src/
├── config/           # Cấu hình ứng dụng
├── layers/           # 4 tầng tìm kiếm
│   ├── layer1-inverted-index.ts
│   ├── layer2-bm25.ts
│   ├── layer3-vector-search.ts
│   └── layer4-personalization.ts
├── services/         # Business logic
├── types/            # TypeScript types
└── server.ts         # Express server
```

### Thêm tài liệu mẫu

```typescript
import { SearchService } from "./src/services/search-service";

const searchService = new SearchService();
await searchService.initialize();

// Thêm documents mẫu
const documents = [
  {
    id: "doc1",
    title: "Machine Learning Fundamentals",
    content: "Machine learning is a method of data analysis...",
    category: "technology",
    tags: ["AI", "ML", "algorithms"],
  },
  {
    id: "doc2",
    title: "Deep Learning with Neural Networks",
    content: "Deep learning is a subset of machine learning...",
    category: "technology",
    tags: ["AI", "deep learning", "neural networks"],
  },
];

await searchService.addDocuments(documents);
```

## 🚀 Production Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

- `NODE_ENV=production`
- `PORT=3000`
- Cấu hình database connections
- ML model paths

## 📈 Performance

### Tối ưu hóa

- **Layer 1**: In-memory inverted index cho tốc độ cao
- **Layer 2**: BM25 với parameters tối ưu
- **Layer 3**: Quantized BERT model, batch processing
- **Layer 4**: Caching user profiles, efficient similarity calculations

### Monitoring

- Execution time cho từng layer
- Memory usage tracking
- Model loading status
- User behavior analytics

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

ISC License
# search
