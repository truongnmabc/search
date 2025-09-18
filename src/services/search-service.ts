import { Layer1InvertedIndex } from "../layers/layer1-inverted-index";
import { Layer2BM25 } from "../layers/layer2-bm25";
import { Layer3VectorSearch } from "../layers/layer3-vector-search";
import { Layer4Personalization } from "../layers/layer4-personalization";
import {
  Document,
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
  SearchError,
  SearchRequest,
  SearchResult,
} from "../types";

export class SearchService {
  private layer1: Layer1InvertedIndex;
  private layer2: Layer2BM25;
  private layer3: Layer3VectorSearch;
  private layer4: Layer4Personalization;
  private isInitialized: boolean = false;

  constructor() {
    this.layer1 = new Layer1InvertedIndex();
    this.layer2 = new Layer2BM25();
    this.layer3 = new Layer3VectorSearch();
    this.layer4 = new Layer4Personalization();
  }

  /**
   * Khởi tạo search service
   */
  public async initialize(): Promise<void> {
    try {
      console.log("Đang khởi tạo Search Service...");

      // Khởi tạo Layer 3 (Vector Search) - cần load model
      await this.layer3.initializeModel();

      this.isInitialized = true;
      console.log("Search Service đã được khởi tạo thành công");
    } catch (error) {
      throw new SearchError(
        `Lỗi khi khởi tạo Search Service: ${error}`,
        "INITIALIZATION_ERROR"
      );
    }
  }

  /**
   * Thêm document vào tất cả các layers
   */
  public async addDocument(document: Document): Promise<void> {
    try {
      // Thêm vào Layer 1 (Inverted Index)
      this.layer1.addDocument(document);

      // Thêm vào Layer 2 (BM25)
      this.layer2.addDocument(document);

      // Thêm vào Layer 3 (Vector Search)
      await this.layer3.addDocument(document);

      console.log(`Document ${document.id} đã được thêm vào tất cả layers`);
    } catch (error) {
      throw new SearchError(
        `Lỗi khi thêm document: ${error}`,
        "ADD_DOCUMENT_ERROR"
      );
    }
  }

  /**
   * Xóa document khỏi tất cả các layers
   */
  public async removeDocument(documentId: string): Promise<boolean> {
    try {
      const layer1Removed = this.layer1.removeDocument(documentId);
      const layer2Removed = this.layer2.removeDocument(documentId);
      const layer3Removed = this.layer3.removeEmbedding(documentId);

      const success = layer1Removed && layer2Removed && layer3Removed;

      if (success) {
        console.log(`Document ${documentId} đã được xóa khỏi tất cả layers`);
      }

      return success;
    } catch (error) {
      throw new SearchError(
        `Lỗi khi xóa document: ${error}`,
        "REMOVE_DOCUMENT_ERROR"
      );
    }
  }

  /**
   * Tìm kiếm qua 4 tầng
   */
  public async search(request: SearchRequest): Promise<{
    results: SearchResult[];
    totalCount: number;
    executionTime: number;
    layerStats: {
      layer1: Layer1Result;
      layer2: Layer2Result;
      layer3: Layer3Result;
      layer4: Layer4Result;
    };
  }> {
    if (!this.isInitialized) {
      throw new SearchError(
        "Search Service chưa được khởi tạo",
        "NOT_INITIALIZED"
      );
    }

    const totalStartTime = Date.now();

    try {
      console.log(`Bắt đầu tìm kiếm: "${request.query}"`);

      // Tầng 1: Inverted Index - Lọc nhanh bằng keyword
      console.log("Tầng 1: Inverted Index...");
      const layer1Result = await this.layer1.search(request);
      console.log(
        `Tầng 1: Tìm thấy ${layer1Result.totalCount} documents trong ${layer1Result.executionTime}ms`
      );

      if (layer1Result.documentIds.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - totalStartTime,
          layerStats: {
            layer1: layer1Result,
            layer2: { results: [], totalCount: 0, executionTime: 0 },
            layer3: {
              results: [],
              totalCount: 0,
              executionTime: 0,
              vectorScores: [],
            },
            layer4: {
              results: [],
              totalCount: 0,
              executionTime: 0,
              personalizationScore: 0,
            },
          },
        };
      }

      // Tầng 2: BM25 - Rút gọn tập kết quả
      console.log("Tầng 2: BM25...");
      const layer2Result = await this.layer2.search(request, layer1Result);
      console.log(
        `Tầng 2: Rút gọn xuống ${layer2Result.totalCount} documents trong ${layer2Result.executionTime}ms`
      );

      if (layer2Result.results.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - totalStartTime,
          layerStats: {
            layer1: layer1Result,
            layer2: layer2Result,
            layer3: {
              results: [],
              totalCount: 0,
              executionTime: 0,
              vectorScores: [],
            },
            layer4: {
              results: [],
              totalCount: 0,
              executionTime: 0,
              personalizationScore: 0,
            },
          },
        };
      }

