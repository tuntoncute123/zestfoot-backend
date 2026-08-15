import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import urllib.request
import ssl

# Reconfigure stdout/stderr for UTF-8 Vietnamese output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add local src folder to path for ML modules
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

import ml_analytics

# Helper for synchronous HTTP requests (Ollama local)
def sync_post_request(url, headers, body):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx) as response:
        return response.status, response.read()

def load_env_file():
    """Load environment variables from parent .env or .env.local if present."""
    for env_name in [".env.local", ".env"]:
        env_path = ROOT.parent / env_name
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'").strip('"')
                            os.environ[k] = v
            except Exception as e:
                print(f"Error loading {env_name}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown."""
    load_env_file()
    print("[Python Microservice] Started - ML Analytics & Ollama Chat ready.")
    yield
    print("[Python Microservice] Shutting down...")

app = FastAPI(title="ZestFoot ML & AI Microservice", version="2.0.0", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_metadata: Optional[list] = None

class ChatResponse(BaseModel):
    reply: str
    session_metadata: Optional[list] = None
    generated_image: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint to report status to Admin dashboard."""
    return {
        "status": "healthy",
        "service": "ZestFoot Python ML Microservice",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/test-status")
async def get_test_status():
    """Return local service health status."""
    return {
        "last_tested": datetime.now(timezone.utc).isoformat(),
        "status": "ok",
        "slot_used": "Local Python ML Engine",
        "total_slots": 1,
        "reply_snippet": "Python ML Service Active",
        "error": None
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """Chat endpoint using local Ollama (Qwen2.5)."""
    prompt = req.message.strip() if req.message else "Xin chào!"
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    try:
        body = {
            "model": ollama_model,
            "messages": [
                {"role": "system", "content": "Bạn là trợ lý AI ZestFoot. Trả lời thân thiện, ngắn gọn bằng tiếng Việt."},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }
        
        status_code, res_bytes = await asyncio.to_thread(
            sync_post_request, f"{ollama_url}/api/chat", {"Content-Type": "application/json"}, body
        )
        
        res_data = json.loads(res_bytes.decode("utf-8"))
        reply_text = res_data.get("message", {}).get("content", "Xin chào! Tôi có thể giúp gì cho bạn?")
        
        return ChatResponse(
            reply=reply_text,
            session_metadata=[],
            generated_image=None
        )
    except Exception as e:
        print(f"[OllamaLocal] Error calling Ollama: {e}")
        return ChatResponse(
            reply="Xin chào! Tôi là trợ lý AI ZestFoot. Bạn cần hỗ trợ gì hôm nay?",
            session_metadata=[],
            generated_image=None
        )

# ML Analytics & Recommendation Endpoints
@app.get("/api/ml/analytics")
async def ml_analytics_endpoint():
    """Endpoint for ML forecasting, RFM scoring, and targeted discounts."""
    load_env_file()
    try:
        forecasts = ml_analytics.get_demand_forecasting()
        customer_scores = ml_analytics.get_customer_ml_scores()
        return {
            "success": True,
            "demandForecast": forecasts,
            "customerScores": customer_scores
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running ML analytics: {str(e)}"
        )

@app.get("/api/ml/recommend")
async def ml_recommend_endpoint(email: str, limit: int = 5):
    """Endpoint for collaborative filtering product recommendations."""
    load_env_file()
    try:
        recs = ml_analytics.get_recommendations(email, limit)
        return {
            "success": True,
            "recommendations": recs
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
