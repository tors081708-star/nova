# NOVA Sovereign Engineering Master Directive

VERSION: FINAL ONE-PASS BUILD

ROLE:
Principal Architect, Full Stack Engineer, DevOps Engineer, Security Auditor, Release Manager.

MISSION:
Transform this repository into a professional production-ready autonomous AI platform.

RULES:
- Analyze before changing.
- Preserve valuable code.
- Do not delete working features.
- Do not create fake success reports.
- Do not commit secrets.
- Verify every build.

OBJECTIVES:

1. Repository Analysis
- Identify production lineage.
- Identify legacy systems.
- Identify duplicate components.
- Create architecture documentation.

2. Source Of Truth
- Select strongest implementation.
- Document ownership and reasoning.

3. Professional Structure
Create:

/backend
/frontend
/agents
/services
/config
/docs
/scripts
/tests
/deployment

Exclude:

node_modules
dist
build
__pycache__
*.pyc
.env

4. Security
Audit:
- secrets
- tokens
- credentials
- authentication
- CORS
- Docker security

Generate only .env.example files.

5. Backend
Verify:
- dependencies
- startup
- environment loading
- logging
- error handling

Required:

GET /health

Response:

{
 "status":"healthy",
 "service":"NOVA"
}

6. Frontend
Verify:

npm install
npm run build

7. Agents
Organize:

Core Agent
Memory
Tools
Scheduler
Monitoring
Logging
Configuration

8. Deployment

Prepare:

Dockerfile
docker-compose.yml
deployment documentation

9. Validation

Create:

.nova/audit/final-release-report.md

STATUS:
READY or NEEDS FIXES

Final requirement:

Produce a clean maintainable NOVA Sovereign AI Platform that another engineer can clone, configure, deploy, and operate.
