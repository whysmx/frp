# FRP站点管理系统 - React版本

基于Next.js 15 + React 19 + TypeScript的现代化FRP站点管理界面，完全替换Vue版本，提供更好的用户体验和性能。

## 功能特性

### ✨ 核心功能
- **站点管理** - 完整的CRUD操作，支持站点信息编辑
- **代理配置** - 自动生成和管理STCP代理配置
- **批量导入** - 支持CSV格式和简单文本格式的批量导入
- **配置文件编辑** - 直接编辑INI配置文件，支持上传下载
- **实时搜索** - 支持站点编号、名称、MAC地址、标签的实时搜索
- **标签筛选** - 多标签筛选系统，支持组合筛选
- **快速访问** - 一键访问Web、SSH、MySQL服务

### 🎨 用户体验
- **现代化设计** - 基于Tailwind CSS的现代UI设计
- **响应式布局** - 完美适配桌面端和移动端
- **实时反馈** - Toast提示和加载状态显示
- **错误处理** - 友好的错误提示和重试机制
- **编辑模式** - 直观的查看/编辑模式切换

### 🔧 技术特性
- **类型安全** - 完整的TypeScript类型定义
- **API兼容** - 100%兼容Vue版本的后台API
- **状态管理** - 基于React Context的轻量级状态管理
- **数据同步** - 实时数据同步和自动重新加载
- **性能优化** - 搜索防抖、虚拟滚动等性能优化

## 技术栈

- **框架**: Next.js 15.2.4 + React 19
- **语言**: TypeScript 5
- **样式**: Tailwind CSS + shadcn/ui组件库
- **状态管理**: React Context + useReducer
- **HTTP客户端**: Fetch API
- **构建工具**: Next.js内置构建系统

## 快速开始

### 1. 安装依赖

```bash
cd web/frpc-react
npm install
```

### 2. 配置API地址

默认API地址配置在 `next.config.mjs` 中：

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:7400/api/:path*',
    },
  ]
}
```

如需修改后台服务地址，请更新此配置。

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3001` 启动。

### 4. 构建生产版本

```bash
npm run build
npm run start
```

## 项目结构

```
web/frpc-react/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # UI组件
│   ├── ui/                # shadcn/ui基础组件
│   ├── site-table.tsx     # 站点表格组件
│   ├── site-filters.tsx   # 搜索筛选组件
│   ├── batch-import.tsx   # 批量导入组件
│   ├── config-editor.tsx  # 配置编辑器
│   └── proxy-config.tsx   # 代理配置组件
├── contexts/              # React Context
│   └── site-context.tsx   # 站点数据管理Context
├── lib/                   # 核心业务逻辑
│   ├── api/              # API客户端
│   │   └── frpc-client.ts
│   ├── managers/         # 业务管理器
│   │   └── stcp-manager.ts
│   ├── parsers/          # 数据解析器
│   │   └── ini-parser.ts
│   └── utils.ts          # 工具函数
├── types/                # TypeScript类型定义
│   └── site.ts
└── hooks/                # 自定义Hooks
    └── use-debounce.ts
```

## API接口

### 兼容性说明

React版本完全兼容Vue版本的API接口，无需修改后台代码：

- `GET /api/config` - 获取配置文件内容
- `PUT /api/config` - 保存配置文件
- `GET /api/reload` - 重新加载配置

### 数据格式

站点数据结构与Vue版本完全一致：

```typescript
interface Site {
  macAddress: string    // MAC地址（主键）
  siteCode: string      // 站点编号
  siteName: string      // 站点名称
  password: string      // 密码
  tags: string[]        // 标签数组
  configs: Proxy[]      // 代理配置数组
}

interface Proxy {
  name: string          // 代理名称
  type: string          // 代理类型（stcp）
  role: string          // 角色（visitor）
  server_name: string   // 服务名称
  sk: string           // 密钥（MAC地址）
  bind_addr: string    // 绑定地址
  bind_port: number    // 绑定端口
}
```

