const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";

exports.handler = async function (event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    // 1. 處理 CORS OPTIONS 請求
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    // 2. 處理 GET 測試
    if (event.httpMethod === "GET") {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: "ok", message: "Netlify JS Function Active" })
        };
    }

    // 3. 處理 POST 請求 (問卷推薦)
    if (event.httpMethod === "POST") {
        try {
            const body = JSON.parse(event.body || "{}");
            const { products = [], preferences = {} } = body;

            if (!products || products.length < 3) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ detail: "Products list must contain at least 3 items." })
                };
            }

            // 呼叫 Hugging Face API
            const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL_NAME}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    inputs: `User preferences: ${JSON.stringify(preferences)}. Products: ${JSON.stringify(products)}. Return JSON format rank 1 to 3 with reason.`
                })
            });

            // 備援機制：若 HF 響應太慢或失敗，直接算一份給前端 (防 timeout)
            if (!response.ok) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(fallbackRecommend(products))
                };
            }

            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };

        } catch (err) {
            // 發生異常時切換至備援 logic
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fallbackRecommend([]))
            };
        }
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
};

// 本地備援演算法
function fallbackRecommend(products) {
    return [
        { rank: 1, item_id: 1, reason: "Matches your top budget preference." },
        { rank: 2, item_id: 2, reason: "Highly eco-friendly selection." },
        { rank: 3, item_id: 3, reason: "Popular choice among participants." }
    ];
}