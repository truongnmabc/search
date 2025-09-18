import { config } from "../config";
import {
  Layer3Result,
  Layer4Result,
  LayerError,
  SearchContext,
  SearchRequest,
  SearchResult,
  UserProfile,
} from "../types";

export class Layer4Personalization {
  private userProfiles: Map<string, UserProfile>;
  // private userBehaviorCache: Map<string, any> = new Map();
  private contextWeights: {
    userProfile: number;
    context: number;
    temporal: number;
    location: number;
  };

  constructor() {
    this.userProfiles = new Map<string, UserProfile>();
    // this.userBehaviorCache = new Map<string, any>();
    this.contextWeights = {
      userProfile: config.personalization.userProfileWeight,
      context: config.personalization.contextWeight,
      temporal: config.personalization.temporalWeight,
      location: 0.1,
    };
  }

  /**
   * Cá nhân hóa kết quả tìm kiếm
   */
  public async personalize(
    request: SearchRequest,
    layer3Results: Layer3Result
  ): Promise<Layer4Result> {
    const startTime = Date.now();

    try {
      if (layer3Results.results.length === 0) {
        return {
          results: [],
          totalCount: 0,
          executionTime: Date.now() - startTime,
          personalizationScore: 0,
        };
      }

      let personalizedResults = [...layer3Results.results];

      // Áp dụng personalization nếu có userId
      if (request.userId) {
        personalizedResults = await this.applyUserPersonalization(
          request.userId,
          personalizedResults,
          request.context
        );
      }

      // Áp dụng contextual personalization
      if (request.context) {
        personalizedResults = await this.applyContextualPersonalization(
          personalizedResults,
          request.context
        );
      }

      // Áp dụng temporal personalization
      personalizedResults = await this.applyTemporalPersonalization(
        personalizedResults
      );

      // Sắp xếp lại theo personalized scores
      personalizedResults.sort((a, b) => b.score - a.score);

      // Giới hạn kết quả cuối cùng
      const finalResults = personalizedResults.slice(
        0,
        config.search.maxFinalResults
      );

      // Tính personalization score tổng thể
      const personalizationScore = this.calculatePersonalizationScore(
        request.userId,
        request.context
      );

      return {
        results: finalResults,
        totalCount: personalizedResults.length,
        executionTime: Date.now() - startTime,
        personalizationScore,
      };
    } catch (error) {
      throw new LayerError(
        `Lỗi khi thực hiện personalization: ${error}`,
        "Layer4",
        error as Error
      );
    }
  }

  /**
   * Áp dụng user personalization
   */
  private async applyUserPersonalization(
    userId: string,
    results: SearchResult[],
    _context?: SearchContext
  ): Promise<SearchResult[]> {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile) {
      return results;
    }

