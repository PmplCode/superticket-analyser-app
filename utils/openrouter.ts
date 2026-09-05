import axios from "axios";

export interface ExtractedTicketData {
  date: string;
  supermarket: string;
  items: { name: string; price: number; category: string }[];
  total: number;
}

export const analyzeReceipt = async (
  imageUrl: string
): Promise<ExtractedTicketData | null> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OpenRouter API key is missing");
    return null;
  }

  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      if (attempt > 1) {
        console.log(`OpenRouter: Retrying analysis (Attempt ${attempt})...`);
      }

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "minimax/minimax-m3:free",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this shopping ticket image and extract the following information in JSON format:
- supermarket: name of the store
- date: date of the receipt (YYYY-MM-DD)
- total: total amount spent (number)
- items: list of products, each with name, price (number).

Return ONLY the JSON object.`.trim(),
                },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.EXPO_PUBLIC_SITE_URL || "https://superticket.app",
            "X-Title": process.env.EXPO_PUBLIC_SITE_NAME || "SuperTicket",
          },
          timeout: 120000, // 120 seconds timeout
        }
      );

      // Check for provider errors in the successful response body
      if (response.data?.error) {
        const errorMsg = response.data.error.message || "Unknown provider error";
        console.log(`OpenRouter Provider Error: ${errorMsg}`);
        if (attempt < maxRetries) {
          console.log("Waiting 2s before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return null;
      }

      if (!response.data?.choices?.[0]?.message) {
        console.log("OpenRouter: Invalid response structure (no choices)");
        return null;
      }

      const content = response.data.choices[0].message.content;
      if (!content) {
        console.log("OpenRouter: Empty content returned");
        return null;
      }

      const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanJson);

    } catch (error: any) {
      const status = error.response?.status;
      const isRetryable = status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED';
      
      console.log(`OpenRouter analysis failed: ${error.message}${status ? ` (Status ${status})` : ""}`);

      if (attempt < maxRetries && isRetryable) {
        console.log("Waiting 2s before retry...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      return null;
    }
  }
  return null;
};
