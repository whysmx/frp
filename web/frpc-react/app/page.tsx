"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SiteFilters } from "@/components/site-filters"
import { SiteTable } from "@/components/site-table"
import { ProxyConfig } from "@/components/proxy-config"
import { BatchImport } from "@/components/batch-import"
import { ConfigEditor } from "@/components/config-editor"
import { useSiteContext } from "@/contexts/site-context"
import type { Site, Proxy } from "@/types/site"

// 兼容性剪贴板复制函数 - 支持远程访问
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 优先使用现代 Clipboard API (需要 HTTPS 或 localhost)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // 降级方案：使用传统的 document.execCommand
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const result = document.execCommand('copy')
    document.body.removeChild(textArea)
    return result
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
}

export default function FrpcSiteManagement() {
  const { state, actions } = useSiteContext()
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showProxyConfig, setShowProxyConfig] = useState<Site | null>(null)

  // 初始化数据加载 - 使用ref避免依赖actions导致的无限循环
  useEffect(() => {
    actions.loadSites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 解构状态
  const { 
    sites, 
    filteredSites, 
    loading, 
    error, 
    editMode, 
    searchTerm, 
    selectedTags, 
    allTags,
    lastSyncTime 
  } = state

  const handleSiteFieldChange = async (macAddress: string, field: keyof Site, value: string | string[]) => {
    try {
      // 字段更改时静默更新，不显示成功提示
      await actions.updateSite(macAddress, { [field]: value }, true)
    } catch (error) {
      console.error('Failed to update site:', error)
    }
  }

  const handleAccessSite = (site: Site) => {
    const proxy5000 = site.configs.find((p) => p.name.includes("-5000"))
    if (proxy5000) {
      const currentHost = window.location.hostname
      const baseUrl = `http://${currentHost}:${proxy5000.bind_port}`
      const urlWithParams = `${baseUrl}?site=${encodeURIComponent(site.siteCode)}.${encodeURIComponent(site.siteName)}`
      window.open(urlWithParams, "_blank")
    }
  }

  const handleSSHAccess = async (site: Site) => {
    // 查找服务名后缀是 -22 的端口和 -3306 的端口
    const proxy22 = site.configs.find((p) => p.name.endsWith("-22"))
    const proxy3306 = site.configs.find((p) => p.name.endsWith("-3306"))
    
    if (proxy22 && proxy3306) {
      // 获取当前浏览器访问的主机IP（与访问站点按钮相同的方式）
      const currentHost = window.location.hostname
      const sessionName = `${site.siteCode}.${site.siteName}`
      
      // 生成XShell命令 - 使用主机IP和3306端口的映射端口
      const xshellCommand = `xshell -newtab "${sessionName}" ssh forlinx@${currentHost}:${proxy3306.bind_port}`
      
      // 复制XShell命令到剪贴板 - 兼容远程访问
      const copySuccess = await copyToClipboard(xshellCommand)
      
      // 简单的自动消失提示
      const toast = document.createElement('div')
      toast.textContent = copySuccess 
        ? `SSH命令已复制 (标签: ${sessionName})`
        : `复制失败，请手动复制：${xshellCommand}`
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: rgba(0, 0, 0, 0.8); color: white; padding: 12px 16px;
        border-radius: 8px; font-size: 14px; max-width: 400px;
        animation: fadeInOut 3s forwards;
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } else {
      // 错误提示
      const toast = document.createElement('div')
      let errorMsg = '配置不完整：'
      if (!proxy22) errorMsg += '未找到SSH端口配置（-22）'
      if (!proxy3306) errorMsg += (!proxy22 ? '，' : '') + '未找到MySQL端口配置（-3306）'
      
      toast.textContent = errorMsg
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: rgba(220, 38, 38, 0.9); color: white; padding: 12px 16px;
        border-radius: 8px; font-size: 14px; max-width: 400px;
        animation: fadeInOut 3s forwards;
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    }
  }

  const handleMySQLAccess = async (site: Site) => {
    // 查找服务名后缀是 -3306 的端口
    const proxy3306 = site.configs.find((p) => p.name.endsWith("-3306"))
    if (proxy3306) {
      // 获取当前浏览器访问的主机IP
      const currentHost = window.location.hostname
      const sessionName = `${site.siteCode}.${site.siteName}`
      
      // 生成DBeaver可直接使用的MySQL连接URL
      const connectionInfo = `mysql://root:Sun%40123456@${currentHost}:${proxy3306.bind_port}/`
      
      // 复制连接信息到剪贴板 - 兼容远程访问
      const copySuccess = await copyToClipboard(connectionInfo)
      
      // 简单的自动消失提示
      const toast = document.createElement('div')
      toast.textContent = copySuccess 
        ? `MySQL连接信息已复制 (${sessionName})`
        : `复制失败，请手动复制：${connectionInfo}`
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: rgba(0, 0, 0, 0.8); color: white; padding: 12px 16px;
        border-radius: 8px; font-size: 14px; max-width: 400px;
        animation: fadeInOut 3s forwards;
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } else {
      // 错误提示
      const toast = document.createElement('div')
      toast.textContent = '未找到MySQL端口配置（后缀-3306）'
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: rgba(220, 38, 38, 0.9); color: white; padding: 12px 16px;
        border-radius: 8px; font-size: 14px; max-width: 400px;
        animation: fadeInOut 3s forwards;
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    }
  }


  const handleShowProxyConfig = (site: Site) => {
    setShowProxyConfig(site)
  }

  const handleSaveProxyConfig = async (site: Site, configs: Proxy[]) => {
    try {
      // 端口配置保存时显示成功提示
      await actions.updateSite(site.macAddress, { configs })
      setShowProxyConfig({ ...site, configs })
    } catch (error) {
      console.error('Failed to save proxy config:', error)
    }
  }

  const handleAddTag = async (macAddress: string, newTag: string) => {
    if (newTag.trim()) {
      const site = sites.find(s => s.macAddress === macAddress)
      if (site && !site.tags.includes(newTag.trim())) {
        try {
          // 添加标签时静默更新，不显示成功提示
          await actions.updateSite(macAddress, { tags: [...site.tags, newTag.trim()] }, true)
        } catch (error) {
          console.error('Failed to add tag:', error)
        }
      }
    }
  }

  const handleSaveChanges = async () => {
    try {
      await actions.saveSites()
      actions.setEditMode(false)
    } catch (error) {
      console.error('Failed to save changes:', error)
    }
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-[90rem] mx-auto space-y-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">连接失败</h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-20 sm:pb-4">
      <div className="max-w-[90rem] mx-auto space-y-8">

        {/* Search and Filter */}
        <SiteFilters
          sites={sites}
          searchTerm={searchTerm}
          setSearchTerm={actions.setSearchTerm}
          selectedTags={selectedTags}
          setSelectedTags={actions.setSelectedTags}
          showTagFilter={showTagFilter}
          setShowTagFilter={setShowTagFilter}
          filteredSites={filteredSites}
          editMode={editMode}
          loading={loading}
          onEditModeChange={actions.setEditMode}
          onSaveChanges={handleSaveChanges}
          onShowBatchImport={() => setShowBatchImport(true)}
          onShowConfigEditor={() => setShowConfigEditor(true)}
        />

        {/* Proxy Configuration Panel */}
        <ProxyConfig
          showProxyConfig={showProxyConfig}
          setShowProxyConfig={setShowProxyConfig}
          onSave={handleSaveProxyConfig}
          allSites={sites}
        />

        {/* Sites Table */}
        <SiteTable
          sites={filteredSites}
          isEditMode={editMode}
          allTags={allTags}
          onSiteFieldChange={handleSiteFieldChange}
          onAccessSite={handleAccessSite}
          onSSHAccess={handleSSHAccess}
          onMySQLAccess={handleMySQLAccess}
          onShowProxyConfig={handleShowProxyConfig}
          onAddTag={handleAddTag}
        />

        {/* Batch Import Dialog */}
        <BatchImport
          showBatchImport={showBatchImport}
          setShowBatchImport={setShowBatchImport}
        />

        {/* Config Editor Dialog */}
        <ConfigEditor showConfigEditor={showConfigEditor} setShowConfigEditor={setShowConfigEditor} />
      </div>
    </div>
  )
}
