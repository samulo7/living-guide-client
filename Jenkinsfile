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
        
        stage('2. 检查项目文件') {
            steps {
                echo '检查项目结构...'
                sh '''
                    echo "=== 项目根目录 ==="
                    ls -la
                    echo ""
                    echo "=== Pages 目录 ==="
                    ls -la pages/ || echo "pages 目录不存在"
                    echo ""
                    echo "=== Static 目录 ==="
                    ls -la static/ || echo "static 目录不存在"
                    echo ""
                    echo "=== 配置文件 ==="
                    ls -la *.json || echo "没有 json 配置文件"
                '''
            }
        }
        
        stage('3. 构建 Docker 镜像') {
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
        
        stage('4. 停止旧容器') {
            steps {
                echo '正在停止旧容器...'
                sh '''
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                '''
            }
        }
        
        stage('5. 启动新容器') {
            steps {
                echo '正在启动新容器...'
                sh '''
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${HOST_PORT}:80 \
                        --restart unless-stopped \
                        ${IMAGE_NAME}:latest
                    
                    echo "等待容器启动..."
                    sleep 3
                    echo "容器状态："
                    docker ps | grep ${CONTAINER_NAME}
                '''
            }
        }
        
       stage('6. 健康检查') {
            steps {
                echo '正在进行健康检查...'
                sh '''
                    sleep 5
                    echo "正在检查 Nginx 服务..."
                    
                    # 1. 检查容器是否存活
                    if [ "$(docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME})" != "true" ]; then
                        echo "❌ 容器未运行"
                        exit 1
                    fi

                    # 2. 从容器内部测试 80 端口 (绕过 Jenkins 网络隔离问题)
                    if docker exec ${CONTAINER_NAME} wget --spider -q http://127.0.0.1:80; then
                         echo "✅ 健康检查通过！服务运行正常。"
                    else
                         echo "❌ Nginx 端口无响应"
                         docker logs --tail 20 ${CONTAINER_NAME}
                         exit 1
                    fi
                '''
            }
        }
        
        stage('7. 清理旧镜像') {
            steps {
                echo '正在清理旧镜像...'
                sh '''
                    # 只保留最新的3个版本
                    docker images ${IMAGE_NAME} --format "{{.ID}} {{.Tag}}" | \
                        grep -v latest | \
                        tail -n +4 | \
                        awk '{print $1}' | \
                        xargs -r docker rmi || true
                    
                    echo "清理完成，当前镜像："
                    docker images | grep ${IMAGE_NAME}
                '''
            }
        }
    }
    
    post {
        success {
            echo '========================================'
            echo '✅ 部署成功！'
            echo "访问地址: http://YOUR_SERVER_IP:${HOST_PORT}"
            echo "构建编号: ${BUILD_NUMBER}"
            echo "镜像标签: ${IMAGE_NAME}:${BUILD_NUMBER}"
            echo '========================================'
        }
        failure {
            script {
                echo '========================================'
                echo '❌ 部署失败'
                echo "构建编号: ${BUILD_NUMBER}"
                try {
                    sh '''
                        echo "=== 容器日志 ==="
                        docker logs --tail 50 ${CONTAINER_NAME} || echo "容器未创建"
                        echo ""
                        echo "=== 容器状态 ==="
                        docker ps -a | grep ${CONTAINER_NAME} || echo "容器不存在"
                    '''
                } catch (Exception e) {
                    echo "无法获取容器信息: ${e.message}"
                }
                echo '========================================'
            }
        }
        always {
            echo "Pipeline 执行完成时间: ${new Date()}"
        }
    }
}