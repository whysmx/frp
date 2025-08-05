/**
 * FRP客户端API类
 * 负责与后台API通信，完全兼容Vue版本
 */

export class FrpcApiClient {
  private baseUrl: string
  private static detectedPort: number | null = null

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.getDefaultApiUrl()
  }

  /**
   * 静态方法：自动检测frpc admin端口
   */
  static async detectAdminPort(host: string = 'localhost'): Promise<number> {
    if (this.detectedPort) {
      return this.detectedPort
    }

    const commonPorts = [7400, 7401, 7402, 7500, 8080, 8081]
    
    for (const port of commonPorts) {
      try {
        const response = await fetch(`http://${host}:${port}/api/config`, {
          method: 'HEAD',
          credentials: 'include',
          headers: {
            'Authorization': 'Basic ' + btoa('admin:admin'),
          },
          signal: AbortSignal.timeout(2000) // 2秒超时
        })
        
        if (response.ok || response.status === 401) { // 401表示需要认证，但端口是对的
          console.log(`检测到 frpc admin 端口: ${port}`)
          this.detectedPort = port
          return port
        }
      } catch (error) {
        // 忽略错误，继续尝试下一个端口
      }
    }
    
    console.warn('未能自动检测到 frpc admin 端口，使用默认端口 7400')
    this.detectedPort = 7400
    return 7400
  }

  /**
   * 获取默认API地址
   * 优先级：传入参数 > 环境变量 > 自动检测端口
   */
  private getDefaultApiUrl(): string {
    // 1. 环境变量
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FRPC_API_URL) {
      return process.env.NEXT_PUBLIC_FRPC_API_URL
    }

    // 2. 浏览器环境自动检测
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname
      const currentPort = window.location.port
      
      // 如果是开发环境（前端在3001），需要明确指定frpc端口
      if (currentPort === '3001') {
        // 这里先返回默认端口，实际的端口检测在第一次API调用时进行
        return `http://${currentHost}:7400`
      }
      
      // 如果当前就在frpc的admin端口上（生产环境场景）
      // 使用相对路径，让浏览器自动使用当前的host:port
      return ''
    }

    // 3. 服务端渲染等其他环境的默认值
    return 'http://localhost:7400'
  }

  /**
   * 使用动态端口检测的实例方法
   */
  async getConfigWithPortDetection(): Promise<string> {
    // 如果在开发环境且使用默认配置，先尝试端口检测
    if (typeof window !== 'undefined' && 
        window.location.port === '3001' && 
        this.baseUrl.includes(':7400')) {
      
      try {
        const host = window.location.hostname
        const detectedPort = await FrpcApiClient.detectAdminPort(host)
        this.baseUrl = `http://${host}:${detectedPort}`
        console.log(`已更新 API 地址为: ${this.baseUrl}`)
      } catch (error) {
        console.warn('端口检测失败，使用默认配置')
      }
    }
    
    return this.getConfig()
  }

  /**
   * 获取配置文件内容
   */
  async getConfig(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        credentials: 'include',
        headers: {
          'Accept': 'text/plain',
          'Authorization': 'Basic ' + btoa('admin:admin'),
        }
      })

      if (!response.ok) {
        throw new Error(`获取配置失败: ${response.status} ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      console.error('Failed to get config:', error)
      throw new Error(`获取配置文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 保存配置文件内容
   */
  async saveConfig(content: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': 'Basic ' + btoa('admin:admin'),
        },
        body: content
      })

      if (!response.ok) {
        throw new Error(`保存配置失败: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      throw new Error(`保存配置文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reload`, {
        credentials: 'include',
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:admin'),
        }
      })

      if (!response.ok) {
        throw new Error(`重载配置失败: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to reload config:', error)
      throw new Error(`重新加载配置失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        credentials: 'include',
        method: 'HEAD',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:admin'),
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}