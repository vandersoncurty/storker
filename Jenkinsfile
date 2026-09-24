// Pipeline Jenkins para Storker (arsenal-3d-store)
// Backend: pytest | Frontend: oxlint + vite build | Docker: build imagens
//
// Pré-requisitos no Jenkins:
//   - Plugins: Pipeline, Git, JUnit, NodeJS
//   - Agent com python3 (3.12+) no PATH — o backend é criado em venv
//   - Docker CLI disponível no agent (estágio de build de imagens)

pipeline {
    agent any

    tools {
        // Nomes devem bater com as instalações configuradas em Global Tool Configuration
        // Python: usar o python3 do próprio agente (plugin Python está depreciado)
        nodejs 'Node 20'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        PYTHONUNBUFFERED = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: dependências') {
            steps {
                dir('backend') {
                    sh '''
                        python3 --version
                        python3 -m venv .venv-ci
                        .venv-ci/bin/pip install --upgrade pip
                        .venv-ci/bin/pip install -r requirements.txt
                    '''
                }
            }
        }

        stage('Backend: testes') {
            steps {
                sh 'mkdir -p reports'
                dir('backend') {
                    sh '''
                        .venv-ci/bin/python -m pytest tests/ -v \
                            --junitxml=../reports/backend-junit.xml
                    '''
                }
            }
            post {
                always {
                    junit testResults: 'reports/backend-junit.xml', allowEmptyResults: true
                }
            }
        }

        stage('Frontend: dependências') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend: lint') {
            steps {
                dir('frontend') {
                    // 1ª execução: saída legível no console + captura o exit code
                    // 2ª execução: gera relatório JUnit para o Jenkins
                    sh '''
                        set +e
                        npx oxlint
                        LINT_STATUS=$?
                        npx oxlint --format=junit > ../reports/frontend-lint.xml
                        exit $LINT_STATUS
                    '''
                }
            }
            post {
                always {
                    junit testResults: 'reports/frontend-lint.xml', allowEmptyResults: true
                }
            }
        }

        stage('Frontend: build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
                archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
            }
        }

        stage('Docker: build imagens') {
            steps {
                sh '''
                    docker build -t storker-backend:${BUILD_NUMBER} backend/
                    docker build -t storker-frontend:${BUILD_NUMBER} frontend/
                    docker tag storker-backend:${BUILD_NUMBER} storker-backend:latest
                    docker tag storker-frontend:${BUILD_NUMBER} storker-frontend:latest
                '''
            }
        }
    }

    post {
        success {
            echo "Build #${env.BUILD_NUMBER} concluído com sucesso."
            // Para publicar em um registry, descomente e ajuste:
            // sh 'docker push storker-backend:${BUILD_NUMBER} && docker push storker-frontend:${BUILD_NUMBER}'
        }
        failure {
            echo "Build #${env.BUILD_NUMBER} falhou. Verifique os estágios acima."
            // Exemplos de notificação:
            // slackSend(color: 'danger', message: "Storker build #${env.BUILD_NUMBER} falhou")
            // emailext(subject: "Storker build #${env.BUILD_NUMBER} falhou", to: 'dev@empresa.com')
        }
        cleanup {
            // Requer plugin Workspace Cleanup; remova se não estiver instalado
            cleanWs()
        }
    }
}
