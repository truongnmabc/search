import { sampleDocuments, sampleUserProfiles } from "../examples/sample-data";
import { SearchService } from "../services/search-service";
import { logger } from "../utils/logger";

/**
 * Script để khởi tạo dữ liệu mẫu cho hệ thống tìm kiếm
 */
async function initializeSampleData() {
  try {
    console.log("🚀 Bắt đầu khởi tạo dữ liệu mẫu...");

    // Khởi tạo Search Service
    const searchService = new SearchService();
    await searchService.initialize();

    console.log("✅ Search Service đã được khởi tạo");

    // Thêm documents mẫu
    console.log(`📄 Đang thêm ${sampleDocuments.length} documents mẫu...`);
    await searchService.addDocuments(sampleDocuments);
    console.log("✅ Documents mẫu đã được thêm thành công");

    // Thêm user profiles mẫu
    console.log(
      `👥 Đang thêm ${sampleUserProfiles.length} user profiles mẫu...`
    );
    for (const profile of sampleUserProfiles) {
      await searchService.updateUserProfile(profile.userId, profile);
    }
    console.log("✅ User profiles mẫu đã được thêm thành công");

    // Hiển thị thống kê
    const stats = searchService.getStats();
    console.log("\n📊 Thống kê hệ thống:");
    console.log(
      `- Layer 1 (Inverted Index): ${stats.layer1.totalDocuments} documents, ${stats.layer1.uniqueTerms} unique terms`
    );
    console.log(
      `- Layer 2 (BM25): ${stats.layer2.totalDocuments} documents, avg length: ${stats.layer2.averageDocumentLength}`
    );
    console.log(
      `- Layer 3 (Vector Search): ${stats.layer3.totalEmbeddings} embeddings, model loaded: ${stats.layer3.isModelLoaded}`
    );
    console.log(
      `- Layer 4 (Personalization): ${stats.layer4.totalUserProfiles} user profiles`
    );

    // Test tìm kiếm
    console.log("\n🔍 Testing tìm kiếm...");
    const testResult = await searchService.search({
      query: "machine learning",
      userId: "user1",
      limit: 5,
    });

    console.log(
      `✅ Tìm thấy ${testResult.totalCount} kết quả trong ${testResult.executionTime}ms`
    );
    console.log("📋 Top 3 kết quả:");
    testResult.results.slice(0, 3).forEach((result, index) => {
      console.log(
        `${index + 1}. ${result.title} (score: ${result.score.toFixed(3)})`
      );
    });

    console.log("\n🎉 Khởi tạo dữ liệu mẫu hoàn tất!");
    console.log("🌐 Server đang chạy tại: http://localhost:3000");
    console.log("📖 API documentation: Xem README.md");
  } catch (error) {
    logger.error("Lỗi khi khởi tạo dữ liệu mẫu:", error);
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  initializeSampleData();
}

export { initializeSampleData };