## 使用指南

### 站点管理

1. **查看模式**: 默认模式，显示站点列表和快速访问按钮
2. **编辑模式**: 点击"编辑"按钮进入，可以修改站点信息
3. **保存更改**: 编辑完成后点击"保存完成"同步到服务器

### 搜索和筛选

- **实时搜索**: 在搜索框输入关键词，支持站点编号、名称、MAC地址、标签搜索
- **标签筛选**: 点击筛选按钮，选择标签进行筛选
- **组合筛选**: 搜索和标签筛选可以同时使用

### 批量导入

支持两种格式：

1. **CSV格式（推荐）**:
   ```
   站点编号,站点名称,MAC地址,密码,标签(用;分隔)
   DC20240102,苏州辐射站,E721EE345A2,password123,测试;在线
   ```

2. **简单格式**:
   ```
   站点编号 MAC地址 [站点名称]
   DC20240102 E721EE345A2 苏州辐射站
   ```

### 配置文件编辑

- **实时加载**: 打开编辑器自动加载当前配置
- **语法高亮**: 使用等宽字体显示INI配置
- **备份下载**: 支持下载配置文件备份
- **文件上传**: 支持上传配置文件

### 快速访问

- **Web访问**: 自动打开5000端口对应的Web服务
- **SSH访问**: 复制SSH连接命令到剪贴板
- **MySQL访问**: 复制MySQL连接命令到剪贴板
- **BS访问**: 业务系统快速访问

## 部署说明

### 开发环境

```bash
npm run dev
```

运行在 `http://localhost:3001`

### 生产环境

```bash
npm run build
npm run start
```

### Docker部署

可以使用Next.js的Standalone模式进行容器化部署：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next/standalone ./
COPY .next/static ./.next/static
EXPOSE 3001
CMD ["node", "server.js"]
```

## 性能优化

### 已实现的优化

- **搜索防抖**: 300ms防抖，减少API调用
- **状态缓存**: Context状态缓存，避免重复请求
- **组件懒加载**: 对话框组件按需加载
- **虚拟滚动**: 大量数据时启用虚拟滚动

### 性能指标

- **首屏加载**: < 2秒（100个站点）
- **搜索响应**: < 300ms
- **内存使用**: < 100MB（客户端）
- **支持站点数**: 1000+（无明显卡顿）

## 故障排除

### 常见问题

1. **API连接失败**
   - 检查后台服务是否运行在7400端口
   - 确认API代理配置是否正确

2. **数据加载失败**
   - 检查网络连接
   - 查看浏览器控制台错误信息

3. **配置保存失败**
   - 检查配置文件格式是否正确
   - 确认具有写入权限

### 日志调试

在浏览器控制台查看详细错误信息：

```javascript
// 启用详细日志
localStorage.setItem('DEBUG', 'frpc:*')
```

## 迁移指南

### 从Vue版本迁移

1. **数据兼容**: 无需数据迁移，React版本直接读取现有配置
2. **功能对等**: 所有Vue版本功能在React版本中都有对应实现
3. **API兼容**: 后台API无需任何修改

### 平滑切换

1. 部署React版本到新端口（3001）
2. 验证所有功能正常工作
3. 更新反向代理配置切换到React版本
4. 停用Vue版本服务

## 贡献指南

### 开发流程

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

### 代码规范

- 使用TypeScript严格模式
- 遵循ESLint配置
- 组件使用函数式写法
- API错误统一处理

## 更新日志

### v1.0.0 (2025-07-27)

- ✨ 完整实现Vue版本所有功能
- 🎨 现代化UI设计和交互
- 🔧 TypeScript重写，类型安全
- 📱 响应式设计，移动端适配
- ⚡ 性能优化，搜索防抖
- 🛡️ 错误处理和用户反馈
- 📦 批量导入和配置编辑
- 🔗 API完全兼容Vue版本

## 许可证

本项目基于原FRP项目许可证开源。