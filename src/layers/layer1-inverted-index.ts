import * as natural from "natural";
import { config } from "../config";
import {
  Document,
  InvertedIndex,
  InvertedIndexEntry,
  Layer1Result,
  LayerError,
  SearchRequest,
} from "../types";

export class Layer1InvertedIndex {
  private index: InvertedIndex;
  private documents: Map<string, Document>;
  private tokenizer: natural.WordTokenizer;

  constructor() {
    this.index = {
      index: new Map<string, InvertedIndexEntry>(),
      documentCount: 0,
      totalTerms: 0,
    };
    this.documents = new Map<string, Document>();
    this.tokenizer = new natural.WordTokenizer();
  }

  /**
   * Thêm tài liệu vào inverted index
   */
  public addDocument(document: Document): void {
    try {
      // Tokenize và normalize text
      const titleTokens = this.tokenizeAndNormalize(document.title);
      const contentTokens = this.tokenizeAndNormalize(document.content);
      const allTokens = [...titleTokens, ...contentTokens];

      // Lưu document
      this.documents.set(document.id, document);
      this.index.documentCount++;

      // Cập nhật inverted index
      allTokens.forEach((token) => {
        if (!this.index.index.has(token)) {
          this.index.index.set(token, {
            term: token,
            documentIds: new Set<string>(),
            termFrequency: new Map<string, number>(),
            documentFrequency: 0,
          });
        }

        const entry = this.index.index.get(token)!;
        entry.documentIds.add(document.id);

        // Cập nhật term frequency
        const currentTf = entry.termFrequency.get(document.id) || 0;
        entry.termFrequency.set(document.id, currentTf + 1);

        // Cập nhật document frequency
        entry.documentFrequency = entry.documentIds.size;
      });

      this.index.totalTerms += allTokens.length;
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thêm document vào inverted index: ${error}`,
        "Layer1",
        error as Error
      );
    }
  }

  /**
   * Tìm kiếm nhanh bằng keyword matching
   */
  public async search(request: SearchRequest): Promise<Layer1Result> {
    const startTime = Date.now();

    try {
      const queryTokens = this.tokenizeAndNormalize(request.query);

      if (queryTokens.length === 0) {
        return {
          documentIds: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
        };
      }

      // Tìm documents chứa ít nhất một term từ query
      const candidateDocuments = new Set<string>();

      queryTokens.forEach((token) => {
        const entry = this.index.index.get(token);
        if (entry) {
          entry.documentIds.forEach((docId) => {
            candidateDocuments.add(docId);
          });
        }
      });

      // Chuyển đổi thành array và giới hạn kết quả
      const documentIds = Array.from(candidateDocuments).slice(
        0,
        config.search.maxResultsLayer1
      );

      return {
        documentIds,
        totalCount: candidateDocuments.size,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi tìm kiếm trong Layer 1: ${error}`,
        "Layer1",
        error as Error
      );
    }
  }

  /**
   * Tìm kiếm boolean (AND, OR, NOT)
   */
  public async booleanSearch(
    query: string,
    operator: "AND" | "OR" | "NOT" = "OR"
  ): Promise<Layer1Result> {
    const startTime = Date.now();

    try {
      const queryTokens = this.tokenizeAndNormalize(query);

      if (queryTokens.length === 0) {
        return {
          documentIds: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
        };
      }

      let resultDocuments: Set<string>;

      switch (operator) {
        case "AND":
          resultDocuments = this.intersectDocuments(queryTokens);
          break;
        case "OR":
          resultDocuments = this.unionDocuments(queryTokens);
          break;
        case "NOT":
          resultDocuments = this.excludeDocuments(queryTokens);
          break;
        default:
          resultDocuments = this.unionDocuments(queryTokens);
      }

      const documentIds = Array.from(resultDocuments).slice(
        0,
        config.search.maxResultsLayer1
      );

      return {
        documentIds,
        totalCount: resultDocuments.size,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thực hiện boolean search: ${error}`,
        "Layer1",
        error as Error
      );
    }
  }

  /**
   * Lấy thống kê về index
   */
  public getIndexStats(): {
    totalDocuments: number;
    totalTerms: number;
    uniqueTerms: number;
    averageTermsPerDocument: number;
  } {
    return {
      totalDocuments: this.index.documentCount,
      totalTerms: this.index.totalTerms,
      uniqueTerms: this.index.index.size,
      averageTermsPerDocument:
        this.index.documentCount > 0
          ? this.index.totalTerms / this.index.documentCount
          : 0,
    };
  }

  /**
   * Lấy document theo ID
   */
  public getDocument(documentId: string): Document | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Xóa document khỏi index
   */
  public removeDocument(documentId: string): boolean {
    const document = this.documents.get(documentId);
    if (!document) {
      return false;
    }

    // Tokenize document để tìm các terms cần cập nhật
    const titleTokens = this.tokenizeAndNormalize(document.title);
    const contentTokens = this.tokenizeAndNormalize(document.content);
    const allTokens = [...titleTokens, ...contentTokens];

    // Cập nhật inverted index
    allTokens.forEach((token) => {
      const entry = this.index.index.get(token);
      if (entry) {
        entry.documentIds.delete(documentId);
        entry.termFrequency.delete(documentId);
        entry.documentFrequency = entry.documentIds.size;

        // Xóa entry nếu không còn document nào
        if (entry.documentIds.size === 0) {
          this.index.index.delete(token);
        }
      }
    });

    // Xóa document
    this.documents.delete(documentId);
    this.index.documentCount--;

    return true;
  }

  /**
   * Tokenize và normalize text
   */
  private tokenizeAndNormalize(text: string): string[] {
    // Tokenize
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];

    // Normalize và filter
    return tokens
      .map((token: string) => {
        // Loại bỏ punctuation và numbers
        return token.replace(/[^\w]/g, "");
      })
      .filter((token: string) => {
        // Loại bỏ stop words và tokens quá ngắn
        return token.length > 2 && !this.isStopWord(token);
      });
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
   * Intersect documents (AND operation)
   */
  private intersectDocuments(tokens: string[]): Set<string> {
    if (tokens.length === 0) return new Set();

    let result = new Set<string>();
    const firstToken = tokens[0];
    const firstEntry = this.index.index.get(firstToken!);

    if (firstEntry) {
      result = new Set(firstEntry.documentIds);
    }

    for (let i = 1; i < tokens.length; i++) {
      const entry = this.index.index.get(tokens[i]!);
      if (entry) {
        result = new Set(
          [...result].filter((docId) => entry.documentIds.has(docId))
        );
      } else {
        result.clear();
        break;
      }
    }

    return result;
  }

  /**
   * Union documents (OR operation)
   */
  private unionDocuments(tokens: string[]): Set<string> {
    const result = new Set<string>();

    tokens.forEach((token) => {
      const entry = this.index.index.get(token);
      if (entry) {
        entry.documentIds.forEach((docId) => result.add(docId));
      }
    });

    return result;
  }

  /**
   * Exclude documents (NOT operation)
   */
  private excludeDocuments(tokens: string[]): Set<string> {
    const allDocuments = new Set(this.documents.keys());
    const excludeDocuments = this.unionDocuments(tokens);

    return new Set(
      [...allDocuments].filter((docId) => !excludeDocuments.has(docId))
    );
  }
}
