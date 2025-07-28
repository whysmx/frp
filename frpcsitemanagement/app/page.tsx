"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Plus } from "lucide-react"
import { SiteFilters } from "@/components/site-filters"
import { SiteTable } from "@/components/site-table"
import { ProxyConfig } from "@/components/proxy-config"
import { BatchImport } from "@/components/batch-import"
import { ConfigEditor } from "@/components/config-editor"
import { mockSites } from "@/data/mock-sites"
import type { Site, Proxy } from "@/types/site"

export default function FrpcSiteManagement() {
  const [sites, setSites] = useState<Site[]>(mockSites)
  const [isEditMode, setIsEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showProxyConfig, setShowProxyConfig] = useState<Site | null>(null)

  // Get all available tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    sites.forEach((site) => {
      site.tags.forEach((tag) => tagSet.add(tag))
    })
    return ["无标签", ...Array.from(tagSet)]
  }, [sites])

  // Filter sites based on search and tags
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch =
        searchTerm === "" ||
        site.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => {
          if (tag === "无标签") {
            return site.tags.length === 0
          }
          return site.tags.includes(tag)
        })

      return matchesSearch && matchesTags
    })
  }, [sites, searchTerm, selectedTags])

  const handleSiteFieldChange = (macAddress: string, field: keyof Site, value: string | string[]) => {
    setSites((prev) => prev.map((site) => (site.macAddress === macAddress ? { ...site, [field]: value } : site)))
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

  const handleBatchImport = (newSites: Site[]) => {
    setSites((prev) => [...prev, ...newSites])
  }

  const handleShowProxyConfig = (site: Site) => {
    setShowProxyConfig(site)
  }

  const handleSaveProxyConfig = (site: Site, configs: Proxy[]) => {
    setSites((prev) => prev.map((s) => (s.macAddress === site.macAddress ? { ...s, configs } : s)))
    setShowProxyConfig({ ...site, configs })
  }

  const handleAddTag = (macAddress: string, newTag: string) => {
    if (newTag.trim()) {
      setSites((prev) =>
        prev.map((site) =>
          site.macAddress === macAddress && !site.tags.includes(newTag.trim())
            ? { ...site, tags: [...site.tags, newTag.trim()] }
            : site,
        ),
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="title-1">站点管理</h1>
          <div className="flex gap-3">
            {!isEditMode ? (
              <Button onClick={() => setIsEditMode(true)} className="button-primary animated-element font-semibold">
                编辑
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowBatchImport(true)}
                  className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl px-6 py-3 animated-element backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  批量导入
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfigEditor(true)}
                  className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl px-6 py-3 animated-element backdrop-blur-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  配置文件
                </Button>
                <Button onClick={() => setIsEditMode(false)} className="button-primary animated-element font-semibold">
                  完成
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <SiteFilters
          sites={sites}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          showTagFilter={showTagFilter}
          setShowTagFilter={setShowTagFilter}
          filteredSites={filteredSites}
        />

        {/* Proxy Configuration Panel */}
        <ProxyConfig
          showProxyConfig={showProxyConfig}
          setShowProxyConfig={setShowProxyConfig}
          onSave={handleSaveProxyConfig}
        />

        {/* Sites Table */}
        <SiteTable
          sites={filteredSites}
          isEditMode={isEditMode}
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
