/**
 * FRP客户端API类
 * 负责与后台API通信，完全兼容Vue版本
 */

export class FrpcApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
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
        method: 'GET'
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
        method: 'HEAD'
      })
      return response.ok
    } catch {
      return false
    }
  }
}