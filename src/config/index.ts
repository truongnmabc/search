import dotenv from "dotenv";

dotenv.config();

export interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  elasticsearch: {
    url: string;
    index: string;
  };
  redis: {
    url: string;
    prefix: string;
  };
  mongodb: {
    uri: string;
  };
  ml: {
    bertModelPath: string;
    vectorDimension: number;
  };
  search: {
    maxResultsLayer1: number;
    maxResultsLayer2: number;
    maxResultsLayer3: number;
    maxFinalResults: number;
  };
  personalization: {
    userProfileWeight: number;
    contextWeight: number;
    temporalWeight: number;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env["PORT"] || "3000"),
    nodeEnv: process.env["NODE_ENV"] || "development",
  },

  elasticsearch: {
    url: process.env["ELASTICSEARCH_URL"] || "http://localhost:9200",
    index: process.env["ELASTICSEARCH_INDEX"] || "search_documents",
  },

  redis: {
    url: process.env["REDIS_URL"] || "redis://localhost:6379",
    prefix: process.env["REDIS_PREFIX"] || "search:",
  },

  mongodb: {
    uri: process.env["MONGODB_URI"] || "mongodb://localhost:27017/search_db",
  },

  ml: {
    bertModelPath:
      process.env["BERT_MODEL_PATH"] || "./models/bert-base-uncased",
    vectorDimension: parseInt(process.env["VECTOR_DIMENSION"] || "768"),
  },

  search: {
    maxResultsLayer1: parseInt(process.env["MAX_RESULTS_LAYER1"] || "10000"),
    maxResultsLayer2: parseInt(process.env["MAX_RESULTS_LAYER2"] || "1000"),
    maxResultsLayer3: parseInt(process.env["MAX_RESULTS_LAYER3"] || "100"),
    maxFinalResults: parseInt(process.env["MAX_FINAL_RESULTS"] || "20"),
  },

  personalization: {
    userProfileWeight: parseFloat(process.env["USER_PROFILE_WEIGHT"] || "0.3"),
    contextWeight: parseFloat(process.env["CONTEXT_WEIGHT"] || "0.2"),
    temporalWeight: parseFloat(process.env["TEMPORAL_WEIGHT"] || "0.1"),
  },
};
