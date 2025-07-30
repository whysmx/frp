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

export default function FrpcSiteManagement() {
  const { state, actions } = useSiteContext()
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showProxyConfig, setShowProxyConfig] = useState<Site | null>(null)

  // 初始化数据加载
  useEffect(() => {
    actions.loadSites()
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
      const url = `http://localhost:${proxy5000.bind_port}`
      window.open(url, "_blank")
    }
  }

  const handleSSHAccess = (site: Site) => {
    const proxy22 = site.configs.find((p) => p.name.includes("-22"))
    if (proxy22) {
      const sshCommand = `ssh -p ${proxy22.bind_port} user@localhost`
      navigator.clipboard.writeText(sshCommand)
      console.log(`SSH命令已复制: ${sshCommand}`)
    }
  }

  const handleMySQLAccess = (site: Site) => {
    const proxy3306 = site.configs.find((p) => p.name.includes("-3306"))
    if (proxy3306) {
      const mysqlCommand = `mysql -h localhost -P ${proxy3306.bind_port} -u root -p`
      navigator.clipboard.writeText(mysqlCommand)
      console.log(`MySQL命令已复制: ${mysqlCommand}`)
    }
  }

  const handleBatchImport = async (newSites: Site[]) => {
    try {
      await actions.importSites(newSites)
    } catch (error) {
      console.error('Failed to import sites:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
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
          onImport={handleBatchImport}
        />

        {/* Config Editor Dialog */}
        <ConfigEditor showConfigEditor={showConfigEditor} setShowConfigEditor={setShowConfigEditor} />
      </div>
    </div>
  )
}
