import * as natural from "natural";
import { config } from "../config";
import {
  BM25Params,
  BM25Score,
  Document,
  Layer1Result,
  Layer2Result,
  LayerError,
  SearchRequest,
  SearchResult,
} from "../types";

export class Layer2BM25 {
  private documents: Map<string, Document>;
  private documentLengths: Map<string, number>;
  private averageDocumentLength: number;
  private termDocumentFrequency: Map<string, number>;
  private totalDocuments: number;
  private tokenizer: natural.WordTokenizer;
  private bm25Params: BM25Params;

  constructor(bm25Params?: Partial<BM25Params>) {
    this.documents = new Map<string, Document>();
    this.documentLengths = new Map<string, number>();
    this.averageDocumentLength = 0;
    this.termDocumentFrequency = new Map<string, number>();
    this.totalDocuments = 0;
    this.tokenizer = new natural.WordTokenizer();

    // BM25 parameters (tối ưu cho hầu hết trường hợp)
    this.bm25Params = {
      k1: bm25Params?.k1 || 1.2,
      b: bm25Params?.b || 0.75,
    };
  }

  /**
   * Thêm document vào BM25 index
   */
  public addDocument(document: Document): void {
    try {
      const tokens = this.tokenizeAndNormalize(
        `${document.title} ${document.content}`
      );
      const documentLength = tokens.length;

      // Lưu document và độ dài
      this.documents.set(document.id, document);
      this.documentLengths.set(document.id, documentLength);
      this.totalDocuments++;

      // Cập nhật average document length
      this.updateAverageDocumentLength();

      // Cập nhật term document frequency
      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach((token) => {
        const currentDf = this.termDocumentFrequency.get(token) || 0;
        this.termDocumentFrequency.set(token, currentDf + 1);
      });
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thêm document vào BM25 index: ${error}`,
        "Layer2",
        error as Error
      );
    }
  }

  /**
   * Tính toán BM25 score cho query
   */
  public async search(
    request: SearchRequest,
    layer1Results: Layer1Result
  ): Promise<Layer2Result> {
    const startTime = Date.now();

    try {
      const queryTokens = this.tokenizeAndNormalize(request.query);

      if (queryTokens.length === 0 || layer1Results.documentIds.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
        };
      }

      // Tính BM25 scores cho các documents từ Layer 1
      const bm25Scores = this.calculateBM25Scores(
        queryTokens,
        layer1Results.documentIds
      );

      // Sắp xếp theo score giảm dần
      bm25Scores.sort((a, b) => b.score - a.score);

      // Giới hạn kết quả
      const limitedScores = bm25Scores.slice(0, config.search.maxResultsLayer2);

      // Chuyển đổi thành SearchResult
      const results: SearchResult[] = limitedScores.map((score) => {
        const document = this.documents.get(score.documentId);
        if (!document) {
          throw new Error(`Document ${score.documentId} không tồn tại`);
        }

        return {
          id: document.id,
          title: document.title,
          content: this.truncateContent(document.content, 200),
          url: document.url,
          score: score.score,
          metadata: {
            bm25Score: score.score,
            termScores: score.termScores,
            documentLength: this.documentLengths.get(document.id) || 0,
            ...document.metadata,
          },
        };
      });

      return {
        results,
        totalCount: bm25Scores.length,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tính toán BM25 scores: ${error}`,
        "Layer2",
        error as Error
      );
    }
  }

  /**
   * Tính TF-IDF scores (alternative to BM25)
   */
  public async calculateTFIDF(
    request: SearchRequest,
    layer1Results: Layer1Result
  ): Promise<Layer2Result> {
    const startTime = Date.now();

    try {
      const queryTokens = this.tokenizeAndNormalize(request.query);

      if (queryTokens.length === 0 || layer1Results.documentIds.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
        };
      }

      const tfidfScores = this.calculateTFIDFScores(
        queryTokens,
        layer1Results.documentIds
      );

      // Sắp xếp theo score giảm dần
      tfidfScores.sort((a, b) => b.score - a.score);

      // Giới hạn kết quả
      const limitedScores = tfidfScores.slice(
        0,
        config.search.maxResultsLayer2
      );

      // Chuyển đổi thành SearchResult
      const results: SearchResult[] = limitedScores.map((score) => {
        const document = this.documents.get(score.documentId);
        if (!document) {
          throw new Error(`Document ${score.documentId} không tồn tại`);
        }

        return {
          id: document.id,
          title: document.title,
          content: this.truncateContent(document.content, 200),
          url: document.url,
          score: score.score,
          metadata: {
            tfidfScore: score.score,
            termScores: score.termScores,
            documentLength: this.documentLengths.get(document.id) || 0,
            ...document.metadata,
          },
        };
      });

      return {
        results,
        totalCount: tfidfScores.length,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tính toán TF-IDF scores: ${error}`,
        "Layer2",
        error as Error
      );
    }
  }

  /**
   * Tính BM25 scores cho documents
   */
  private calculateBM25Scores(
    queryTokens: string[],
    documentIds: string[]
  ): BM25Score[] {
    const scores: BM25Score[] = [];

    documentIds.forEach((documentId) => {
      const documentLength = this.documentLengths.get(documentId) || 0;
      let totalScore = 0;
      const termScores: Record<string, number> = {};

      queryTokens.forEach((term) => {
        const tf = this.getTermFrequency(term, documentId);
        const df = this.termDocumentFrequency.get(term) || 0;

        if (tf > 0 && df > 0) {
          // BM25 formula
          const idf = Math.log((this.totalDocuments - df + 0.5) / (df + 0.5));
          const numerator = tf * (this.bm25Params.k1 + 1);
          const denominator =
            tf +
            this.bm25Params.k1 *
              (1 -
                this.bm25Params.b +
                this.bm25Params.b *
                  (documentLength / this.averageDocumentLength));

          const termScore = idf * (numerator / denominator);
          totalScore += termScore;
          termScores[term] = termScore;
        }
      });

      if (totalScore > 0) {
        scores.push({
          documentId,
          score: totalScore,
          termScores,
        });
      }
    });

    return scores;
  }

  /**
   * Tính TF-IDF scores cho documents
   */
  private calculateTFIDFScores(
    queryTokens: string[],
    documentIds: string[]
  ): BM25Score[] {
    const scores: BM25Score[] = [];

    documentIds.forEach((documentId) => {
      const documentLength = this.documentLengths.get(documentId) || 0;
      let totalScore = 0;
      const termScores: Record<string, number> = {};

      queryTokens.forEach((term) => {
        const tf = this.getTermFrequency(term, documentId);
        const df = this.termDocumentFrequency.get(term) || 0;

        if (tf > 0 && df > 0) {
          // TF-IDF formula
          const normalizedTf = tf / documentLength;
          const idf = Math.log(this.totalDocuments / df);

          const termScore = normalizedTf * idf;
          totalScore += termScore;
          termScores[term] = termScore;
        }
      });

      if (totalScore > 0) {
        scores.push({
          documentId,
          score: totalScore,
          termScores,
        });
      }
    });

    return scores;
  }

  /**
   * Lấy term frequency trong document
   */
  private getTermFrequency(term: string, documentId: string): number {
    const document = this.documents.get(documentId);
    if (!document) return 0;

    const tokens = this.tokenizeAndNormalize(
      `${document.title} ${document.content}`
    );
    return tokens.filter((token) => token === term).length;
  }

  /**
   * Cập nhật average document length
   */
  private updateAverageDocumentLength(): void {
    if (this.totalDocuments === 0) {
      this.averageDocumentLength = 0;
      return;
    }

    const totalLength = Array.from(this.documentLengths.values()).reduce(
      (sum, length) => sum + length,
      0
    );

    this.averageDocumentLength = totalLength / this.totalDocuments;
  }

  /**
   * Tokenize và normalize text
   */
  private tokenizeAndNormalize(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];

    return tokens
      .map((token: string) => token.replace(/[^\w]/g, ""))
      .filter((token: string) => token.length > 2 && !this.isStopWord(token));
  }

  /**
   * Kiểm tra stop word
   */
  private isStopWord(token: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ]);
    return stopWords.has(token);
  }

  /**
   * Cắt ngắn content
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + "...";
  }

  /**
   * Lấy thống kê BM25 index
   */
  public getStats(): {
    totalDocuments: number;
    averageDocumentLength: number;
    uniqueTerms: number;
    bm25Params: BM25Params;
  } {
    return {
      totalDocuments: this.totalDocuments,
      averageDocumentLength: this.averageDocumentLength,
      uniqueTerms: this.termDocumentFrequency.size,
      bm25Params: this.bm25Params,
    };
  }

  /**
   * Cập nhật BM25 parameters
   */
  public updateBM25Params(params: Partial<BM25Params>): void {
    this.bm25Params = { ...this.bm25Params, ...params };
  }

  /**
   * Xóa document khỏi index
   */
  public removeDocument(documentId: string): boolean {
    const document = this.documents.get(documentId);
    if (!document) {
      return false;
    }

    // const documentLength = this.documentLengths.get(documentId) || 0;

    // Cập nhật term document frequency
    const tokens = this.tokenizeAndNormalize(
      `${document.title} ${document.content}`
    );
    const uniqueTokens = new Set(tokens);

    uniqueTokens.forEach((token) => {
      const currentDf = this.termDocumentFrequency.get(token) || 0;
      if (currentDf > 1) {
        this.termDocumentFrequency.set(token, currentDf - 1);
      } else {
        this.termDocumentFrequency.delete(token);
      }
    });

    // Xóa document
    this.documents.delete(documentId);
    this.documentLengths.delete(documentId);
    this.totalDocuments--;

    // Cập nhật average document length
    this.updateAverageDocumentLength();

    return true;
  }
}
