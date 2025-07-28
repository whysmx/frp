# React版本实施计划

## 实施方案

### 方案选择
经过分析，推荐以下实施方案：

**方案：基于现有设计稿，构建完整React应用**
- 将设计稿 `/frpcsitemanagement` 作为基础
- 补充缺失的业务逻辑和API对接
- 重构代码架构，使其适合生产环境

### 关键决策点

1. **项目位置**：建议在 `web/frpc-react/` 创建新项目
2. **技术选型**：保持设计稿的Next.js技术栈
3. **API策略**：完全复用Vue版本的API，不修改后台
4. **部署方式**：独立部署，可与Vue版本并存

## 详细实施步骤

### Phase 1: 项目基础设施 (1天)

#### 1.1 项目迁移和清理
```bash
# 复制设计稿到新位置
cp -r frpcsitemanagement/ web/frpc-react/

# 清理不需要的文件
cd web/frpc-react/
rm -rf .next/ node_modules/
```

#### 1.2 项目配置优化
- [ ] 更新 `package.json` 信息
- [ ] 配置 TypeScript 严格模式
- [ ] 设置 ESLint 和 Prettier
- [ ] 配置环境变量处理

#### 1.3 构建系统配置
- [ ] 配置 Next.js 为生产模式
- [ ] 设置静态资源处理
- [ ] 配置 API 代理到后台服务

### Phase 2: 数据层实现 (2天)

#### 2.1 类型定义完善
```typescript
// types/api.ts - API响应类型
interface VueSiteConfig {
  macAddress: string
  siteName: string
  siteId: string
  // ...
}

// types/site.ts - 增强现有类型
interface Site {
  id: string
  name: string
  mac: string
  password: string
  tags: string[]
  proxies: Proxy[]
  status?: 'online' | 'offline' | 'unknown'  // 新增状态
  lastUpdate?: Date                          // 新增更新时间
}
```

