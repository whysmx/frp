#!/bin/bash

echo "准备推送 frp v0.27.1 到 GitHub..."

# 检查是否已经添加了远程仓库
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "添加远程仓库..."
    git remote add origin https://github.com/whysmx/frp.git
else
    echo "远程仓库已存在"
fi

# 推送到 GitHub
echo "推送代码到 GitHub..."
git push -u origin master

if [ $? -eq 0 ]; then
    echo "✅ 成功推送到 GitHub!"
    echo "🔗 仓库地址: https://github.com/whysmx/frp"
else
    echo "❌ 推送失败，请检查："
    echo "1. GitHub 仓库是否已创建"
    echo "2. 是否有推送权限"
    echo "3. 网络连接是否正常"
fi