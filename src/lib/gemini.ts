import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DocSummary {
  title: string;
  type: 'QP' | 'WI' | 'Procedure' | 'Inspection' | 'Unknown';
  summary: string;
  keyPoints: string[];
  simplifiedSteps: string[];
  responsibilities: {
    role: string;
    tasks: string[];
  }[];
  visualData?: {
    label: string;
    value: number;
  }[];
}

export async function processDocument(text: string): Promise<DocSummary> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analisis teks dokumen berikut dan berikan ringkasan terstruktur dalam Bahasa Indonesia.
    Identifikasi apakah ini adalah Quality Procedure (QP), Work Instruction (WI), Prosedur, atau Form Inspeksi.
    Ekstrak juga informasi mengenai Tugas dan Tanggung Jawab (khususnya untuk inspeksi part jika ada).
    
    Teks Dokumen:
    ${text}
    
    Kembalikan hasil dalam format JSON dengan struktur berikut:
    {
      "title": "Judul Dokumen",
      "type": "QP | WI | Procedure | Inspection",
      "summary": "Ringkasan singkat dokumen",
      "keyPoints": ["poin 1", "poin 2"],
      "simplifiedSteps": ["langkah 1", "langkah 2"],
      "responsibilities": [{"role": "Nama Jabatan/Posisi", "tasks": ["tugas spesifik 1", "tugas spesifik 2"]}],
      "visualData": [{"label": "Nama Metrik", "value": 100}]
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          simplifiedSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          responsibilities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          visualData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER }
              }
            }
          }
        },
        required: ["title", "type", "summary", "keyPoints", "simplifiedSteps", "responsibilities"]
      }
    }
  });

  const textResponse = response.text || "{}";
  return JSON.parse(textResponse);
}

export async function askQuestion(text: string, question: string): Promise<{ answer: string; chartData?: { label: string; value: number }[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Berdasarkan dokumen berikut, jawablah pertanyaan pengguna dalam Bahasa Indonesia. 
    
    ATURAN JAWABAN:
    1. Gunakan format Markdown yang rapi (bullet points, penomoran, bold untuk istilah penting).
    2. Pisahkan setiap poin atau paragraf dengan baris baru agar mudah dibaca.
    3. Jika jawaban berupa langkah-langkah, gunakan penomoran (1, 2, 3).
    4. Jika pengguna meminta visualisasi, data, atau grafik, berikan data tersebut dalam format JSON di akhir jawaban Anda.
    
    Dokumen:
    ${text}
    
    Pertanyaan: ${question}
    
    Format Jawaban:
    [Teks penjelasan dalam Markdown...]
    
    [JSON_DATA]
    {"chartData": [{"label": "A", "value": 10}]} // Opsional, hanya jika diminta data/grafik
    [/JSON_DATA]`,
  });

  const fullText = response.text || "Maaf, saya tidak dapat menemukan jawaban.";
  
  // Extract JSON if present
  const jsonMatch = fullText.match(/\[JSON_DATA\]([\s\S]*?)\[\/JSON_DATA\]/);
  let chartData;
  let answer = fullText.replace(/\[JSON_DATA\][\s\S]*?\[\/JSON_DATA\]/, '').trim();

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      chartData = parsed.chartData;
    } catch (e) {
      console.error("Failed to parse chart data from AI response");
    }
  }

  return { answer, chartData };
}
