import os, json
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel
import httpx

app = FastAPI(title="SchemaGuard", version="0.1.0")

class Payload(BaseModel):
    schema_json: dict
    instruction: Optional[str] = "Identify structural gaps, suggest improvements, and output a clean markdown API documentation template."

@app.post("/validate")
async def validate(payload: Payload):
    errors = []
    required = ["openapi", "info", "paths"]
    missing = [k for k in required if k not in payload.schema_json]
    if missing:
        errors.append(f"Missing required OpenAPI keys: {missing}")
    else:
        errors.append("Structurally valid OpenAPI draft.")

    ai_output, conf = "", 0.0
    api_key = os.getenv("LLM_API_KEY")
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "You are an API spec reviewer. Return ONLY markdown."},
                            {"role": "user", "content": f"Review this JSON/OpenAPI spec:\n```json\n{json.dumps(payload.schema_json, indent=2)}\n```\n\n{payload.instruction}"}
                        ],
                        "temperature": 0.2
                    },
                    timeout=10.0
                )
                if r.status_code == 200:
                    ai_output = r.json()["choices"][0]["message"]["content"]
                    conf = 0.9
        except Exception:
            ai_output = "LLM service unavailable. Structural validation only."

    return {
        "valid": not any("Missing" in e for e in errors),
        "notes": errors,
        "ai_docs": ai_output,
        "confidence": conf
    }