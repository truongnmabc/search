import { Document } from "../types";

// Sample documents để test hệ thống
export const sampleDocuments: Document[] = [
  {
    id: "doc1",
    title: "Machine Learning Fundamentals",
    content:
      "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data. It includes supervised learning, unsupervised learning, and reinforcement learning. Popular algorithms include linear regression, decision trees, and neural networks.",
    category: "technology",
    tags: ["AI", "ML", "algorithms", "data science"],
    url: "https://example.com/ml-fundamentals",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    metadata: {
      author: "John Doe",
      difficulty: "beginner",
      readingTime: 5,
      language: "en",
    },
  },
  {
    id: "doc2",
    title: "Deep Learning with Neural Networks",
    content:
      "Deep learning uses artificial neural networks with multiple layers to model and understand complex patterns in data. It has revolutionized fields like computer vision, natural language processing, and speech recognition. Key architectures include CNNs, RNNs, and Transformers.",
    category: "technology",
    tags: ["AI", "deep learning", "neural networks", "computer vision"],
    url: "https://example.com/deep-learning",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    metadata: {
      author: "Jane Smith",
      difficulty: "intermediate",
      readingTime: 8,
      language: "en",
    },
  },
  {
    id: "doc3",
    title: "Natural Language Processing Techniques",
    content:
      "NLP combines computational linguistics with machine learning to help computers understand human language. It includes tasks like text classification, sentiment analysis, named entity recognition, and machine translation. Modern approaches use transformer models like BERT and GPT.",
    category: "technology",
    tags: ["NLP", "AI", "language processing", "transformers"],
    url: "https://example.com/nlp-techniques",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
    metadata: {
      author: "Bob Johnson",
      difficulty: "intermediate",
      readingTime: 6,
      language: "en",
    },
  },
  {
    id: "doc4",
    title: "Computer Vision and Image Recognition",
    content:
      "Computer vision enables machines to interpret and understand visual information from the world. It includes image classification, object detection, image segmentation, and facial recognition. Convolutional Neural Networks (CNNs) are the foundation of modern computer vision.",
    category: "technology",
    tags: ["computer vision", "image processing", "CNNs", "AI"],
    url: "https://example.com/computer-vision",
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date("2024-01-04"),
    metadata: {
      author: "Alice Brown",
      difficulty: "intermediate",
      readingTime: 7,
      language: "en",
    },
  },
  {
    id: "doc5",
    title: "Data Science and Analytics",
    content:
      "Data science combines statistics, programming, and domain expertise to extract insights from data. It involves data collection, cleaning, analysis, and visualization. Popular tools include Python, R, SQL, and various machine learning libraries.",
    category: "data",
    tags: ["data science", "analytics", "statistics", "python"],
    url: "https://example.com/data-science",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
    metadata: {
      author: "Charlie Wilson",
      difficulty: "beginner",
      readingTime: 6,
      language: "en",
    },
  },
  {
    id: "doc6",
    title: "Python Programming for AI",
    content:
      "Python is the most popular programming language for artificial intelligence and machine learning. It offers powerful libraries like NumPy, Pandas, Scikit-learn, TensorFlow, and PyTorch. Python's simplicity and extensive ecosystem make it ideal for AI development.",
    category: "programming",
    tags: ["python", "programming", "AI", "libraries"],
    url: "https://example.com/python-ai",
    createdAt: new Date("2024-01-06"),
    updatedAt: new Date("2024-01-06"),
    metadata: {
      author: "David Lee",
      difficulty: "beginner",
      readingTime: 4,
      language: "en",
    },
  },
  {
    id: "doc7",
    title: "Reinforcement Learning Algorithms",
    content:
      "Reinforcement learning is a type of machine learning where agents learn to make decisions by interacting with an environment. It uses rewards and penalties to guide learning. Applications include game playing, robotics, and autonomous systems.",
    category: "technology",
    tags: ["reinforcement learning", "AI", "algorithms", "robotics"],
    url: "https://example.com/reinforcement-learning",
    createdAt: new Date("2024-01-07"),
    updatedAt: new Date("2024-01-07"),
    metadata: {
      author: "Eva Martinez",
      difficulty: "advanced",
      readingTime: 9,
      language: "en",
    },
  },
  {
    id: "doc8",
    title: "Big Data Processing with Apache Spark",
    content:
      "Apache Spark is a unified analytics engine for large-scale data processing. It provides high-level APIs in Java, Scala, Python, and R. Spark can handle batch processing, real-time streaming, machine learning, and graph processing.",
    category: "data",
    tags: ["big data", "apache spark", "distributed computing", "analytics"],
    url: "https://example.com/apache-spark",
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-08"),
    metadata: {
      author: "Frank Chen",
      difficulty: "intermediate",
      readingTime: 8,
      language: "en",
    },
  },
  {
    id: "doc9",
    title: "Cloud Computing for AI Applications",
    content:
      "Cloud platforms like AWS, Google Cloud, and Azure provide scalable infrastructure for AI and machine learning applications. They offer managed services for data storage, model training, and deployment. Benefits include cost-effectiveness and scalability.",
    category: "cloud",
    tags: ["cloud computing", "AWS", "AI", "scalability"],
    url: "https://example.com/cloud-ai",
    createdAt: new Date("2024-01-09"),
    updatedAt: new Date("2024-01-09"),
    metadata: {
      author: "Grace Kim",
      difficulty: "intermediate",
      readingTime: 5,
      language: "en",
    },
  },
  {
    id: "doc10",
    title: "Ethics in Artificial Intelligence",
    content:
      "AI ethics addresses the moral implications of artificial intelligence systems. Key concerns include bias, fairness, transparency, privacy, and accountability. Organizations are developing guidelines and frameworks to ensure responsible AI development and deployment.",
    category: "ethics",
    tags: ["AI ethics", "bias", "fairness", "responsible AI"],
    url: "https://example.com/ai-ethics",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    metadata: {
      author: "Henry Taylor",
      difficulty: "intermediate",
      readingTime: 6,
      language: "en",
    },
  },
];

// Sample user profiles
export const sampleUserProfiles = [
  {
    userId: "user1",
    preferences: {
      categories: ["technology", "programming"],
      languages: ["en"],
      topics: ["AI", "ML", "python"],
    },
    behavior: {
      clickHistory: ["doc1", "doc2", "doc6"],
      searchHistory: [
        "machine learning",
        "python programming",
        "neural networks",
      ],
      timeSpent: {
        doc1: 300,
        doc2: 450,
        doc6: 200,
      },
    },
    demographics: {
      age: 25,
      location: "Ho Chi Minh City",
      interests: ["programming", "data science", "AI"],
    },
  },
  {
    userId: "user2",
    preferences: {
      categories: ["data", "cloud"],
      languages: ["en"],
      topics: ["big data", "analytics", "cloud computing"],
    },
    behavior: {
      clickHistory: ["doc5", "doc8", "doc9"],
      searchHistory: ["data science", "apache spark", "cloud computing"],
      timeSpent: {
        doc5: 400,
        doc8: 600,
        doc9: 300,
      },
    },
    demographics: {
      age: 30,
      location: "Hanoi",
      interests: ["data engineering", "cloud architecture"],
    },
  },
];

// Sample search queries để test
export const sampleQueries = [
  "machine learning algorithms",
  "deep learning neural networks",
  "python programming for AI",
  "natural language processing",
  "computer vision image recognition",
  "data science analytics",
  "reinforcement learning",
  "big data processing",
  "cloud computing AI",
  "artificial intelligence ethics",
];
