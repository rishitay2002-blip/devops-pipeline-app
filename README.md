# DevOps Pipeline App — SIT753 HD Task

A Node.js REST API with a full 7-stage Jenkins CI/CD pipeline.

## Project Structure

```
devops-pipeline-app/
├── src/
│   ├── app.js          # Express app (routes + logic)
│   └── server.js       # Entry point
├── tests/
│   └── app.test.js     # Jest unit + integration tests
├── monitoring/
│   └── prometheus.yml  # Prometheus scrape config
├── Dockerfile          # Multi-stage Docker build
├── docker-compose.yml  # Staging + production + Prometheus
├── Jenkinsfile         # Full 7-stage pipeline
├── sonar-project.properties  # SonarQube config
├── .eslintrc.json      # ESLint rules
└── package.json
```

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js 18+ | Runtime | https://nodejs.org |
| Docker | Build & deploy | https://docs.docker.com/get-docker/ |
| Jenkins | CI/CD server | Already installed |
| Trivy (optional) | Security scanning | https://aquasecurity.github.io/trivy |
| SonarQube (optional) | Code quality | https://www.sonarqube.org |

## Quick Start (local)

```bash
git clone <your-repo-url>
cd devops-pipeline-app
npm install
npm test
npm start
# Visit http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome message |
| GET | `/health` | Health check (used by monitoring) |
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |
| DELETE | `/users/:id` | Delete user |

## Jenkins Setup

### 1. Required Jenkins Plugins
Install these via **Manage Jenkins → Plugins**:
- Pipeline
- Git
- HTML Publisher (for coverage reports)
- Docker Pipeline
- SonarQube Scanner *(optional — for Code Quality stage)*

### 2. Create the Pipeline Job
1. New Item → **Pipeline**
2. Under **Pipeline**, select **Pipeline script from SCM**
3. SCM: **Git** → enter your repository URL
4. Script Path: `Jenkinsfile`
5. Save → **Build Now**

### 3. Pipeline Stages

| # | Stage | Tool | Port |
|---|-------|------|------|
| 1 | Build | npm + Docker | — |
| 2 | Test | Jest + Supertest | — |
| 3 | Code Quality | ESLint + SonarQube | — |
| 4 | Security | Trivy + npm audit | — |
| 5 | Deploy | Docker (staging) | 3001 |
| 6 | Release | Docker (production) | 3002 |
| 7 | Monitoring | Prometheus + /health | 9090 |

### 4. SonarQube Setup (for High/Top HD)
1. Run SonarQube locally:
   ```bash
   docker run -d --name sonarqube -p 9000:9000 sonarqube:community
   ```
2. In Jenkins: **Manage Jenkins → Configure System → SonarQube servers**
   - Name: `SonarQube`
   - URL: `http://localhost:9000`
3. In the Jenkinsfile, uncomment the `withSonarQubeEnv` block in Stage 3.

### 5. Trivy Setup (for Security stage)
```bash
# macOS
brew install aquasecurity/trivy/trivy

# Linux
sudo apt-get install trivy
```

## Security Findings (Example Report)

If Trivy finds vulnerabilities, document them like this:

| CVE | Severity | Package | Description | Action |
|-----|----------|---------|-------------|--------|
| CVE-XXXX-XXXX | HIGH | some-lib | Description | Updated to v2.x |

## Monitoring

- **Health endpoint**: `GET /health` → `{ "status": "UP", "timestamp": "..." }`
- **Prometheus**: `http://localhost:9090` — scrapes `/health` every 15s
- **Alert condition**: If status ≠ UP, the Monitoring stage fails and Jenkins marks the build failed

## Environment URLs

| Environment | URL |
|-------------|-----|
| Staging | http://localhost:3001 |
| Production | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