      // Tầng 3: Vector Search - Re-ranking bằng ML
      console.log("Tầng 3: Vector Search...");
      const layer3Result = await this.layer3.search(request, layer2Result);
      console.log(
        `Tầng 3: Re-ranking xuống ${layer3Result.totalCount} documents trong ${layer3Result.executionTime}ms`
      );

      if (layer3Result.results.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - totalStartTime,
          layerStats: {
            layer1: layer1Result,
            layer2: layer2Result,
            layer3: layer3Result,
            layer4: {
              results: [],
              totalCount: 0,
              executionTime: 0,
              personalizationScore: 0,
            },
          },
        };
      }

      // Tầng 4: Personalization - Cá nhân hóa + ngữ cảnh
      console.log("Tầng 4: Personalization...");
      const layer4Result = await this.layer4.personalize(request, layer3Result);
      console.log(
        `Tầng 4: Cá nhân hóa ${layer4Result.totalCount} documents trong ${layer4Result.executionTime}ms`
      );

      const totalExecutionTime = Date.now() - totalStartTime;
      console.log(`Hoàn thành tìm kiếm trong ${totalExecutionTime}ms`);

      return {
        results: layer4Result.results,
        totalCount: layer4Result.totalCount,
        executionTime: totalExecutionTime,
        layerStats: {
          layer1: layer1Result,
          layer2: layer2Result,
          layer3: layer3Result,
          layer4: layer4Result,
        },
      };
    } catch (error) {
      throw new SearchError(
        `Lỗi khi thực hiện tìm kiếm: ${error}`,
        "SEARCH_ERROR"
      );
    }
  }

  /**
   * Tìm kiếm nhanh chỉ với Layer 1 (Inverted Index)
   */
  public async quickSearch(request: SearchRequest): Promise<Layer1Result> {
    return await this.layer1.search(request);
  }

  /**
   * Tìm kiếm boolean
   */
  public async booleanSearch(
    query: string,
    operator: "AND" | "OR" | "NOT" = "OR"
  ): Promise<Layer1Result> {
    return await this.layer1.booleanSearch(query, operator);
  }

  /**
   * Semantic search chỉ với Vector Search
   */
  public async semanticSearch(
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    return await this.layer3.semanticSearch(query, limit);
  }

  /**
   * Tìm documents tương tự
   */
  public async findSimilarDocuments(
    documentId: string,
    limit: number = 5
  ): Promise<any[]> {
    return await this.layer3.findSimilarDocuments(documentId, limit);
  }

  /**
   * Ghi lại user behavior
   */
  public async recordUserBehavior(
    userId: string,
    action: "click" | "search" | "time_spent",
    data: any
  ): Promise<void> {
    await this.layer4.recordUserBehavior(userId, action, data);
  }

  /**
   * Cập nhật user profile
   */
  public async updateUserProfile(userId: string, profile: any): Promise<void> {
    await this.layer4.updateUserProfile(userId, profile);
  }

  /**
   * Lấy thống kê của tất cả layers
   */
  public getStats(): {
    layer1: any;
    layer2: any;
    layer3: any;
    layer4: any;
    isInitialized: boolean;
  } {
    return {
      layer1: this.layer1.getIndexStats(),
      layer2: this.layer2.getStats(),
      layer3: this.layer3.getStats(),
      layer4: this.layer4.getStats(),
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    layers: {
      layer1: boolean;
      layer2: boolean;
      layer3: boolean;
      layer4: boolean;
    };
    details: any;
  }> {
    try {
      const stats = this.getStats();

      const layers = {
        layer1: stats.layer1.totalDocuments > 0,
        layer2: stats.layer2.totalDocuments > 0,
        layer3: stats.layer3.isModelLoaded,
        layer4: true, // Layer 4 luôn available
      };

      const allHealthy = Object.values(layers).every((status) => status);

      return {
        status: allHealthy ? "healthy" : "unhealthy",
        layers,
        details: stats,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        layers: {
          layer1: false,
          layer2: false,
          layer3: false,
          layer4: false,
        },
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Batch thêm documents
   */
  public async addDocuments(documents: Document[]): Promise<void> {
    console.log(`Đang thêm ${documents.length} documents...`);

    for (const document of documents) {
      await this.addDocument(document);
    }

    console.log(`Đã thêm thành công ${documents.length} documents`);
  }

  /**
   * Batch xóa documents
   */
  public async removeDocuments(documentIds: string[]): Promise<number> {
    console.log(`Đang xóa ${documentIds.length} documents...`);

    let successCount = 0;
    for (const documentId of documentIds) {
      const success = await this.removeDocument(documentId);
      if (success) successCount++;
    }

    console.log(
      `Đã xóa thành công ${successCount}/${documentIds.length} documents`
    );
    return successCount;
  }
}
