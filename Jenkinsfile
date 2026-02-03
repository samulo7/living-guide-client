pipeline {
    agent any
    
    environment {
        IMAGE_NAME = 'living-guide'
        CONTAINER_NAME = 'living-guide'
        HOST_PORT = '8888'
    }
    
    stages {
        stage('1. 拉取代码') {
            steps {
                echo '正在拉取最新代码...'
                checkout([
                    $class: 'GitSCM', 
                    branches: [[name: '*/main']], 
                    userRemoteConfigs: [[
                        url: 'git@github.com:samulo7/living-guide-client.git',
                        credentialsId: 'github-key'
                    ]],
                    extensions: [
                        [$class: 'CloneOption', timeout: 30]
                    ]
                ])
            }
        }
        
        stage('2. 构建 Docker 镜像') {
            steps {
                echo '正在构建 Docker 镜像...'
                sh '''
                    docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                    docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest
                    echo "镜像构建完成："
                    docker images | grep ${IMAGE_NAME}
                '''
            }
        }
        
        stage('3. 停止旧容器') {
            steps {
                echo '正在停止旧容器...'
                sh '''
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                '''
            }
        }
        
        stage('4. 启动新容器') {
            steps {
                echo '正在启动新容器...'
                sh '''
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${HOST_PORT}:80 \
                        --restart unless-stopped \
                        ${IMAGE_NAME}:latest
                    
                    echo "容器启动成功："
                    docker ps | grep ${CONTAINER_NAME}
                '''
            }
        }
        
        stage('5. 健康检查') {
            steps {
                echo '正在进行健康检查...'
                sh '''
                    sleep 3
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${HOST_PORT})
                    if [ "$HTTP_CODE" = "200" ]; then
                        echo "✅ 健康检查通过！HTTP 状态码: $HTTP_CODE"
                    else
                        echo "❌ 健康检查失败！HTTP 状态码: $HTTP_CODE"
                        docker logs ${CONTAINER_NAME}
                        exit 1
                    fi
                '''
            }
        }
        
        stage('6. 清理旧镜像') {
            steps {
                echo '正在清理旧镜像...'
                sh '''
                    # 只保留最新的2个版本
                    docker images ${IMAGE_NAME} --format "{{.ID}} {{.Tag}}" | \
                        grep -v latest | \
                        tail -n +3 | \
                        awk '{print $1}' | \
                        xargs -r docker rmi || true
                '''
            }
        }
    }
    
    post {
        always {
            script {
                if (env.IMAGE_NAME) {
                    echo "构建编号: ${BUILD_NUMBER}"
                    echo "镜像标签: ${IMAGE_NAME}:${BUILD_NUMBER}"
                }
            }
        }
        failure {
            script {
                echo '❌ 部署失败。'
                try {
                    sh 'docker logs ${CONTAINER_NAME} || true'
                } catch (Exception e) {
                    echo "无法获取容器日志（可能尚未创建容器）"
                }
            }
        }
    } // 关闭 post
} // 关闭 pipeline <--- 刚才就是少了这一个！