from fastapi import FastAPI

app = FastAPI(title="NOVA Sovereign AI")

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "NOVA"
    }
