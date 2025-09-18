import { pipeline } from "@xenova/transformers";
import { config } from "../config";
import {
  Document,
  Layer2Result,
  Layer3Result,
  LayerError,
  SearchRequest,
  SearchResult,
  VectorEmbedding,
  VectorSearchResult,
} from "../types";

export class Layer3VectorSearch {
  private embeddings: Map<string, VectorEmbedding>;
  private model: any = null;
  private isModelLoaded: boolean = false;
  private vectorDimension: number;

  constructor() {
    this.embeddings = new Map<string, VectorEmbedding>();
    this.vectorDimension = config.ml.vectorDimension;
  }

  /**
   * Khởi tạo và load BERT model
   */
  public async initializeModel(): Promise<void> {
    try {
      console.log("Đang load BERT model...");

      // Sử dụng sentence-transformers model cho embedding
      this.model = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2", // Model nhẹ và nhanh
        {
          quantized: true,
          progress_callback: (progress: any) => {
            if (progress.status === "downloading") {
              console.log(`Downloading: ${progress.name} - ${progress.file}`);
            }
          },
        }
      );

      this.isModelLoaded = true;
      console.log("BERT model đã được load thành công");
    } catch (error) {
      throw new LayerError(
        `Lỗi khi load BERT model: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Tạo embedding cho text
   */
  public async createEmbedding(text: string): Promise<number[]> {
    if (!this.isModelLoaded || !this.model) {
      throw new LayerError("BERT model chưa được load", "Layer3");
    }

    try {
      const result = await this.model(text, {
        pooling: "mean",
        normalize: true,
      });

      // Chuyển đổi tensor thành array
      const embedding = Array.from(result.data) as number[];
      return embedding;
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tạo embedding: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Thêm document với embedding
   */
  public async addDocument(document: Document): Promise<void> {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      // Tạo text để embed (title + content)
      const textToEmbed = `${document.title} ${document.content}`;

      // Tạo embedding
      const vector = await this.createEmbedding(textToEmbed);

      // Lưu embedding
      const embedding: VectorEmbedding = {
        documentId: document.id,
        vector,
        metadata: {
          title: document.title,
          category: document.category,
          createdAt: document.createdAt,
          ...document.metadata,
        },
      };

      this.embeddings.set(document.id, embedding);
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thêm document với embedding: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Vector search và re-ranking
   */
  public async search(
    request: SearchRequest,
    layer2Results: Layer2Result
  ): Promise<Layer3Result> {
    const startTime = Date.now();

    try {
      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      if (layer2Results.results.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
          vectorScores: [],
        };
      }

      // Tạo embedding cho query
      const queryEmbedding = await this.createEmbedding(request.query);

      // Tính similarity scores cho các documents từ Layer 2
      const vectorScores: VectorSearchResult[] = [];

      for (const result of layer2Results.results) {
        const embedding = this.embeddings.get(result.id);
        if (embedding) {
          const similarity = this.calculateCosineSimilarity(
            queryEmbedding,
            embedding.vector
          );
          vectorScores.push({
            documentId: result.id,
            similarity,
            vector: embedding.vector,
          });
        }
      }

      // Sắp xếp theo similarity giảm dần
      vectorScores.sort((a, b) => b.similarity - a.similarity);

      // Kết hợp BM25 scores với vector similarity scores
      const combinedResults = this.combineScores(
        layer2Results.results,
        vectorScores
      );

      // Sắp xếp theo combined score
      combinedResults.sort((a, b) => b.score - a.score);

      // Giới hạn kết quả
      const limitedResults = combinedResults.slice(
        0,
        config.search.maxResultsLayer3
      );

      return {
        results: limitedResults,
        totalCount: combinedResults.length,
        executionTime: Date.now() - startTime,
        vectorScores: vectorScores.map((vs) => vs.similarity),
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thực hiện vector search: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Tìm kiếm semantic similarity
   */
  public async semanticSearch(
    query: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      const queryEmbedding = await this.createEmbedding(query);
      const similarities: VectorSearchResult[] = [];

      // Tính similarity với tất cả documents
      for (const [documentId, embedding] of this.embeddings) {
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          embedding.vector
        );
        similarities.push({
          documentId,
          similarity,
          vector: embedding.vector,
        });
      }

      // Sắp xếp và giới hạn kết quả
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thực hiện semantic search: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Tìm documents tương tự
   */
  public async findSimilarDocuments(
    documentId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      const sourceEmbedding = this.embeddings.get(documentId);
      if (!sourceEmbedding) {
        throw new Error(
          `Document ${documentId} không tồn tại trong vector index`
        );
      }

      const similarities: VectorSearchResult[] = [];

      // Tính similarity với các documents khác
      for (const [id, embedding] of this.embeddings) {
        if (id !== documentId) {
          const similarity = this.calculateCosineSimilarity(
            sourceEmbedding.vector,
            embedding.vector
          );
          similarities.push({
            documentId: id,
            similarity,
            vector: embedding.vector,
          });
        }
      }

      // Sắp xếp và giới hạn kết quả
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tìm documents tương tự: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Tính cosine similarity
   */
  private calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[]
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors phải có cùng dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i]! * vectorB[i]!;
      normA += vectorA[i]! * vectorA[i]!;
      normB += vectorB[i]! * vectorB[i]!;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Kết hợp BM25 scores với vector similarity scores
   */
  private combineScores(
    bm25Results: SearchResult[],
    vectorResults: VectorSearchResult[]
  ): SearchResult[] {
    const vectorScoreMap = new Map<string, number>();
    vectorResults.forEach((vr) => {
      vectorScoreMap.set(vr.documentId, vr.similarity);
    });

    return bm25Results.map((result) => {
      const vectorScore = vectorScoreMap.get(result.id) || 0;
      const bm25Score = result.score;

      // Kết hợp scores (có thể điều chỉnh weights)
      const combinedScore = 0.6 * bm25Score + 0.4 * vectorScore;

      return {
        ...result,
        score: combinedScore,
        metadata: {
          ...result.metadata,
          vectorSimilarity: vectorScore,
          combinedScore,
        },
      };
    });
  }

  /**
   * Lấy thống kê vector index
   */
  public getStats(): {
    totalEmbeddings: number;
    vectorDimension: number;
    isModelLoaded: boolean;
    modelName: string;
  } {
    return {
      totalEmbeddings: this.embeddings.size,
      vectorDimension: this.vectorDimension,
      isModelLoaded: this.isModelLoaded,
      modelName: "Xenova/all-MiniLM-L6-v2",
    };
  }

  /**
   * Xóa embedding
   */
  public removeEmbedding(documentId: string): boolean {
    return this.embeddings.delete(documentId);
  }

  /**
   * Lấy embedding theo document ID
   */
  public getEmbedding(documentId: string): VectorEmbedding | undefined {
    return this.embeddings.get(documentId);
  }

  /**
   * Batch tạo embeddings
   */
  public async createBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isModelLoaded) {
      await this.initializeModel();
    }

    try {
      const embeddings: number[][] = [];

      // Xử lý từng text một cách tuần tự để tránh memory issues
      for (const text of texts) {
        const embedding = await this.createEmbedding(text);
        embeddings.push(embedding);
      }

      return embeddings;
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tạo batch embeddings: ${error}`,
        "Layer3",
        error as Error
      );
    }
  }

  /**
   * Tính similarity matrix cho một tập documents
   */
  public calculateSimilarityMatrix(documentIds: string[]): number[][] {
    const embeddings = documentIds
      .map((id) => this.embeddings.get(id)?.vector)
      .filter(Boolean) as number[][];
    const matrix: number[][] = [];

    for (let i = 0; i < embeddings.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < embeddings.length; j++) {
        if (i === j) {
          row.push(1.0);
        } else {
          row.push(
            this.calculateCosineSimilarity(embeddings[i]!, embeddings[j]!)
          );
        }
      }
      matrix.push(row);
    }

    return matrix;
  }
}
