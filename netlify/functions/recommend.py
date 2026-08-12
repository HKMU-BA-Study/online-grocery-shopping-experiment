import os
import json
import re
from huggingface_hub import InferenceClient

HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"

client = InferenceClient(token=HF_TOKEN)

def get_ai_recommendations_from_hf(products, preferences):
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
    response = client.chat_completion(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "Output strictly valid JSON arrays without markdown."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=300,
        temperature=0.2
    )

    content = response.choices[0].message.content.strip()

    if content.startswith("```"):
        content = re.sub(r"^```[a-zA-Z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
        content = content.strip()

    return json.loads(content)

# Netlify Function 的入口函式 handler
def handler(event, context):
    # 處理 GET 測試
    if event.get("httpMethod") == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "ok", "message": "Netlify AI Function Active"})
        }

    # 處理 POST 請求
    if event.get("httpMethod") == "POST":
        try:
            body = json.loads(event.get("body", "{}"))
            products = body.get("products", [])
            preferences = body.get("preferences", {})

            if not products or len(products) < 3:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"detail": "Products list must contain at least 3 items."})
                }

            result = get_ai_recommendations_from_hf(products, preferences)

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(result)
            }

        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"detail": str(e)})
            }

    return {"statusCode": 405, "body": "Method Not Allowed"}