import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordItem } from "../types";

// -- Text Enrichment Service --

const wordSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    term: { type: Type.STRING },
    meaningCn: { type: Type.STRING },
    meaningEn: { type: Type.STRING },
    meaningJp: { type: Type.STRING },
    meaningJpReading: { type: Type.STRING },
  },
  required: ["term", "meaningCn", "meaningEn", "meaningJp", "meaningJpReading"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    words: {
      type: Type.ARRAY,
      items: wordSchema,
    },
  },
  required: ["title", "words"],
};

export const processGroupText = async (
  rawWords: string[],
  groupIndex: number,
  needsFiller: boolean,
  fillerCount: number
): Promise<{ title: string; words: WordItem[] }> => {
  // Initialize inside function to pick up the latest API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const model = "gemini-3-flash-preview";
  
  let prompt = `You are a vocabulary processing assistant. 
  I will give you a list of words.
  Your task:
  1. Analyze the provided words.
  2. If the list has fewer than 10 words, you MUST generate ${fillerCount} additional RANDOM "IELTS" (International English Language Testing System) vocabulary words to reach exactly 10 words total. The filler words should be sophisticated and useful for exams.
  3. For each word (both provided and generated), provide:
     - Chinese meaning (meaningCn)
     - English definition (meaningEn)
     - Japanese meaning (meaningJp)
     - Japanese Kanji Reading in Hiragana (meaningJpReading)
  
  The current group number is ${groupIndex + 1}. Set the title to "Group ${groupIndex + 1}".
  
  Input Words: ${JSON.stringify(rawWords)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error processing text:", error);
    throw error;
  }
};

// -- Image Generation Service --

export const generateVocabImage = async (
  words: WordItem[],
  userPrompt: string
): Promise<string> => {
  // Initialize inside function to pick up the latest API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use gemini-3-pro-image-preview for high quality images as requested (nano banana pro)
  const model = "gemini-3-pro-image-preview";
  
  // Construct the specific prompt based on the words
  const wordListString = words.map(w => `${w.term} (${w.meaningEn})`).join(", ");
  
  const finalPrompt = `
    ${userPrompt}
    
    Specific visual elements to include for these 5 words:
    ${wordListString}
    
    Ensure the text of the words (English term) is subtly integrated into the illustration near the relevant vignette.
    IMPORTANT: Always use the lowercase form of the words when integrating text into the art, unless the word is an acronym or strictly uppercase.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "16:9" 
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};