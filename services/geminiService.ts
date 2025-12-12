import { GoogleGenAI, Type } from "@google/genai";
import { Point3D } from "../types";

// Initialize Gemini
// Note: API Key is managed via process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateShapePoints = async (prompt: string, count: number = 800): Promise<Point3D[]> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `You are a 3D geometry generator. 
    Your task is to generate a JSON array of 3D coordinates (x, y, z) that form the shape described by the user. 
    - Coordinates must be normalized between -1.0 and 1.0.
    - Uniformly distribute points to form a clear volume or surface.
    - Do not include any explanation, only the JSON.
    `;

    const userPrompt = `Generate a 3D point cloud for a "${prompt}". 
    Return exactly ${count} points. 
    Output JSON format: [{"x": 0.1, "y": -0.5, "z": 0}, ...]`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              z: { type: Type.NUMBER },
            },
            required: ["x", "y", "z"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const points = JSON.parse(jsonText) as Point3D[];
    return points;

  } catch (error) {
    console.error("Failed to generate shape with Gemini:", error);
    // Fallback to a sphere if error
    return [];
  }
};
