"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Plus } from "lucide-react"
import type { Site, Proxy } from "@/types/site"

interface SiteTableProps {
  sites: Site[]
  isEditMode: boolean
  allTags: string[]
  onSiteFieldChange: (macAddress: string, field: keyof Site, value: string | string[]) => void
  onAccessSite: (site: Site) => void
  onSSHAccess: (site: Site) => void
  onMySQLAccess: (site: Site) => void
  onShowProxyConfig: (site: Site) => void
  onAddTag: (macAddress: string, newTag: string) => void
}

export function SiteTable({
  sites,
  isEditMode,
  allTags,
  onSiteFieldChange,
  onAccessSite,
  onSSHAccess,
  onMySQLAccess,
  onShowProxyConfig,
  onAddTag,
}: SiteTableProps) {
  // Extract ports from config names
  const getPortsFromConfigs = (configs: Proxy[]) => {
    return configs
      .map((config) => {
        const parts = config.name.split("-")
        return parts[parts.length - 1] // 获取最后一部分作为端口
      })
      .join(", ")
  }

  return (
    <Card className="glass-effect border-0 rounded-3xl overflow-hidden card-hover">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <TableHead className="text-slate-600 font-semibold py-6 px-8">站点编号</TableHead>
              <TableHead className="text-slate-600 font-semibold py-6 px-8">站点名称</TableHead>
              {isEditMode && <TableHead className="text-slate-600 font-semibold py-6 px-8">MAC地址</TableHead>}
              <TableHead className="text-slate-600 font-semibold py-6 px-8">密码</TableHead>
              {!isEditMode && <TableHead className="text-slate-600 font-semibold py-6 px-8">端口</TableHead>}
              <TableHead className="text-slate-600 font-semibold py-6 px-8">标签</TableHead>
              <TableHead className="text-slate-600 font-semibold py-6 px-8 text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site, index) => (
              <TableRow
                key={site.macAddress}
                className={`border-b border-slate-100 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-blue-50/80 transition-all duration-200 animated-element ${
                  index % 2 === 0 ? "bg-white/90" : "bg-slate-50/60"
                }`}
              >
                <TableCell className="py-6 px-8">
                  {isEditMode ? (
                    <Input
                      value={site.siteCode}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "siteCode", e.target.value)}
                      className="border-0 bg-slate-100/60 rounded-xl h-10 font-mono text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                    />
                  ) : (
                    <span className="font-mono text-sm text-slate-700 bg-slate-100/60 px-3 py-2 rounded-xl">
                      {site.siteCode}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-6 px-8">
                  {isEditMode ? (
                    <Input
                      value={site.siteName}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "siteName", e.target.value)}
                      className="border-0 bg-slate-100/60 rounded-xl h-10 font-medium text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">{site.siteName}</span>
                  )}
                </TableCell>
                {isEditMode && (
                  <TableCell className="py-6 px-8">
                    <span className="font-mono text-sm text-slate-600 bg-slate-100/60 px-4 py-2 rounded-xl">
                      {site.macAddress}
                    </span>
                  </TableCell>
                )}
                <TableCell className="py-6 px-8">
                  {isEditMode ? (
                    <Input
                      type="text"
                      value={site.password}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "password", e.target.value)}
                      className="border-0 bg-slate-100/60 rounded-xl h-10 text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                      placeholder="输入密码"
                    />
                  ) : (
                    <span className="text-sm text-slate-700 font-mono bg-slate-100/60 px-3 py-2 rounded-xl">
                      {site.password || "未设置"}
                    </span>
                  )}
                </TableCell>
                {!isEditMode && (
                  <TableCell className="py-6 px-8">
                    <span className="font-mono text-sm text-slate-600 bg-slate-100/60 px-4 py-2 rounded-xl">
                      {getPortsFromConfigs(site.configs)}
                    </span>
                  </TableCell>
                )}
                <TableCell className="py-6 px-8">
                  <div className="flex flex-wrap gap-2">
                    {isEditMode ? (
                      <>
                        {allTags.map((tag) => {
                          const isSelected = site.tags.includes(tag)
                          return (
                            <Button
                              key={tag}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (isSelected) {
                                  onSiteFieldChange(
                                    site.macAddress,
                                    "tags",
                                    site.tags.filter((t) => t !== tag),
                                  )
                                } else {
                                  onSiteFieldChange(site.macAddress, "tags", [...site.tags, tag])
                                }
                              }}
                              className={`rounded-full px-4 py-1.5 text-xs font-medium animated-element transition-all duration-200 ${
                                isSelected
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 scale-105 shadow-md shadow-blue-500/25"
                                  : "bg-slate-100/60 hover:bg-white hover:shadow-md text-slate-600 border-slate-200 scale-100 backdrop-blur-sm"
                              }`}
                            >
                              {tag}
                            </Button>
                          )
                        })}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newTag = prompt("请输入新标签:")
                            if (newTag) onAddTag(site.macAddress, newTag)
                          }}
                          className="rounded-full px-4 py-1.5 text-xs border-2 border-dashed border-slate-300 text-slate-600 bg-white/60 hover:bg-white hover:shadow-md animated-element backdrop-blur-sm"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          添加
                        </Button>
                      </>
                    ) : (
                      site.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="rounded-full px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-0 cursor-default hover:from-slate-200 hover:to-slate-300 transition-all duration-200"
                        >
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-6 px-8 text-right">
                  <div className="flex gap-2 justify-end">
                    {!isEditMode && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onAccessSite(site)}
                          className="border-0 bg-slate-100/60 text-slate-600 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 text-xs animated-element backdrop-blur-sm"
                        >
                          访问
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSSHAccess(site)}
                          className="border-0 bg-slate-100/60 text-slate-600 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 text-xs animated-element backdrop-blur-sm"
                        >
                          SSH
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMySQLAccess(site)}
                          className="border-0 bg-slate-100/60 text-slate-600 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 text-xs animated-element backdrop-blur-sm"
                        >
                          MySQL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // BS功能处理
                            console.log(`BS访问: ${site.name}`)
                          }}
                          className="border-0 bg-slate-100/60 text-slate-600 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 text-xs animated-element backdrop-blur-sm"
                        >
                          BS
                        </Button>
                      </>
                    )}
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onShowProxyConfig(site)}
                        className="border-0 bg-slate-100/60 text-slate-700 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 text-xs animated-element backdrop-blur-sm"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        代理配置
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
