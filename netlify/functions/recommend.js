const { InferenceClient } = require("@huggingface/inference");

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";

const client = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

// 1. 原本 Python 的 AI 推薦邏輯 (對應 get_ai_recommendations_from_hf)
async function getAiRecommendationsFromHf(products, preferences) {
    if (!client) {
        throw new Error("HF_TOKEN 未設定");
    }

    const simplifiedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        isEco: p.isEco
    }));

    const prompt = `
You are an AI recommender system. Select top 3 products.
User preferences: ${JSON.stringify(preferences)}
Products: ${JSON.stringify(simplifiedProducts)}

Output MUST be a valid JSON array:
[
  {"rank": 1, "item_id": 1, "reason": "Reason 1"},
  {"rank": 2, "item_id": 2, "reason": "Reason 2"},
  {"rank": 3, "item_id": 3, "reason": "Reason 3"}
]
`;

    // 設定 7 秒 timeout 防止連線逾時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await client.chatCompletion({
            model: MODEL_NAME,
            messages: [
                { role: "system", content: "Output strictly valid JSON arrays without markdown." },
                { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.2
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        let content = response.choices[0].message.content.trim();

        // 原本 Python 裡的 Markdown ```json 清理邏輯
        if (content.startsWith("```")) {
            content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
        }

        return JSON.parse(content);
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// 2. 原本 Python 的 Fallback 備援邏輯 (對應 fallback_recommendations)
function fallbackRecommendations(products, preferences) {
    const pricePref = preferences.price_sensitivity || "medium";
    const ecoPref = preferences.sustainability_importance || "medium";

    const scored = products.map(p => {
        let score = 0;
        if (pricePref === "high" && p.price < 10) score += 2;
        if (["high", "medium"].includes(ecoPref) && p.isEco) score += 3;
        return { score, product: p };
    });

    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3).map(s => s.product);

    return top3.map((item, idx) => ({
        rank: idx + 1,
        item_id: item.id,
        reason: `Matches your preference for ${item.isEco ? "eco-friendly choices" : "great value"}.`
    }));
}

// 3. 主 Handler 進入點 (對應 def handler)
exports.handler = async function (event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    const httpMethod = (event.httpMethod || event.requestContext?.http?.method || "GET").toUpperCase();

    // CORS Preflight
    if (httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    // GET 測試驗證
    if (httpMethod === "GET") {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: "ok",
                message: "Netlify AI Function Active",
                has_token: Boolean(HF_TOKEN)
            })
        };
    }

    // POST 處理推薦請求
    if (httpMethod === "POST") {
        try {
            const body = JSON.parse(event.body || "{}");
            const products = body.products || [];
            const preferences = body.preferences || {};

            if (!products || products.length < 3) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ detail: "Products list must contain at least 3 items." })
                };
            }

            let result;
            try {
                result = await getAiRecommendationsFromHf(products, preferences);
            } catch (aiErr) {
                console.log(`[AI Model Error/Timeout]: ${aiErr.message}. Switching to Fallback system.`);
                result = fallbackRecommendations(products, preferences);
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };

        } catch (e) {
            console.log(`[Handler Exception]: ${e.message}`);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ detail: e.message })
            };
        }
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ detail: `Method ${httpMethod} Not Allowed` })
    };
};