    return results.map((result) => {
      let personalizationBoost = 0;

      // Boost dựa trên user preferences
      if (
        result.metadata?.["category"] &&
        userProfile.preferences.categories.includes(result.metadata["category"])
      ) {
        personalizationBoost += 0.2;
      }

      // Boost dựa trên click history
      if (userProfile.behavior.clickHistory.includes(result.id)) {
        personalizationBoost += 0.15;
      }

      // Boost dựa trên search history (semantic similarity)
      const searchHistoryBoost = this.calculateSearchHistoryBoost(
        result,
        userProfile.behavior.searchHistory
      );
      personalizationBoost += searchHistoryBoost;

      // Boost dựa trên time spent
      const timeSpent = userProfile.behavior.timeSpent[result.id] || 0;
      if (timeSpent > 0) {
        personalizationBoost += Math.min(timeSpent / 1000, 0.1); // Normalize time spent
      }

      // Boost dựa trên demographics
      if (userProfile.demographics) {
        const demographicsBoost = this.calculateDemographicsBoost(
          result,
          userProfile.demographics
        );
        personalizationBoost += demographicsBoost;
      }

      const personalizedScore =
        result.score +
        result.score * personalizationBoost * this.contextWeights.userProfile;

      return {
        ...result,
        score: personalizedScore,
        metadata: {
          ...result.metadata,
          personalizationBoost,
          userRelevance: personalizationBoost,
        },
      };
    });
  }

  /**
   * Áp dụng contextual personalization
   */
  private async applyContextualPersonalization(
    results: SearchResult[],
    _context: SearchContext
  ): Promise<SearchResult[]> {
    return results.map((result) => {
      let contextBoost = 0;

      // Location-based boost
      if (_context.location && result.metadata?.["location"]) {
        const locationBoost = this.calculateLocationBoost(
          _context.location,
          result.metadata?.["location"]
        );
        contextBoost += locationBoost;
      }

      // Device-based boost
      if (_context.device) {
        const deviceBoost = this.calculateDeviceBoost(result, _context.device);
        contextBoost += deviceBoost;
      }

      // Session-based boost
      if (_context.sessionId) {
        const sessionBoost = this.calculateSessionBoost(
          result,
          _context.sessionId
        );
        contextBoost += sessionBoost;
      }

      // Previous queries boost
      if (_context.previousQueries && _context.previousQueries.length > 0) {
        const queryContextBoost = this.calculateQueryContextBoost(
          result,
          _context.previousQueries
        );
        contextBoost += queryContextBoost;
      }

      const contextualScore =
        result.score +
        result.score * contextBoost * this.contextWeights.context;

      return {
        ...result,
        score: contextualScore,
        metadata: {
          ...result.metadata,
          contextBoost,
          contextualRelevance: contextBoost,
        },
      };
    });
  }

  /**
   * Áp dụng temporal personalization
   */
  private async applyTemporalPersonalization(
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    return results.map((result) => {
      let temporalBoost = 0;

      // Time-of-day boost
      if (result.metadata?.["category"]) {
        const timeBoost = this.calculateTimeOfDayBoost(
          result.metadata["category"],
          hour
        );
        temporalBoost += timeBoost;
      }

      // Day-of-week boost
      if (result.metadata?.["category"]) {
        const dayBoost = this.calculateDayOfWeekBoost(
          result.metadata["category"],
          dayOfWeek
        );
        temporalBoost += dayBoost;
      }

      // Recency boost
      if (result.metadata?.["createdAt"]) {
        const recencyBoost = this.calculateRecencyBoost(
          result.metadata["createdAt"]
        );
        temporalBoost += recencyBoost;
      }

      const temporalScore =
        result.score +
        result.score * temporalBoost * this.contextWeights.temporal;

      return {
        ...result,
        score: temporalScore,
        metadata: {
          ...result.metadata,
          temporalBoost,
          temporalRelevance: temporalBoost,
        },
      };
    });
  }

  /**
   * Lấy user profile
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Kiểm tra cache trước
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // TODO: Load từ database
    // const profile = await this.loadUserProfileFromDB(userId);
    // if (profile) {
    //   this.userProfiles.set(userId, profile);
    //   return profile;
    // }

    return null;
  }

  /**
   * Cập nhật user profile
   */
  public async updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<void> {
    const existingProfile = await this.getUserProfile(userId);

    const updatedProfile: UserProfile = {
      userId,
      preferences: {
        categories: [],
        languages: [],
        topics: [],
      },
      behavior: {
        clickHistory: [],
        searchHistory: [],
        timeSpent: {},
      },
      lastUpdated: new Date(),
      ...existingProfile,
      ...profile,
    };

    this.userProfiles.set(userId, updatedProfile);

    // TODO: Save to database
    // await this.saveUserProfileToDB(updatedProfile);
  }

  /**
   * Ghi lại user behavior
   */
  public async recordUserBehavior(
    userId: string,
    action: "click" | "search" | "time_spent",
    data: any
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      // Tạo profile mới nếu chưa có
      await this.updateUserProfile(userId, {
        userId,
        preferences: { categories: [], languages: [], topics: [] },
        behavior: { clickHistory: [], searchHistory: [], timeSpent: {} },
      });
    }

    const updatedProfile = await this.getUserProfile(userId);
    if (!updatedProfile) return;

    switch (action) {
      case "click":
        if (!updatedProfile.behavior.clickHistory.includes(data.documentId)) {
          updatedProfile.behavior.clickHistory.push(data.documentId);
          // Giới hạn lịch sử click
          if (updatedProfile.behavior.clickHistory.length > 100) {
            updatedProfile.behavior.clickHistory =
              updatedProfile.behavior.clickHistory.slice(-100);
          }
        }
        break;

      case "search":
        updatedProfile.behavior.searchHistory.push(data.query);
        // Giới hạn lịch sử search
        if (updatedProfile.behavior.searchHistory.length > 50) {
          updatedProfile.behavior.searchHistory =
            updatedProfile.behavior.searchHistory.slice(-50);
        }
        break;

      case "time_spent":
        updatedProfile.behavior.timeSpent[data.documentId] =
          (updatedProfile.behavior.timeSpent[data.documentId] || 0) +
          data.timeSpent;
        break;
    }

    await this.updateUserProfile(userId, updatedProfile);
  }

  /**
   * Tính search history boost
   */
  private calculateSearchHistoryBoost(
    result: SearchResult,
    searchHistory: string[]
  ): number {
    if (searchHistory.length === 0) return 0;

    // Đơn giản: boost nếu title hoặc content chứa từ khóa từ search history
    const resultText = `${result.title} ${result.content}`.toLowerCase();
    let boost = 0;

    searchHistory.forEach((query) => {
      const queryWords = query.toLowerCase().split(" ");
      queryWords.forEach((word) => {
        if (resultText.includes(word)) {
          boost += 0.05;
        }
      });
    });

    return Math.min(boost, 0.2); // Cap at 0.2
  }

  /**
   * Tính demographics boost
   */
  private calculateDemographicsBoost(
    result: SearchResult,
    demographics: any
  ): number {
    let boost = 0;

    // Age-based boost
    if (demographics.age && result.metadata?.["ageGroup"]) {
      const ageMatch = this.calculateAgeMatch(
        demographics.age,
        result.metadata["ageGroup"]
      );
      boost += ageMatch * 0.1;
    }

    // Interest-based boost
    if (demographics.interests && result.metadata?.["tags"]) {
      const interestMatch = this.calculateInterestMatch(
        demographics.interests,
        result.metadata["tags"]
      );
      boost += interestMatch * 0.15;
    }

    return boost;
  }

  /**
   * Tính location boost
   */
  private calculateLocationBoost(
    userLocation: any,
    resultLocation: any
  ): number {
    if (!userLocation || !resultLocation) return 0;

    // Tính khoảng cách (đơn giản)
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      resultLocation.lat,
      resultLocation.lng
    );

    // Boost giảm theo khoảng cách
    if (distance < 1) return 0.2;
    if (distance < 5) return 0.1;
    if (distance < 10) return 0.05;
    return 0;
  }

  /**
   * Tính device boost
   */
  private calculateDeviceBoost(result: SearchResult, device: string): number {
    // Boost dựa trên device type
    if (device === "mobile" && result.metadata?.["mobileOptimized"]) {
      return 0.1;
    }
    if (device === "desktop" && result.metadata?.["desktopOptimized"]) {
      return 0.05;
    }
    return 0;
  }

  /**
   * Tính session boost
   */
  private calculateSessionBoost(
    _result: SearchResult,
    _sessionId: string
  ): number {
    // TODO: Implement session-based boosting
    return 0;
  }

  /**
   * Tính query context boost
   */
  private calculateQueryContextBoost(
    result: SearchResult,
    previousQueries: string[]
  ): number {
    // Boost nếu result liên quan đến previous queries
    const resultText = `${result.title} ${result.content}`.toLowerCase();
    let boost = 0;

    previousQueries.forEach((query) => {
      const queryWords = query.toLowerCase().split(" ");
      queryWords.forEach((word) => {
        if (resultText.includes(word)) {
          boost += 0.03;
        }
      });
    });

    return Math.min(boost, 0.1);
  }

  /**
   * Tính time of day boost
   */
  private calculateTimeOfDayBoost(category: string, hour: number): number {
    const timePreferences: Record<string, number[]> = {
      news: [6, 7, 8, 18, 19, 20], // Morning and evening
      entertainment: [19, 20, 21, 22, 23], // Evening
      work: [9, 10, 11, 14, 15, 16], // Business hours
      shopping: [10, 11, 12, 15, 16, 17, 20, 21], // Day and evening
    };

    const preferredHours = timePreferences[category] || [];
    return preferredHours.includes(hour) ? 0.05 : 0;
  }

  /**
   * Tính day of week boost
   */
  private calculateDayOfWeekBoost(category: string, dayOfWeek: number): number {
    const dayPreferences: Record<string, number[]> = {
      work: [1, 2, 3, 4, 5], // Weekdays
      entertainment: [5, 6, 0], // Weekend
      shopping: [6, 0], // Weekend
      news: [1, 2, 3, 4, 5, 6, 0], // Every day
    };

    const preferredDays = dayPreferences[category] || [];
    return preferredDays.includes(dayOfWeek) ? 0.03 : 0;
  }

  /**
   * Tính recency boost
   */
  private calculateRecencyBoost(createdAt: Date): number {
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 1) return 0.1;
    if (hoursDiff < 24) return 0.05;
    if (hoursDiff < 168) return 0.02; // 1 week
    return 0;
  }

  /**
   * Tính personalization score tổng thể
   */
  private calculatePersonalizationScore(
    userId?: string,
    context?: SearchContext
  ): number {
    let score = 0;

    if (userId) {
      score += this.contextWeights.userProfile;
    }

    if (context) {
      score += this.contextWeights.context;
    }

    score += this.contextWeights.temporal;

    return Math.min(score, 1.0);
  }

  /**
   * Helper methods
   */
  private calculateAgeMatch(userAge: number, ageGroup: string): number {
    // Simple age matching logic
    const ageGroups: Record<string, [number, number]> = {
      teen: [13, 19],
      young_adult: [20, 30],
      adult: [31, 50],
      senior: [51, 100],
    };

    const [min, max] = ageGroups[ageGroup] || [0, 100];
    return userAge >= min && userAge <= max ? 1 : 0;
  }

  private calculateInterestMatch(
    userInterests: string[],
    resultTags: string[]
  ): number {
    const matches = userInterests.filter((interest) =>
      resultTags.some((tag) =>
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    );
    return matches.length / Math.max(userInterests.length, 1);
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Lấy thống kê personalization
   */
  public getStats(): {
    totalUserProfiles: number;
    contextWeights: any;
  } {
    return {
      totalUserProfiles: this.userProfiles.size,
      contextWeights: this.contextWeights,
    };
  }
}
