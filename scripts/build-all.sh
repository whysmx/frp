#!/bin/bash

# 跨平台打包脚本
# 用途：为多个操作系统构建frp程序

set -e  # 遇到错误立即退出

echo "🌍 开始跨平台构建..."

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

# 支持的平台列表
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
    "windows/arm64"
)

# 清理旧的构建产物
echo "🧹 清理旧的构建产物..."
rm -rf bin/* dist/

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

# 创建发布目录
mkdir -p dist

# 获取版本信息
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
echo "🏷️  版本: $VERSION"

# 编译各平台
for platform in "${PLATFORMS[@]}"; do
    platform_split=(${platform//\// })
    GOOS=${platform_split[0]}
    GOARCH=${platform_split[1]}
    
    echo "🔨 构建 $GOOS/$GOARCH..."
    
    # 设置输出文件名
    output_name="frp-${VERSION}-${GOOS}-${GOARCH}"
    if [ $GOOS = "windows" ]; then
        frps_name="frps.exe"
        frpc_name="frpc.exe"
    else
        frps_name="frps"
        frpc_name="frpc"
    fi
    
    # 构建目录
    build_dir="dist/$output_name"
    mkdir -p "$build_dir"
    
    # 编译frps
    echo "  📡 构建frps ($GOOS/$GOARCH)..."
    env GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w -X main.version=$VERSION" -o "$build_dir/$frps_name" ./cmd/frps
    
    # 编译frpc  
    echo "  💻 构建frpc ($GOOS/$GOARCH)..."
    env GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w -X main.version=$VERSION" -o "$build_dir/$frpc_name" ./cmd/frpc
    
    # 复制配置文件
    cp conf/frps_full.ini "$build_dir/frps.ini"
    cp conf/frpc_full.ini "$build_dir/frpc.ini"
    cp README.md "$build_dir/"
    
    # 创建启动脚本
    if [ $GOOS = "windows" ]; then
        cat > "$build_dir/start-frps.bat" << 'EOF'
@echo off
echo Starting FRP Server...
frps.exe -c frps.ini
pause
EOF
        cat > "$build_dir/start-frpc.bat" << 'EOF'
@echo off
echo Starting FRP Client...
frpc.exe -c frpc.ini
pause
EOF
    else
        cat > "$build_dir/start-frps.sh" << 'EOF'
#!/bin/bash
echo "Starting FRP Server..."
./frps -c frps.ini
EOF
        cat > "$build_dir/start-frpc.sh" << 'EOF'
#!/bin/bash
echo "Starting FRP Client..."
./frpc -c frpc.ini
EOF
        chmod +x "$build_dir/start-frps.sh"
        chmod +x "$build_dir/start-frpc.sh"
    fi
    
    # 打包
    cd dist
    if [ $GOOS = "windows" ]; then
        zip -r "${output_name}.zip" "$output_name"
    else
        tar -czf "${output_name}.tar.gz" "$output_name"
    fi
    cd "$PROJECT_ROOT"
    
    echo "  ✅ $GOOS/$GOARCH 构建完成"
done

# 显示构建结果
echo ""
echo "🎉 所有平台构建完成！"
echo "📊 构建统计："
ls -lh dist/
echo ""
echo "📋 发布文件说明："
echo "  🐧 Linux: *.tar.gz"
echo "  🍎 macOS: *.tar.gz" 
echo "  🪟 Windows: *.zip"
echo ""
echo "📖 每个包包含："
echo "  • frps/frps.exe - 服务端程序"
echo "  • frpc/frpc.exe - 客户端程序"
echo "  • frps.ini - 服务端配置模板"
echo "  • frpc.ini - 客户端配置模板"
echo "  • 启动脚本 - 快速启动"
echo "  • README.md - 使用说明"