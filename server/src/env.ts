import dotenv from "dotenv";
dotenv.config();

export const PORT = parseInt(process.env.PORT || "5174", 10);
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. Backend calls to Veo3 will fail until configured.");
}

