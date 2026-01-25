
import { GoogleGenAI } from "@google/genai";

export const askDM = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Use 'gemini-3-pro-preview' for complex rule interpretation and reasoning tasks
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: query,
    config: {
      systemInstruction: "你是一位資深的 Dungeons & Dragons 第五版地下城主 (DM)。請提供簡潔、準確的規則解釋、法術說明或背景知識。回應請使用繁體中文，並針對行動裝置閱讀進行優化。如果被問及法術，請提供成分、持續時間和效果。",
      temperature: 0.7,
    },
  });

  return response.text;
};

export const generateFlavourText = async (action: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Use 'gemini-3-flash-preview' for creative text generation
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `請為以下動作描述一個酷炫、具有電影感的 D&D 瞬間：${action}`,
    config: {
      systemInstruction: "你是一位擅長寫作的敘事者。請為 D&D 的動作寫出 2-3 句富有戲劇性、身臨其境感的場景描述（使用繁體中文）。",
      temperature: 0.9,
    },
  });

  return response.text;
};
