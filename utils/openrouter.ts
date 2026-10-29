import axios from "axios";
import {
  CATEGORIES,
  ExtractedTicketData,
  extractJsonObject,
  parseReceipt,
} from "./receiptSchema";

export type { ExtractedTicketData } from "./receiptSchema";

export type AnalysisErrorCode =
  | "missing_config"
  | "no_network"
  | "timeout"
  | "rate_limited"
  | "auth"
  | "model_unavailable"
  | "bad_response"
  | "cancelled";

const MESSAGES: Record<AnalysisErrorCode, string> = {
  missing_config: "AI service is not configured (API key missing).",
  no_network: "No connection. Check your internet and try again.",
  timeout: "The analysis took too long. Try again or use a smaller photo.",
  rate_limited: "The AI service is busy. Wait a minute and try again.",
  auth: "The AI service rejected the API key.",
  model_unavailable:
    "The configured AI model is unavailable or does not accept images.",
  bad_response: "Could not read the ticket. Try a clearer, well-lit photo.",
  cancelled: "Analysis cancelled.",
};

export class ReceiptAnalysisError extends Error {
  code: AnalysisErrorCode;
  detail?: string;
  constructor(code: AnalysisErrorCode, detail?: string) {
    super(detail ? `${MESSAGES[code]} (${detail})` : MESSAGES[code]);
    this.code = code;
    this.detail = detail;
  }
  get userMessage() {
    return MESSAGES[this.code];
  }
}

const ENDPOINT =
  process.env.EXPO_PUBLIC_AI_ENDPOINT ||
  "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2; // per model
// Primary first, then fallbacks. Different upstream providers so one rate-limited
// pool does not take the whole chain down. Vision-capable models only.
// Override with EXPO_PUBLIC_OPENROUTER_MODEL (comma-separated).
const DEFAULT_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "thinkingmachines/inkling-small:free",
  "google/gemma-4-31b-it:free",
  "thinkingmachines/inkling:free",
];
const getModels = () => {
  const fromEnv = (process.env.EXPO_PUBLIC_OPENROUTER_MODEL ?? "")
    .split(",")
    .map((m: string) => m.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
};
// Errors where trying another model cannot help.
const isFatal = (e: ReceiptAnalysisError) =>
  e.code === "cancelled" || e.code === "auth" || e.code === "no_network";

const PROMPT = `Extract the data of this shopping receipt as JSON with exactly this shape:
{
  "supermarket": string,            // store name
  "date": "YYYY-MM-DD",
  "total": number,                  // final amount paid
  "items": [
    {
      "name": string,               // product name as printed, expanded if abbreviated
      "price": number,              // line total paid for this item; discounts as separate negative lines
      "quantity": number | null,    // amount of the unit (e.g. 0.75 for 0.75 kg, 1 for 1 piece)
      "unit": "kg" | "g" | "l" | "ml" | "pcs" | null,
      "category": one of ${CATEGORIES.map((c) => `"${c}"`).join(", ")}
    }
  ]
}
Rules: use a dot as decimal separator, plain numbers without currency symbols, one entry per receipt line, ignore VAT/payment/loyalty lines. Respond with the JSON object only.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const classify = (error: unknown): ReceiptAnalysisError => {
  if (error instanceof ReceiptAnalysisError) return error;
  if (axios.isCancel(error)) return new ReceiptAnalysisError("cancelled");
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    const upstream = apiError?.metadata?.raw;
    const detail = [apiError?.message, typeof upstream === "string" ? upstream : ""]
      .filter(Boolean)
      .join(" - ")
      .slice(0, 200);
    if (error.code === "ECONNABORTED") return new ReceiptAnalysisError("timeout");
    if (!error.response) return new ReceiptAnalysisError("no_network");
    if (status === 429) return new ReceiptAnalysisError("rate_limited", detail);
    if (status === 401 || status === 403)
      return new ReceiptAnalysisError("auth", detail);
    if (status === 400 || status === 404)
      return new ReceiptAnalysisError("model_unavailable", detail);
    return new ReceiptAnalysisError("bad_response", `HTTP ${status}`);
  }
  return new ReceiptAnalysisError("bad_response");
};

const isRetryable = (e: ReceiptAnalysisError) =>
  e.code === "rate_limited" ||
  e.code === "timeout" ||
  e.code === "no_network" ||
  e.code === "bad_response";

export const analyzeReceipt = async (
  imageDataUri: string,
  options: { signal?: AbortSignal } = {}
): Promise<ExtractedTicketData> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new ReceiptAnalysisError("missing_config");

  let lastError = new ReceiptAnalysisError("bad_response");

  for (const model of getModels()) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await axios.post(
          ENDPOINT,
          {
            model,
            temperature: 0,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: PROMPT },
                  { type: "image_url", image_url: { url: imageDataUri } },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer":
                process.env.EXPO_PUBLIC_SITE_URL || "https://superticket.app",
              "X-Title": process.env.EXPO_PUBLIC_SITE_NAME || "SuperTicket",
            },
            timeout: TIMEOUT_MS,
            signal: options.signal,
          }
        );

        const providerError = response.data?.error;
        if (providerError) {
          const code = Number(providerError.code);
          throw new ReceiptAnalysisError(
            code === 429 ? "rate_limited" : "model_unavailable",
            String(providerError.metadata?.raw ?? providerError.message).slice(0, 200)
          );
        }

        const content = response.data?.choices?.[0]?.message?.content;
        const text =
          typeof content === "string"
            ? content
            : Array.isArray(content)
            ? content.map((p: { text?: string }) => p?.text ?? "").join("")
            : "";
        const json = extractJsonObject(text);
        if (!json) throw new ReceiptAnalysisError("bad_response", "no JSON");

        const parsed = parseReceipt(JSON.parse(json));
        if (!parsed) throw new ReceiptAnalysisError("bad_response", "no items");
        return parsed;
      } catch (error) {
        lastError =
          error instanceof SyntaxError
            ? new ReceiptAnalysisError("bad_response", "invalid JSON")
            : classify(error);
        if (lastError.code !== "cancelled") {
          lastError = new ReceiptAnalysisError(
            lastError.code,
            `${model}${lastError.detail ? `: ${lastError.detail}` : ""}`
          );
        }
        // 429 comes from a shared pool: retrying the same model only wastes time.
        if (
          !isRetryable(lastError) ||
          lastError.code === "rate_limited" ||
          attempt === MAX_ATTEMPTS
        )
          break;
        await sleep(1500 * 2 ** (attempt - 1));
      }
    }
    if (isFatal(lastError)) break;
  }

  throw lastError;
};
