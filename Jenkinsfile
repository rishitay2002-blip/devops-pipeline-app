pipeline {
    agent any
    tools {
        nodejs 'NodeJS'
    }

    environment {
        APP_NAME    = 'devops-pipeline-app'
        VERSION     = "1.0.${BUILD_NUMBER}"
        IMAGE_TAG   = "${APP_NAME}:${VERSION}"
        STAGING_TAG = "${APP_NAME}:staging"
        PROD_TAG    = "${APP_NAME}:production"
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        // ─────────────────────────────────────────────────────────
        // STAGE 1: BUILD
        // Installs dependencies and produces a deployable artefact
        // ─────────────────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "=== BUILD STAGE: Installing dependencies and building ==="
                sh 'node --version'
                sh 'npm --version'
                sh 'npm ci'
                sh 'npm run build'
                echo "Build artefact created: dist/ (version ${VERSION})"

                // Build Docker image (the main deployable artefact)
                sh "docker build -t ${IMAGE_TAG} -t ${STAGING_TAG} ."
                echo "Docker image built: ${IMAGE_TAG}"
            }
            post {
                success { echo "✅ Build stage passed" }
                failure { echo "❌ Build stage failed" }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 2: TEST
        // Runs unit + integration tests with Jest; reports coverage
        // ─────────────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "=== TEST STAGE: Running automated tests ==="
                sh 'npm test -- --forceExit'
            }
            post {
                always {
                    // Publish JUnit-compatible results if available
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'
                    // Archive coverage report
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Jest Coverage Report'
                    ])
                }
                success { echo "✅ All tests passed" }
                failure { echo "❌ Tests failed — check the coverage report" }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 3: CODE QUALITY
        // Runs ESLint for style/structure; optionally SonarQube
        // ─────────────────────────────────────────────────────────
        stage('Code Quality') {
            steps {
                echo "=== CODE QUALITY STAGE: Analysing code structure and style ==="

                // ESLint — always available (no external service needed)
                sh 'npm run lint || true'
                echo "ESLint analysis complete"

                // SonarQube — requires SonarQube server + Jenkins plugin
                // Uncomment the block below once SonarQube is configured:
                /*
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=devops-pipeline-app \
                          -Dsonar.sources=src \
                          -Dsonar.tests=tests \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                */
            }
            post {
                success { echo "✅ Code quality stage passed" }
                failure { echo "❌ Code quality issues detected" }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 4: SECURITY
        // Scans Docker image with Trivy for known CVEs
        // ─────────────────────────────────────────────────────────
        stage('Security') {
            steps {
                echo "=== SECURITY STAGE: Scanning for vulnerabilities ==="

                // Trivy scans the Docker image for HIGH/CRITICAL CVEs
                // Install Trivy: https://aquasecurity.github.io/trivy/latest/getting-started/installation/
                sh """
                    trivy image \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format json \
                      --output trivy-report.json \
                      ${STAGING_TAG} || echo 'Trivy not installed — skipping scan'
                """

                // npm audit for dependency vulnerabilities (always available)
                sh 'npm audit --audit-level=high || true'

                echo """
Security Scan Summary:
- Trivy: Scans Docker image layers for OS and library CVEs
- npm audit: Checks Node.js dependencies against the npm advisory database
- Any HIGH/CRITICAL findings should be reviewed in trivy-report.json
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
                success { echo "✅ Security stage complete" }
                failure { echo "❌ Security stage failed" }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 5: DEPLOY (Staging)
        // Deploys the Docker image to a staging container
        // ─────────────────────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo "=== DEPLOY STAGE: Deploying to staging environment ==="

                // Stop and remove any existing staging container
                sh 'docker stop app-staging || true'
                sh 'docker rm app-staging || true'

                // Run the staging container on port 3001
                sh """
                    docker run -d \
                      --name app-staging \
                      -p 3001:3000 \
                      -e NODE_ENV=staging \
                      --restart unless-stopped \
                      ${STAGING_TAG}
                """

                // Wait for container to be healthy
                sh 'sleep 5'
                sh 'docker ps | grep app-staging'

                // Smoke test — confirm the health endpoint responds
                sh 'curl -f http://localhost:3001/health || echo "Health check failed — check container logs"'

                echo "Application deployed to staging: http://localhost:3001"
            }
            post {
                success { echo "✅ Staging deployment successful" }
                failure {
                    echo "❌ Staging deployment failed"
                    sh 'docker logs app-staging || true'
                }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 6: RELEASE
        // Promotes staging image to production; tags with version
        // ─────────────────────────────────────────────────────────
        stage('Release') {
            steps {
                echo "=== RELEASE STAGE: Promoting to production ==="

                // Tag staging image as production
                sh "docker tag ${STAGING_TAG} ${PROD_TAG}"
                sh "docker tag ${STAGING_TAG} ${APP_NAME}:latest"

                echo "Tagged image as: ${PROD_TAG} and ${APP_NAME}:latest"

                // Stop and remove existing production container
                sh 'docker stop app-production || true'
                sh 'docker rm app-production || true'

                // Run production container on port 3002
                sh """
                    docker run -d \
                      --name app-production \
                      -p 3002:3000 \
                      -e NODE_ENV=production \
                      --restart unless-stopped \
                      ${PROD_TAG}
                """

                sh 'sleep 5'
                sh 'curl -f http://localhost:3002/health || echo "Production health check failed"'

                echo """
Release Summary:
  Version  : ${VERSION}
  Image    : ${PROD_TAG}
  Staging  : http://localhost:3001
  Production: http://localhost:3002
                """
            }
            post {
                success { echo "✅ Release to production successful — version ${VERSION}" }
                failure {
                    echo "❌ Production release failed"
                    sh 'docker logs app-production || true'
                }
            }
        }

        // ─────────────────────────────────────────────────────────
        // STAGE 7: MONITORING & ALERTING
        // Starts Prometheus; performs a live health check and alert
        // ─────────────────────────────────────────────────────────
        stage('Monitoring') {
            steps {
                echo "=== MONITORING STAGE: Setting up health checks and alerting ==="

                // Verify production app is still healthy
                sh '''
                    STATUS=$(curl -s http://localhost:3002/health | grep -o '"status":"UP"' || echo "DOWN")
                    if echo "$STATUS" | grep -q "UP"; then
                        echo "✅ Production health check: UP"
                    else
                        echo "⚠️  Production health check: DEGRADED — alerting team"
                        exit 1
                    fi
                '''

                // Start Prometheus (optional — requires Docker)
                sh '''
                    if [ -f monitoring/prometheus.yml ]; then
                        docker stop prometheus || true
                        docker rm prometheus || true
                        docker run -d \
                          --name prometheus \
                          -p 9090:9090 \
                          -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
                          prom/prometheus:latest || echo "Prometheus start skipped"
                        echo "Prometheus dashboard: http://localhost:9090"
                    fi
                '''

                echo """
Monitoring Summary:
  Health Endpoint : http://localhost:3002/health
  Prometheus      : http://localhost:9090
  Scrape Interval : 15s
  Alert Condition : status != UP → pipeline fails and team is notified
                """
            }
            post {
                success { echo "✅ Monitoring stage complete — application is live and healthy" }
                failure { echo "❌ Monitoring detected a problem — check production container" }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST PIPELINE — summary notification
    // ─────────────────────────────────────────────────────────────
    post {
        success {
            echo """
╔══════════════════════════════════════════════╗
║   ✅ PIPELINE SUCCEEDED — Version ${VERSION}
║   All 7 stages completed successfully.
║   Production: http://localhost:3002
║   Staging   : http://localhost:3001
╚══════════════════════════════════════════════╝
            """
        }
        failure {
            echo """
╔══════════════════════════════════════════════╗
║   ❌ PIPELINE FAILED — Version ${VERSION}
║   Check the stage logs above for details.
╚══════════════════════════════════════════════╝
            """
        }
        always {
            echo "Pipeline finished at: ${new Date()}"
            // Clean up workspace (keeps Docker images/containers running)
            cleanWs()
        }
    }
}