#### 2.2 API客户端实现
```typescript
// lib/api-client.ts
export class FrpcApiClient {
  private baseUrl: string

  async getConfig(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/config`)
    return response.text()
  }

  async saveConfig(content: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/config`, {
      method: 'PUT',
      body: content
    })
  }

  async reloadConfig(): Promise<void> {
    await fetch(`${this.baseUrl}/api/reload`)
  }
}
```

#### 2.3 数据适配器
```typescript
// lib/adapters/site-adapter.ts
export class SiteAdapter {
  static fromVueFormat(vueData: VueSiteConfig[]): Site[] {
    return vueData.map(item => ({
      id: item.siteId,
      name: item.siteName,
      mac: item.macAddress,
      password: item.password || '',
      tags: item.tags || [],
      proxies: item.proxies || []
    }))
  }

  static toVueFormat(reactData: Site[]): VueSiteConfig[] {
    return reactData.map(site => ({
      siteId: site.id,
      siteName: site.name,
      macAddress: site.mac,
      password: site.password,
      tags: site.tags,
      proxies: site.proxies
    }))
  }
}
```

### Phase 3: 业务逻辑层 (2天)

#### 3.1 STCPManager重写
```typescript
// lib/managers/stcp-manager.ts
export class STCPManager {
  private apiClient: FrpcApiClient
  private sites: Site[] = []
  private rawConfig: string = ''

  constructor(apiClient: FrpcApiClient) {
    this.apiClient = apiClient
  }

  async loadData(): Promise<Site[]> {
    try {
      this.rawConfig = await this.apiClient.getConfig()
      const vueSites = INIParser.parseConfig(this.rawConfig)
      this.sites = SiteAdapter.fromVueFormat(vueSites)
      return this.sites
    } catch (error) {
      console.error('Failed to load sites:', error)
      throw error
    }
  }

  async saveData(): Promise<void> {
    try {
      const vueSites = SiteAdapter.toVueFormat(this.sites)
      const iniContent = INIParser.generateConfig(vueSites)
      await this.apiClient.saveConfig(iniContent)
      await this.apiClient.reloadConfig()
    } catch (error) {
      console.error('Failed to save sites:', error)
      throw error
    }
  }

  // 业务逻辑方法
  searchSites(keyword: string): Site[] {
    if (!keyword.trim()) return this.sites
    
    const term = keyword.toLowerCase()
    return this.sites.filter(site => 
      site.id.toLowerCase().includes(term) ||
      site.name.toLowerCase().includes(term) ||
      site.tags.some(tag => tag.toLowerCase().includes(term))
    )
  }

  updateSite(siteId: string, updates: Partial<Site>): void {
    const index = this.sites.findIndex(s => s.id === siteId)
    if (index !== -1) {
      this.sites[index] = { ...this.sites[index], ...updates }
    }
  }

  deleteSite(siteId: string): void {
    this.sites = this.sites.filter(s => s.id !== siteId)
  }

  addSite(site: Site): void {
    this.sites.push(site)
  }
}
```

#### 3.2 INI解析器实现
```typescript
// lib/parsers/ini-parser.ts
export class INIParser {
  static parseConfig(iniContent: string): VueSiteConfig[] {
    const sites: VueSiteConfig[] = []
    const lines = iniContent.split('\n')
    
    let currentSection: string | null = null
    let currentSite: Partial<VueSiteConfig> | null = null
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // 解析section
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        if (currentSite) {
          sites.push(currentSite as VueSiteConfig)
        }
        currentSection = trimmed.slice(1, -1)
        currentSite = this.createSiteFromSection(currentSection)
        continue
      }
      
      // 解析配置项
      if (currentSite && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=', 2)
        this.setSiteProperty(currentSite, key.trim(), value.trim())
      }
    }
    
    if (currentSite) {
      sites.push(currentSite as VueSiteConfig)
    }
    
    return sites
  }

  static generateConfig(sites: VueSiteConfig[]): string {
    let iniContent = ''
    
    // 生成服务端配置
    iniContent += '[common]\n'
    iniContent += 'bind_port = 7000\n'
    iniContent += 'token = your_token_here\n\n'
    
    // 生成站点配置
    for (const site of sites) {
      for (const proxy of site.proxies) {
        iniContent += `[${proxy.name}]\n`
        iniContent += `type = ${proxy.type}\n`
        iniContent += `role = ${proxy.role}\n`
        iniContent += `sk = ${proxy.sk}\n`
        iniContent += `server_name = ${proxy.service}\n`
        iniContent += `bind_addr = ${proxy.bindAddr}\n`
        iniContent += `bind_port = ${proxy.bindPort}\n\n`
      }
    }
    
    return iniContent
  }

  private static createSiteFromSection(section: string): Partial<VueSiteConfig> {
    // 从section名称解析站点信息
    // 例: "R-E721EE345A2-22" => mac: "E721EE345A2", port: 22
    const parts = section.split('-')
    if (parts.length >= 3) {
      return {
        macAddress: parts[1],
        proxies: []
      }
    }
    return {}
  }

  private static setSiteProperty(site: Partial<VueSiteConfig>, key: string, value: string): void {
    switch (key) {
      case 'sk':
        site.macAddress = value
        break
      case 'server_name':
        // 从server_name推断站点信息
        break
      // ... 其他属性映射
    }
  }
}
```

### Phase 4: 状态管理 (1天)

#### 4.1 Context Provider
```typescript
// contexts/site-context.tsx
interface SiteContextState {
  sites: Site[]
  filteredSites: Site[]
  loading: boolean
  editMode: boolean
  searchTerm: string
  selectedTags: string[]
  allTags: string[]
}

interface SiteContextActions {
  loadSites: () => Promise<void>
  saveSites: () => Promise<void>
  setEditMode: (mode: boolean) => void
  setSearchTerm: (term: string) => void
  setSelectedTags: (tags: string[]) => void
  updateSite: (siteId: string, updates: Partial<Site>) => void
  deleteSite: (siteId: string) => void
  addSite: (site: Site) => void
}

export const SiteContext = createContext<{
  state: SiteContextState
  actions: SiteContextActions
}>()

export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteContextState>({
    sites: [],
    filteredSites: [],
    loading: false,
    editMode: false,
    searchTerm: '',
    selectedTags: [],
    allTags: []
  })

  const stcpManager = useRef(new STCPManager(new FrpcApiClient('/api')))

  const actions: SiteContextActions = {
    async loadSites() {
      setState(prev => ({ ...prev, loading: true }))
      try {
        const sites = await stcpManager.current.loadData()
        const allTags = extractAllTags(sites)
        setState(prev => ({
          ...prev,
          sites,
          filteredSites: sites,
          allTags,
          loading: false
        }))
      } catch (error) {
        setState(prev => ({ ...prev, loading: false }))
        throw error
      }
    },

    async saveSites() {
      setState(prev => ({ ...prev, loading: true }))
      try {
        await stcpManager.current.saveData()
        setState(prev => ({ ...prev, loading: false }))
      } catch (error) {
        setState(prev => ({ ...prev, loading: false }))
        throw error
      }
    },

    // ... 其他actions实现
  }

  return (
    <SiteContext.Provider value={{ state, actions }}>
      {children}
    </SiteContext.Provider>
  )
}
```

### Phase 5: 组件功能完善 (2天)

#### 5.1 替换Mock数据
- [ ] 移除 `data/mock-sites.ts`
- [ ] 更新组件使用Context数据
- [ ] 处理加载状态和错误状态

#### 5.2 增强表格组件
```typescript
// components/site-table.tsx 增强
export function SiteTable() {
  const { state, actions } = useContext(SiteContext)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Site
    direction: 'asc' | 'desc'
  } | null>(null)

  // 排序功能
  const sortedSites = useMemo(() => {
    if (!sortConfig) return state.filteredSites
    
    return [...state.filteredSites].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [state.filteredSites, sortConfig])

  // 分页功能
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedSites.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedSites, currentPage])

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => handleSort('id')}
            >
              站点编号
              {sortConfig?.key === 'id' && (
                <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              )}
            </TableHead>
            {/* ... 其他表头 */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedSites.map(site => (
            <SiteTableRow key={site.id} site={site} />
          ))}
        </TableBody>
      </Table>
      
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(sortedSites.length / itemsPerPage)}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
```

#### 5.3 实现批量导入
```typescript
// components/batch-import.tsx 实现真实功能
export function BatchImport({ onImport }: { onImport: (sites: Site[]) => void }) {
  const [csvContent, setCsvContent] = useState('')
  const [parsing, setParsing] = useState(false)

  const handleImport = async () => {
    setParsing(true)
    try {
      const sites = parseCSVToSites(csvContent)
      onImport(sites)
      toast.success(`成功导入 ${sites.length} 个站点`)
    } catch (error) {
      toast.error('导入失败: ' + error.message)
    } finally {
      setParsing(false)
    }
  }

  return (
    <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量导入站点</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>CSV格式数据</Label>
            <Textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="站点编号,站点名称,MAC地址,密码,标签(用;分隔)"
              rows={10}
            />
          </div>
          
          <div className="text-sm text-gray-600">
            <p>CSV格式示例：</p>
            <code>DC20240107,测试站点,ABC123456,password123,测试;在线</code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBatchImport(false)}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={parsing}>
            {parsing ? '导入中...' : '确认导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Phase 6: 测试和优化 (1天)

#### 6.1 功能测试清单
- [ ] 站点列表加载显示
- [ ] 搜索和筛选功能
- [ ] 编辑模式切换
- [ ] 站点信息修改和保存
- [ ] 代理配置管理
- [ ] 批量导入功能
- [ ] 配置文件编辑
- [ ] 快速访问功能(Web/SSH/MySQL/BS)

#### 6.2 性能优化
```typescript
// hooks/use-optimized-search.ts
export function useOptimizedSearch(sites: Site[], searchTerm: string, selectedTags: string[]) {
  return useMemo(() => {
    let filtered = sites

    // 搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(site => 
        site.id.toLowerCase().includes(term) ||
        site.name.toLowerCase().includes(term) ||
        site.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // 标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(site =>
        selectedTags.some(tag => {
          if (tag === '无标签') return site.tags.length === 0
          return site.tags.includes(tag)
        })
      )
    }

    return filtered
  }, [sites, searchTerm, selectedTags])
}
```

#### 6.3 错误处理和用户反馈
```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Site management error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            系统出现错误
          </h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || '未知错误'}
          </p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

## 部署配置

### 构建配置
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:7400/api/:path*',
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
}

export default nextConfig
```

### 启动脚本
```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "production": "npm run build && npm run start"
  }
}
```

## 验收标准

### 功能完整性 ✅
- [ ] 所有Vue版本功能在React版本中正常工作
- [ ] API调用完全兼容，不影响后台系统
- [ ] 数据一致性，无信息丢失或错误转换

### 性能指标 ✅
- [ ] 首屏加载时间 < 2秒 (100个站点数据)
- [ ] 搜索响应时间 < 300ms
- [ ] 内存使用 < 100MB (客户端)

### 用户体验 ✅
- [ ] 界面美观，符合现代化设计标准
- [ ] 交互流畅，无明显卡顿
- [ ] 移动端适配良好
- [ ] 错误提示友好，操作反馈及时

### 代码质量 ✅
- [ ] TypeScript类型覆盖率 > 95%
- [ ] ESLint无错误和警告
- [ ] 组件复用率高，代码结构清晰
- [ ] 有适当的错误处理和边界情况处理

---

**总预计工期：** 9个工作日  
**建议投入：** 1名高级前端开发工程师  
**风险等级：** 中等 (有完整设计稿和API，主要是功能对接)