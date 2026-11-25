import "dotenv/config";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface AiInsightRequestBody {
  summary: {
    totalIncome: number;
    totalRabTarget: number;
    totalExpense: number;
    netCashflow: number;
    rabUtilizationPct: number;
  };
  rabBreakdown: Array<{
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPct: number;
    status: string;
  }>;
  recentTransactions: Array<{
    date: string;
    type: string;
    title: string;
    category: string;
    amount: number;
    method: string;
    status: string;
  }>;
  incomeByCategory: Array<{
    category: string;
    amount: number;
  }>;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/ai-insight", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.status(503).json({
        error:
          "Kunci API Gemini belum dikonfigurasi pada server. Silakan atur GEMINI_API_KEY di panel Settings > Secrets terlebih dahulu.",
      });
      return;
    }

    const body = req.body as AiInsightRequestBody | undefined;
    if (!body || !body.summary || !Array.isArray(body.rabBreakdown)) {
      res.status(400).json({
        error: "Data ringkasan budget tidak lengkap untuk dianalisis.",
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptPayload = {
      ringkasan: body.summary,
      rincian_budget_bulanan: body.rabBreakdown,
      sumber_pemasukan: body.incomeByCategory ?? [],
      transaksi_terbaru: (body.recentTransactions ?? []).slice(0, 25),
    };

    try {
      let response;
      const maxAttempts = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: `Analisis data keuangan pribadi & budget bulanan mahasiswa/anak kos berikut ini dalam mata uang Rupiah (IDR):\n\n${JSON.stringify(
              promptPayload,
              null,
              2
            )}`,
            config: {
              systemInstruction:
                "Anda adalah Penasihat Keuangan Pribadi untuk mahasiswa dan anak kos di Indonesia (SakuKu). Gunakan istilah yang akrab seperti 'Jatah Anggaran', 'Terpakai', dan 'Sisa Uang Saku'. Berikan evaluasi yang lugas, suportif, dan akurat berdasarkan angka nyata yang diberikan, deteksi pos pengeluaran yang bocor/over-budget atau mendekati limit (seperti jajan/nongkrong), dan berikan tepat 3 tips hemat praktis untuk anak kos dalam Bahasa Indonesia yang santai namun jelas. Jangan mengarang angka di luar data yang diberikan.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  healthStatus: {
                    type: Type.STRING,
                    description:
                      "Salah satu dari: 'Sehat', 'Perlu Perhatian', atau 'Kritis'",
                  },
                  executiveSummary: {
                    type: Type.STRING,
                    description:
                      "Ringkasan 2-3 kalimat mengenai kondisi uang saku dan pemakaian budget bulanan saat ini.",
                  },
                  cashflowEvaluation: {
                    type: Type.STRING,
                    description:
                      "Evaluasi kesehatan sisa uang saku (perbandingan pemasukan terhadap pengeluaran terpakai dan ketahanan dana hingga akhir bulan).",
                  },
                  budgetLeakage: {
                    type: Type.ARRAY,
                    description:
                      "Daftar kategori budget yang terindikasi boros, mendekati limit (>80%), atau over-budget (>100%).",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        severity: {
                          type: Type.STRING,
                          description: "'Kritis', 'Peringatan', atau 'Pantau'",
                        },
                        finding: {
                          type: Type.STRING,
                          description:
                            "Penjelasan singkat penyebab atau temuan kebocoran anggaran pada kategori tersebut.",
                        },
                      },
                      required: ["category", "severity", "finding"],
                    },
                  },
                  tacticalSavings: {
                    type: Type.ARRAY,
                    description:
                      "Tepat 3 tips hemat praktis anak kos yang konkret.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        action: { type: Type.STRING },
                        estimatedImpact: {
                          type: Type.STRING,
                          description:
                            "Estimasi penghematan uang saku secara realistis.",
                        },
                      },
                      required: ["title", "action", "estimatedImpact"],
                    },
                  },
                },
                required: [
                  "healthStatus",
                  "executiveSummary",
                  "cashflowEvaluation",
                  "budgetLeakage",
                  "tacticalSavings",
                ],
              },
            },
          });
          break;
        } catch (err: unknown) {
          lastError = err;
          const rawMsg = err instanceof Error ? err.message : String(err);
          const isTransient =
            rawMsg.includes("503") ||
            rawMsg.includes("UNAVAILABLE") ||
            rawMsg.includes("429") ||
            rawMsg.includes("RESOURCE_EXHAUSTED");

          if (isTransient && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 800 * attempt));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw lastError ?? new Error("Respons AI kosong.");
      }

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : "Gagal memproses analisis AI.";
      console.error("Gemini AI Insight Error:", rawMessage);

      let friendlyMessage =
        "Layanan AI sedang sibuk. Silakan klik Coba Lagi beberapa saat lagi.";
      if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("PERMISSION_DENIED")) {
        friendlyMessage =
          "Kunci API Gemini tidak valid atau tidak memiliki izin. Periksa panel Settings > Secrets.";
      } else if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
        friendlyMessage =
          "Batas permintaan AI sementara tercapai. Tunggu sebentar lalu coba kembali.";
      } else if (rawMessage.includes("503") || rawMessage.includes("UNAVAILABLE")) {
        friendlyMessage =
          "Server model Gemini sedang mengalami lonjakan trafik sementara. Silakan klik Coba Lagi.";
      }

      res.status(503).json({
        error: friendlyMessage,
      });
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const hmrDisabled = process.env.DISABLE_HMR === "true";
    if (hmrDisabled) {
      app.get("/@vite/client", (_req, res) => {
        res.type("application/javascript").send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexHtml = path.join(distPath, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build output not found.");
      }
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`SakuKu server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
