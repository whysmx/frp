#!/bin/bash

# Windows 64位打包脚本
# 用途：构建包含前端界面的Windows可执行文件

set -e  # 遇到错误立即退出

echo "🚀 开始构建Windows 64位程序..."

# 检查必要工具
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装，请先安装"
        exit 1
    fi
}

echo "📋 检查构建环境..."
check_tool go
check_tool npm

# 项目根目录
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_ROOT"

echo "📂 当前目录: $PROJECT_ROOT"

# 清理旧的构建产物
echo "🧹 清理旧的构建产物..."
rm -rf bin/frps.exe bin/frpc.exe

# 构建前端资源
echo "🎨 构建React前端界面..."
cd web/frpc-react
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi
npm run build
cd "$PROJECT_ROOT"

# 嵌入静态资源到Go代码
echo "📦 嵌入前端资源到Go代码..."
# 复制React构建产物到静态资源目录
cp -rf ./web/frpc-react/dist/* ./assets/frpc/static/
# 生成statik代码
go generate ./assets/...

# 构建Windows 64位可执行文件
echo "🔨 编译Windows 64位可执行文件..."
echo "  构建frps服务端..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/frps.exe ./cmd/frps

echo "  构建frpc客户端..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/frpc.exe ./cmd/frpc

# 检查构建结果
echo "✅ 检查构建结果..."
if [ -f "bin/frps.exe" ] && [ -f "bin/frpc.exe" ]; then
    echo "📊 构建统计:"
    ls -lh bin/*.exe
    file bin/*.exe
    echo ""
    echo "🎉 构建完成！Windows可执行文件已生成："
    echo "   🖥️  服务端: bin/frps.exe"
    echo "   💻 客户端: bin/frpc.exe"
    echo ""
    echo "📋 使用说明："
    echo "   1. 将exe文件复制到Windows系统"
    echo "   2. 准备配置文件 (参考conf/目录下的模板)"
    echo "   3. 运行程序即可访问Web界面"
else
    echo "❌ 构建失败！请检查错误信息"
    exit 1
fi