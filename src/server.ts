import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import Joi from "joi";
import morgan from "morgan";
import { config } from "./config";
import { SearchService } from "./services/search-service";
import { Document, SearchError, SearchRequest } from "./types";

// Khởi tạo Express app
const app = express();
const searchService = new SearchService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Validation schemas
const searchRequestSchema = Joi.object({
  query: Joi.string().min(1).max(500).required(),
  userId: Joi.string().optional(),
  limit: Joi.number().min(1).max(100).optional(),
  offset: Joi.number().min(0).optional(),
  filters: Joi.object().optional(),
  context: Joi.object({
    location: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      radius: Joi.number().optional(),
    }).optional(),
    timestamp: Joi.date().optional(),
    device: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    previousQueries: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

const documentSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().required(),
  content: Joi.string().required(),
  url: Joi.string().uri().optional(),
  category: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
  metadata: Joi.object().optional(),
});

// Routes

/**
 * Health check endpoint
 */
app.get("/health", async (_req, res) => {
  try {
    const health = await searchService.healthCheck();
    res.status(health.status === "healthy" ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Search endpoint - Tìm kiếm qua 4 tầng
 */
app.post("/search", async (req, res) => {
  try {
    const { error, value } = searchRequestSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const searchRequest: SearchRequest = {
      ...value,
      limit: value.limit || config.search.maxFinalResults,
      offset: value.offset || 0,
    };

    const result = await searchService.search(searchRequest);

    res.json({
      success: true,
      data: {
        results: result.results,
        totalCount: result.totalCount,
        executionTime: result.executionTime,
        layerStats: result.layerStats,
      },
    });
  } catch (error) {
    console.error("Search error:", error);

    if (error instanceof SearchError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
});

/**
 * Quick search endpoint - Chỉ sử dụng Layer 1
 */
app.post("/search/quick", async (req, res) => {
  try {
    const { error, value } = searchRequestSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const result = await searchService.quickSearch(value);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Quick search error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Boolean search endpoint
 */
app.post("/search/boolean", async (req, res) => {
  try {
    const schema = Joi.object({
      query: Joi.string().required(),
      operator: Joi.string().valid("AND", "OR", "NOT").default("OR"),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const result = await searchService.booleanSearch(
      value.query,
      value.operator
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Boolean search error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Semantic search endpoint
 */
app.post("/search/semantic", async (req, res) => {
  try {
    const schema = Joi.object({
      query: Joi.string().required(),
      limit: Joi.number().min(1).max(50).default(10),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const result = await searchService.semanticSearch(value.query, value.limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Find similar documents endpoint
 */
app.get("/search/similar/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;
    const limit = parseInt(req.query["limit"] as string) || 5;

    const result = await searchService.findSimilarDocuments(documentId, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Similar documents error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Add document endpoint
 */
app.post("/documents", async (req, res) => {
  try {
    const { error, value } = documentSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const document: Document = {
      ...value,
      createdAt: value.createdAt || new Date(),
      updatedAt: value.updatedAt || new Date(),
    };

    await searchService.addDocument(document);

    res.status(201).json({
      success: true,
      message: "Document đã được thêm thành công",
      data: { id: document.id },
    });
  } catch (error) {
    console.error("Add document error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Batch add documents endpoint
 */
app.post("/documents/batch", async (req, res) => {
  try {
    const schema = Joi.object({
      documents: Joi.array().items(documentSchema).min(1).max(100).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    const documents: Document[] = value.documents.map((doc: any) => ({
      ...doc,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    }));

    await searchService.addDocuments(documents);

    res.status(201).json({
      success: true,
      message: `${documents.length} documents đã được thêm thành công`,
      data: { count: documents.length },
    });
  } catch (error) {
    console.error("Batch add documents error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Remove document endpoint
 */
app.delete("/documents/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    const success = await searchService.removeDocument(documentId);

    if (success) {
      res.json({
        success: true,
        message: "Document đã được xóa thành công",
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Document không tồn tại",
      });
    }
  } catch (error) {
    console.error("Remove document error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Record user behavior endpoint
 */
app.post("/users/:userId/behavior", async (req, res) => {
  try {
    const { userId } = req.params;
    const schema = Joi.object({
      action: Joi.string().valid("click", "search", "time_spent").required(),
      data: Joi.object().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }

    await searchService.recordUserBehavior(userId, value.action, value.data);

    res.json({
      success: true,
      message: "User behavior đã được ghi lại",
    });
  } catch (error) {
    console.error("Record user behavior error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Update user profile endpoint
 */
app.put("/users/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;

    await searchService.updateUserProfile(userId, req.body);

    res.json({
      success: true,
      message: "User profile đã được cập nhật",
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Get stats endpoint
 */
app.get("/stats", async (_req, res) => {
  try {
    const stats = searchService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * 404 handler
 */
app.use("*", (_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint không tồn tại",
  });
});

/**
 * Error handler
 */
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

/**
 * Khởi động server
 */
async function startServer() {
  try {
    console.log("Đang khởi tạo Search Server...");

    // Khởi tạo Search Service
    await searchService.initialize();

    // Khởi động server
    const server = app.listen(config.server.port, () => {
      console.log(`🚀 Search Server đang chạy trên port ${config.server.port}`);
      console.log(
        `📊 Health check: http://localhost:${config.server.port}/health`
      );
      console.log(
        `🔍 Search API: http://localhost:${config.server.port}/search`
      );
      console.log(`📈 Stats: http://localhost:${config.server.port}/stats`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Lỗi khi khởi động server:", error);
    process.exit(1);
  }
}

// Khởi động server
startServer();
