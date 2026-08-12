import os
import json
import re
from huggingface_hub import InferenceClient

HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"

# 建立客戶端（若無 token 也不至於在 import 階段直接崩潰）
client = InferenceClient(token=HF_TOKEN) if HF_TOKEN else None


def get_ai_recommendations_from_hf(products, preferences):
    """呼叫 Hugging Face AI 模型生成推薦"""
    if not client:
        raise ValueError("HF_TOKEN 未設定")

    simplified_products = [
        {"id": p.get("id"), "name": p.get("name"), "price": p.get("price"), "isEco": p.get("isEco")}
        for p in products
    ]

    prompt = f"""
You are an AI recommender system. Select top 3 products.
User preferences: {json.dumps(preferences, ensure_ascii=False)}
Products: {json.dumps(simplified_products, ensure_ascii=False)}

Output MUST be a valid JSON array:
[
  {{"rank": 1, "item_id": 1, "reason": "Reason 1"}},
  {{"rank": 2, "item_id": 2, "reason": "Reason 2"}},
  {{"rank": 3, "item_id": 3, "reason": "Reason 3"}}
]
"""
    # 調降 timeout 避免卡死 Netlify Function (Netlify 免費版上限 10 秒)
    response = client.chat_completion(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "Output strictly valid JSON arrays without markdown."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        temperature=0.2,
        timeout=7  # 7秒內沒回應直接切換至備援邏輯
    )

    content = response.choices[0].message.content.strip()

    if content.startswith("```"):
        content = re.sub(r"^```[a-zA-Z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
        content = content.strip()

    return json.loads(content)


def fallback_recommendations(products, preferences):
    """備援邏輯：當 AI 模型響應超時或失敗時，由本地演算法迅速計算結果"""
    price_pref = preferences.get("price_sensitivity", "medium")
    eco_pref = preferences.get("sustainability_importance", "medium")

    scored = []
    for p in products:
        score = 0
        # 價格考量
        if price_pref == "high" and p.get("price", 0) < 10:
            score += 2
        # 環保考量
        if eco_pref in ["high", "medium"] and p.get("isEco"):
            score += 3
        scored.append((score, p))

    # 按分數排序並取前 3 名
    scored.sort(key=lambda x: x[0], reverse=True)
    top_3 = [p for _, p in scored[:3]]

    return [
        {
            "rank": idx + 1,
            "item_id": item["id"],
            "reason": f"Matches your preference for {'eco-friendly choices' if item.get('isEco') else 'great value'}."
        }
        for idx, item in enumerate(top_3)
    ]


def handler(event, context):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }

    # 取得 HTTP Method (防範大小寫差異)
    http_method = (
                event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")).upper()

    # 1. 處理 CORS Preflight 請求
    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    # 2. 處理 GET 測試 (方便直接用瀏覽器驗證 Function 是否在線)
    if http_method == "GET":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "status": "ok",
                "message": "Netlify AI Function Active",
                "has_token": bool(HF_TOKEN)
            })
        }

    # 3. 處理 POST 請求
    if http_method == "POST":
        try:
            body_str = event.get("body") or "{}"
            body = json.loads(body_str)

            products = body.get("products", [])
            preferences = body.get("preferences", {})

            if not products or len(products) < 3:
                return {
                    "statusCode": 400,
                    "headers": headers,
                    "body": json.dumps({"detail": "Products list must contain at least 3 items."})
                }

            # 嘗試呼叫 AI API；若失敗/超時，自動轉用本機邏輯
            try:
                result = get_ai_recommendations_from_hf(products, preferences)
            except Exception as ai_err:
                print(f"[AI Model Error/Timeout]: {ai_err}. Switching to Fallback system.")
                result = fallback_recommendations(products, preferences)

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(result)
            }

        except Exception as e:
            print(f"[Handler Exception]: {str(e)}")
            return {
                "statusCode": 500,
                "headers": headers,
                "body": json.dumps({"detail": str(e)})
            }

    return {
        "statusCode": 405,
        "headers": headers,
        "body": json.dumps({"detail": f"Method {http_method} Not Allowed"})
    }