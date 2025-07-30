/**
 * STCP配置管理器 - TypeScript版本
 * 基于Vue版本的STCPManager.js，提供完整的站点管理功能
 */

import { INIParser, type ParsedConfig, type Device, type STCPConfig } from '../parsers/ini-parser'
import { FrpcApiClient } from '../api/frpc-client'
import type { Site, Proxy } from '@/types/site'

export class STCPManager {
  private apiClient: FrpcApiClient
  private configData: ParsedConfig | null = null
  private sites: Site[] = []
  private lastSyncTime: Date | null = null

  constructor(apiClient?: FrpcApiClient) {
    this.apiClient = apiClient || new FrpcApiClient()
  }

  /**
   * 从API加载配置数据
   */
  async loadData(): Promise<Site[]> {
    try {
      const configText = await this.apiClient.getConfig()
      this.configData = INIParser.parse(configText)
      this.sites = this.convertToSites(this.configData)
      this.lastSyncTime = new Date()
      
      console.log(`Loaded ${this.sites.length} sites from config`)
      return this.sites
    } catch (error) {
      console.error('Failed to load sites:', error)
      throw error
    }
  }

  /**
   * 保存配置数据到API
   */
  async saveData(): Promise<void> {
    if (!this.configData) {
      throw new Error('No config data to save')
    }

    try {
      // 更新配置数据
      this.updateConfigFromSites()
      
      // 生成INI内容并保存
      const iniContent = INIParser.generate(this.configData)
      await this.apiClient.saveConfig(iniContent)
      await this.apiClient.reloadConfig()
      
      console.log('Sites saved successfully')
    } catch (error) {
      console.error('Failed to save sites:', error)
      throw error
    }
  }

  /**
   * 获取所有站点
   */
  getSites(): Site[] {
    return [...this.sites]
  }

  /**
   * 根据关键词搜索站点
   */
  searchSites(keyword: string): Site[] {
    if (!keyword.trim()) return this.sites

    const term = keyword.toLowerCase()
    return this.sites.filter(site => 
      site.siteCode.toLowerCase().includes(term) ||
      site.siteName.toLowerCase().includes(term) ||
      site.macAddress.toLowerCase().includes(term) ||
      site.tags.some(tag => tag.toLowerCase().includes(term))
    )
  }

  /**
   * 根据标签筛选站点
   */
  filterSitesByTags(selectedTags: string[]): Site[] {
    if (selectedTags.length === 0) return this.sites

    return this.sites.filter(site => {
      if (selectedTags.includes('无标签')) {
        return site.tags.length === 0
      }
      return selectedTags.some(tag => site.tags.includes(tag))
    })
  }

  /**
   * 获取所有标签
   */
  getAllTags(): string[] {
    const tags = new Set<string>()
    this.sites.forEach(site => {
      site.tags.forEach(tag => tags.add(tag))
    })
    
    const result = Array.from(tags).sort()
    
    // 如果有无标签的站点，添加"无标签"选项
    if (this.sites.some(site => site.tags.length === 0)) {
      result.push('无标签')
    }
    
    return result
  }

  /**
   * 添加站点
   */
  addSite(site: Site): void {
    // 检查MAC地址是否重复
    if (this.sites.some(s => s.macAddress === site.macAddress)) {
      throw new Error(`MAC地址 ${site.macAddress} 已存在`)
    }

    // 检查站点编号是否重复
    if (this.sites.some(s => s.siteCode === site.siteCode)) {
      throw new Error(`站点编号 ${site.siteCode} 已存在`)
    }

    this.sites.push(site)
  }

  /**
   * 更新站点
   */
  updateSite(macAddress: string, updates: Partial<Site>): void {
    const index = this.sites.findIndex(s => s.macAddress === macAddress)
    if (index === -1) {
      throw new Error(`找不到MAC地址为 ${macAddress} 的站点`)
    }

    // 如果更新MAC地址，检查新MAC是否重复
    if (updates.macAddress && updates.macAddress !== macAddress) {
      if (this.sites.some(s => s.macAddress === updates.macAddress)) {
        throw new Error(`新MAC地址 ${updates.macAddress} 已存在`)
      }
    }

    // 如果更新站点编号，检查是否重复
    if (updates.siteCode && updates.siteCode !== this.sites[index].siteCode) {
      if (this.sites.some(s => s.siteCode === updates.siteCode)) {
        throw new Error(`新站点编号 ${updates.siteCode} 已存在`)
      }
    }

    this.sites[index] = { ...this.sites[index], ...updates }
  }

  /**
   * 删除站点
   */
  deleteSite(macAddress: string): void {
    const index = this.sites.findIndex(s => s.macAddress === macAddress)
    if (index === -1) {
      throw new Error(`找不到MAC地址为 ${macAddress} 的站点`)
    }

    this.sites.splice(index, 1)
  }

  /**
   * 导入站点
   */
  importSites(sites: Site[]): { success: number; errors: string[] } {
    const errors: string[] = []
    let success = 0

    for (const site of sites) {
      try {
        this.addSite(site)
        success++
      } catch (error) {
        errors.push(`${site.siteCode}: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    return { success, errors }
  }

  /**
   * 分配新的绑定端口
   */
  allocateBindPort(): number {
    const usedPorts = new Set<number>()
    
    // 收集所有已使用的端口
    this.sites.forEach(site => {
      site.configs.forEach(config => {
        usedPorts.add(config.bind_port)
      })
    })

    // 从18000开始分配新端口
    let port = 18000
    while (usedPorts.has(port)) {
      port++
    }

    return port
  }

  /**
   * 为站点生成默认端口配置
   */
  generateDefaultConfigs(site: Site): Proxy[] {
    const configs: Proxy[] = []
    const ports = [22, 3306, 5000] // SSH, MySQL, Web

    for (const port of ports) {
      configs.push({
        name: `R-${site.macAddress}-${port}`,
        type: 'stcp',
        role: 'visitor',
        server_name: `R-${site.macAddress}-${port}`,
        sk: site.macAddress,
        bind_addr: '0.0.0.0',
        bind_port: this.allocateBindPort()
      })
    }

    return configs
  }

  /**
   * 获取上次同步时间
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime
  }

  /**
   * 将解析的配置数据转换为站点列表
   */
  private convertToSites(config: ParsedConfig): Site[] {
    return INIParser.groupConfigsBySite(config.stcpConfigs, config.devices)
  }

  /**
   * 将站点数据更新到配置对象中
   */
  private updateConfigFromSites(): void {
    if (!this.configData) return

    // 更新设备列表
    this.configData.devices = this.sites.map(site => ({
      macAddress: site.macAddress,
      siteId: site.siteCode,
      siteName: site.siteName,
      password: site.password,
      tags: site.tags
    }))

    // 更新STCP配置
    this.configData.stcpConfigs = []
    this.sites.forEach(site => {
      site.configs.forEach(config => {
        this.configData!.stcpConfigs.push({
          name: config.name,
          type: config.type,
          role: config.role,
          sk: config.sk,
          server_name: config.server_name,
          bind_addr: config.bind_addr,
          bind_port: config.bind_port
        })
      })
    })
  }
}