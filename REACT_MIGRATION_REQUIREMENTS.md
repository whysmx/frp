# FRP站点远程管理系统 - React版本实现需求文档

## 1. 项目概述

### 1.1 背景
基于现有的Vue 2.x版本的FRP站点远程管理系统，参考已有的React设计稿，完全重新实现一个现代化的React版本管理界面。

### 1.2 技术栈对比

**现有Vue版本：**
- Vue 2.5.22 + Element UI 2.5.3
- Webpack 2.7.0 构建
- 传统的Vue Router + Vuex模式

**目标React版本：**
- Next.js 15.2.4 + React 19
- TypeScript + Tailwind CSS + shadcn/ui组件库
- 现代化响应式设计

### 1.3 核心目标
1. **UI完全重新设计** - 基于设计稿实现现代化界面
2. **保持API兼容** - 不修改后台接口，完全复用现有API
3. **功能对等** - 实现Vue版本的所有核心功能
4. **体验提升** - 更好的交互和视觉效果

## 2. 功能需求分析

### 2.1 Vue版本现有功能梳理

#### 2.1.1 核心业务功能
- **站点管理** - 增删改查STCP代理站点
- **批量导入** - 支持批量导入站点配置
- **配置文件编辑** - 直接编辑INI配置文件
- **代理配置管理** - 管理每个站点的代理设置
- **标签系统** - 站点标签分类和筛选
- **快速访问** - Web/SSH/MySQL/BS四种访问方式

#### 2.1.2 数据模型
```javascript
// Vue版本数据结构
Site: {
  macAddress: string,    // MAC地址作为唯一标识
  siteName: string,      // 站点名称  
  siteId: string,        // 站点编号
  password: string,      // 站点密码
  tags: string[],        // 标签数组
  proxies: Proxy[]       // 代理配置数组
}

Proxy: {
  name: string,          // 代理名称格式: R-{MAC}-{PORT}
  type: 'stcp',          // 代理类型
  role: 'visitor',       // 角色
  service: string,       // 服务名
  sk: string,            // 密钥(MAC地址)
  bindAddr: string,      // 绑定地址
  bindPort: number       // 绑定端口
}
```

#### 2.1.3 API接口梳理
- `GET /api/config` - 获取配置文件内容
- `PUT /api/config` - 保存配置文件
- `GET /api/reload` - 重新加载配置
- 基于INI文件格式的配置管理

### 2.2 React版本需要实现的功能

#### 2.2.1 数据模型统一
**解决方案：** 直接修改React版本的数据模型，与Vue版本完全一致，避免适配器复杂性

```typescript
// 统一后的数据模型
Site: {
  macAddress: string,   // MAC地址 - 主键，与Vue版本一致
  siteCode: string,     // 站点编号，与Vue版本一致
  siteName: string,     // 站点名称，与Vue版本一致
  password: string,     // 密码
  tags: string[],       // 标签
  configs: Proxy[]      // 代理配置数组，与Vue版本字段名一致
}

Proxy: {
  name: string,         // 代理名称
  type: "stcp",         // 代理类型
  role: "visitor",      // 代理角色
  server_name: string,  // 服务名称，与Vue版本一致
  sk: string,           // 密钥
  bind_addr: string,    // 绑定地址，与Vue版本一致
  bind_port: number     // 绑定端口，与Vue版本一致
}
```

**优势：** 无需数据转换，直接与Vue版本API兼容

#### 2.2.2 缺失功能补充
React设计稿存在以下功能缺失，需要补充：

1. **STCPManager类** - Vue版本的核心业务逻辑类
2. **INI配置文件解析** - 配置文件的读取和写入逻辑
3. **端口分配管理** - 自动分配绑定端口的逻辑
4. **真实API对接** - 当前使用mock数据，需要对接真实API

#### 2.2.3 UI组件增强
基于设计稿，增强以下交互：

1. **编辑模式切换** - 更直观的编辑/查看模式
2. **实时搜索** - 带防抖的搜索功能
3. **标签管理** - 多标签筛选面板
4. **批量操作** - 批量导入和配置管理
5. **响应式设计** - 适配移动端和桌面端

## 3. 技术实现方案

### 3.1 项目结构设计

```
web/frpc-react/
├── app/
│   ├── globals.css              # 全局样式
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页面
├── components/
│   ├── ui/                      # shadcn/ui组件库
│   ├── site-table.tsx           # 站点表格组件
│   ├── site-filters.tsx         # 筛选组件
│   ├── proxy-config.tsx         # 代理配置组件
│   ├── batch-import.tsx         # 批量导入组件
│   └── config-editor.tsx        # 配置编辑器
├── lib/
│   ├── utils.ts                 # 工具函数
│   ├── api.ts                   # API封装
│   ├── stcp-manager.ts          # STCP管理器
│   └── ini-parser.ts            # INI解析器
├── types/
│   └── site.ts                  # 类型定义
└── hooks/
    ├── use-sites.ts             # 站点数据管理
    └── use-debounce.ts          # 防抖钩子
```

