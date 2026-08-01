# NOVA Sovereign AI Platform Deployment

## Local

1. Configure environment:

.env

2. Install backend:

pip install -r requirements.txt

3. Run:

uvicorn server:app --host 0.0.0.0 --port 8000


## Docker

docker compose up --build


## Validation

Health endpoint:

GET /health

Expected:

{
 "status":"healthy",
 "service":"NOVA"
}
