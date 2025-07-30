/**
 * INI配置文件解析器 - TypeScript版本
 * 基于Vue版本的INIParser.js，完全兼容现有格式
 */

export interface Device {
  macAddress: string
  siteId: string
  siteName: string
  password: string
  tags: string[]
}

export interface STCPConfig {
  name: string
  type: string
  role: string
  sk: string
  server_name: string
  bind_addr: string
  bind_port: number
}

export interface ParsedConfig {
  common: Record<string, string>
  devices: Device[]
  stcpConfigs: STCPConfig[]
  otherSections: Array<{ name: string; config: Record<string, string> }>
}

export class INIParser {
  /**
   * 解析INI文件内容为结构化数据
   */
  static parse(content: string): ParsedConfig {
    const result: ParsedConfig = {
      common: {},
      devices: [],
      stcpConfigs: [],
      otherSections: []
    }

    const lines = content.split('\n').map(line => line.trim())
    let currentSection: string | null = null
    let currentConfig: Record<string, string> = {}
    let inDeviceRegistry = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 跳过空行
      if (!line) continue

      // 处理设备注册表标记
      if (line === '# DEVICE_REGISTRY_START') {
        inDeviceRegistry = true
        continue
      }
      if (line === '# DEVICE_REGISTRY_END') {
        inDeviceRegistry = false
        continue
      }

      // 解析设备注册表条目
      if (inDeviceRegistry && line.startsWith('# ') && line.includes('|')) {
        const deviceLine = line.substring(2)
        const device = this.parseDeviceEntry(deviceLine)
        if (device) {
          result.devices.push(device)
        }
        continue
      }

      // 跳过其他注释
      if (line.startsWith('#')) continue

      // 解析段落头
      if (line.startsWith('[') && line.endsWith(']')) {
        // 保存前一个段落
        if (currentSection && Object.keys(currentConfig).length > 0) {
          this.saveSection(currentSection, currentConfig, result)
        }

        currentSection = line.slice(1, -1)
        currentConfig = {}
        continue
      }

      // 解析配置项
      if (line.includes('=') && currentSection) {
        const [key, value] = line.split('=', 2)
        currentConfig[key.trim()] = value.trim()
      }
    }

    // 保存最后一个段落
    if (currentSection && Object.keys(currentConfig).length > 0) {
      this.saveSection(currentSection, currentConfig, result)
    }

    return result
  }

  /**
   * 将结构化数据生成INI文件内容
   */
  static generate(data: ParsedConfig): string {
    let content = ''

    // 生成common段落
    if (Object.keys(data.common).length > 0) {
      content += '[common]\n'
      for (const [key, value] of Object.entries(data.common)) {
        content += `${key} = ${value}\n`
      }
      content += '\n'
    }

    // 生成设备注册表
    if (data.devices.length > 0) {
      content += '# DEVICE_REGISTRY_START\n'
      for (const device of data.devices) {
        content += this.generateDeviceEntry(device)
      }
      content += '# DEVICE_REGISTRY_END\n\n'
    }

    // 生成STCP配置段落
    for (const config of data.stcpConfigs) {
      content += `[${config.name}]\n`
      content += `type = ${config.type}\n`
      content += `role = ${config.role}\n`
      content += `sk = ${config.sk}\n`
      content += `server_name = ${config.server_name}\n`
      content += `bind_addr = ${config.bind_addr}\n`
      content += `bind_port = ${config.bind_port}\n\n`
    }

    // 生成其他段落
    for (const section of data.otherSections) {
      content += `[${section.name}]\n`
      for (const [key, value] of Object.entries(section.config)) {
        content += `${key} = ${value}\n`
      }
      content += '\n'
    }

    return content
  }

  /**
   * 将STCP配置按站点分组
   */
  static groupConfigsBySite(stcpConfigs: STCPConfig[], devices: Device[]) {
    const sites = new Map<string, any>()

    // 按MAC地址分组配置
    for (const config of stcpConfigs) {
      const macAddress = config.sk
      if (!sites.has(macAddress)) {
        // 查找对应的设备信息
        const device = devices.find(d => d.macAddress === macAddress)
        sites.set(macAddress, {
          macAddress,
          siteCode: device?.siteId || '',
          siteName: device?.siteName || '',
          password: device?.password || '',
          tags: device?.tags || [],
          configs: []
        })
      }
      sites.get(macAddress).configs.push(config)
    }

    return Array.from(sites.values())
  }

  /**
   * 解析设备注册表条目
   * 格式: "MAC地址|站点编号|站点名称|密码|标签1,标签2"
   */
  private static parseDeviceEntry(deviceLine: string): Device | null {
    const parts = deviceLine.split('|').map(part => part.trim())
    if (parts.length < 4) return null

    return {
      macAddress: parts[0],
      siteId: parts[1],
      siteName: parts[2],
      password: parts[3],
      tags: parts[4] ? parts[4].split(',').map(tag => tag.trim()) : []
    }
  }

  /**
   * 生成设备注册表条目
   */
  private static generateDeviceEntry(device: Device): string {
    const tags = device.tags.length > 0 ? device.tags.join(',') : ''
    return `# ${device.macAddress}|${device.siteId}|${device.siteName}|${device.password}|${tags}\n`
  }

  /**
   * 保存段落到对应的结果分类中
   */
  private static saveSection(sectionName: string, config: Record<string, string>, result: ParsedConfig) {
    if (sectionName === 'common') {
      result.common = { ...config }
    } else if (this.isSTCPSection(config)) {
      result.stcpConfigs.push({
        name: sectionName,
        type: config.type || 'stcp',
        role: config.role || 'visitor',
        sk: config.sk || '',
        server_name: config.server_name || '',
        bind_addr: config.bind_addr || '0.0.0.0',
        bind_port: parseInt(config.bind_port) || 0
      })
    } else {
      result.otherSections.push({
        name: sectionName,
        config: { ...config }
      })
    }
  }

  /**
   * 判断是否为STCP配置段落
   */
  private static isSTCPSection(config: Record<string, string>): boolean {
    return config.type === 'stcp' && 'sk' in config && 'server_name' in config
  }
}