### 3.2 数据管理策略

#### 3.2.1 状态管理
使用React内置的Context API + useReducer，避免引入额外状态管理库：

```typescript
// SiteContext.tsx
interface SiteState {
  sites: Site[]
  loading: boolean
  editMode: boolean
  searchTerm: string
  selectedTags: string[]
}

const SiteContext = createContext<{
  state: SiteState
  dispatch: Dispatch<SiteAction>
}>()
```

#### 3.2.2 数据处理
由于数据模型已统一，无需适配器层，直接使用Vue版本的数据结构：

```typescript
// lib/api.ts - 直接处理Vue格式数据
export class FrpcApiClient {
  async getSites(): Promise<Site[]> {
    const response = await fetch('/api/config')
    const configText = await response.text()
    return INIParser.parseToSites(configText)
  }

  async saveSites(sites: Site[]): Promise<void> {
    const iniContent = INIParser.sitesToINI(sites)
    await fetch('/api/config', {
      method: 'PUT',
      body: iniContent
    })
    await fetch('/api/reload')
  }
}
```

### 3.3 核心功能实现

#### 3.3.1 STCPManager重写
将Vue版本的STCPManager转换为TypeScript类：

```typescript
// lib/stcp-manager.ts
export class STCPManager {
  private sites: Site[] = []
  private config: string = ''

  async loadConfig(): Promise<void> {
    const response = await fetch('/api/config')
    this.config = await response.text()
    this.sites = this.parseINIToSites(this.config)
  }

  async saveConfig(): Promise<void> {
    const iniContent = this.sitesToINI(this.sites)
    await fetch('/api/config', {
      method: 'PUT',
      body: iniContent
    })
    await fetch('/api/reload')
  }

  // ... 其他方法
}
```

#### 3.3.2 INI配置解析
重写INI解析逻辑：

```typescript
// lib/ini-parser.ts
export class INIParser {
  static parse(content: string): Site[] {
    // 解析INI内容为Site数组
  }

  static stringify(sites: Site[]): string {
    // 将Site数组转换为INI格式
  }
}
```

### 3.4 UI交互设计

#### 3.4.1 编辑模式
- **查看模式：** 只读显示，突出操作按钮(访问、SSH、MySQL、BS)
- **编辑模式：** 内联编辑，显示代理配置、批量导入、配置文件按钮

#### 3.4.2 搜索和筛选
- **实时搜索：** 300ms防抖，支持ID、名称、标签搜索
- **标签筛选：** 可展开的标签选择面板，支持多选，通过"标签"按钮触发

#### 3.4.3 响应式设计
- **桌面端：** 完整表格布局
- **移动端：** 卡片式布局，隐藏部分列

## 4. 实施计划

### 4.1 阶段一：基础框架搭建 (3天)
1. 项目初始化和依赖安装
2. 基础组件和类型定义
3. API封装和数据适配器

### 4.2 阶段二：核心功能实现 (5天)
1. STCPManager类重写
2. INI解析器实现
3. 站点CRUD操作
4. 代理配置管理

### 4.3 阶段三：UI交互优化 (3天)
1. 搜索和筛选功能
2. 批量导入功能
3. 配置文件编辑器
4. 响应式设计调优

### 4.4 阶段四：测试和上线 (2天)
1. 功能测试和API对接验证
2. 性能优化
3. 部署配置

## 5. 风险评估

### 5.1 技术风险
- **API兼容性：** Vue版本API可能存在未文档化的行为
- **数据一致性：** 数据模型转换可能导致信息丢失
- **INI解析：** 复杂的配置文件格式解析容易出错

### 5.2 业务风险
- **功能遗漏：** 可能遗漏Vue版本的某些隐藏功能
- **用户体验：** 界面变化可能导致用户操作习惯不适应

### 5.3 缓解措施
1. **保留Vue版本：** 作为备选方案，随时可以回退
2. **分阶段上线：** 先在测试环境验证所有功能
3. **详细测试：** 与Vue版本进行功能对比测试

## 6. 验收标准

### 6.1 功能验收
- [ ] 所有Vue版本功能在React版本中正常工作
- [ ] API调用与Vue版本完全一致
- [ ] 数据格式转换无丢失

### 6.2 性能验收
- [ ] 首次加载时间 < 2秒
- [ ] 搜索响应时间 < 300ms
- [ ] 支持100+站点数据无卡顿

### 6.3 兼容性验收
- [ ] 支持Chrome、Firefox、Safari最新版本
- [ ] 移动端适配(iOS Safari、Android Chrome)
- [ ] 支持1920x1080以下分辨率

## 7. 后续优化方向

1. **实时数据同步：** WebSocket支持配置实时更新
2. **操作历史：** 配置变更记录和回滚功能
3. **权限管理：** 多用户权限控制
4. **监控面板：** 站点状态监控和告警

---

**文档版本：** v1.0  
**创建时间：** 2025-07-27  
**更新时间：** 2025-07-27