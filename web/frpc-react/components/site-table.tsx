"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Plus, Globe, Terminal, Database, Monitor } from "lucide-react"
import type { Site } from "@/types/site"

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

  return (
    <Card className="glass-effect border-0 rounded-3xl overflow-hidden card-hover">
      <div className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-b border-border/50 bg-secondary/50 backdrop-blur-sm">
              <TableHead className="text-secondary-foreground font-medium py-8 px-10 w-60">站点编号</TableHead>
              <TableHead className="text-secondary-foreground font-medium py-8 px-10 w-60">站点名称</TableHead>
              {isEditMode && <TableHead className="text-secondary-foreground font-medium py-8 px-10">MAC地址</TableHead>}
              <TableHead className="text-secondary-foreground font-medium py-8 px-10">密码</TableHead>
              <TableHead className="text-secondary-foreground font-medium py-8 px-10 w-80">标签</TableHead>
              <TableHead className="text-secondary-foreground font-medium py-8 px-10 text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site, index) => (
              <TableRow
                key={site.macAddress}
                className={`border-b border-border/30 table-row-elevated transition-all duration-300 hover:bg-accent/30 ${
                  index % 2 === 0 ? "bg-white/95" : "bg-muted/20"
                }`}
              >
                <TableCell className="py-8 px-10">
                  {isEditMode ? (
                    <Input
                      value={site.siteCode}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "siteCode", e.target.value)}
                      className="apple-input h-11 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm font-medium" style={{color: 'rgb(28 28 30)'}}>
                      {site.siteCode}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-8 px-10">
                  {isEditMode ? (
                    <Input
                      value={site.siteName}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "siteName", e.target.value)}
                      className="apple-input h-11 font-medium text-sm"
                    />
                  ) : (
                    <span className="font-medium" style={{color: 'rgb(28 28 30)'}}>{site.siteName}</span>
                  )}
                </TableCell>
                {isEditMode && (
                  <TableCell className="py-8 px-10">
                    <span className="font-mono text-sm" style={{color: 'rgb(99 99 102)'}}>
                      {site.macAddress}
                    </span>
                  </TableCell>
                )}
                <TableCell className="py-8 px-10">
                  {isEditMode ? (
                    <Input
                      type="text"
                      value={site.password}
                      onChange={(e) => onSiteFieldChange(site.macAddress, "password", e.target.value)}
                      className="apple-input h-11 text-sm"
                      placeholder="输入密码"
                    />
                  ) : (
                    <span className="text-sm font-mono font-normal" style={{color: 'rgb(28 28 30)'}}>
                      {site.password || "未设置"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-8 px-10">
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
                              className={`apple-button rounded-full px-4 py-2 text-xs font-normal animated-element transition-all duration-300 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-0 scale-105"
                                  : "bg-accent hover:bg-accent/80 text-accent-foreground border border-border scale-100"
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
                          className="apple-button rounded-full px-4 py-2 text-xs border-2 border-dashed border-border text-muted-foreground bg-background hover:bg-accent hover:text-accent-foreground animated-element"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          添加
                        </Button>
                      </>
                    ) : (
                      site.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="rounded-full px-4 py-2 text-xs font-normal border border-border/30 cursor-default transition-all duration-300"
                          style={{backgroundColor: 'rgb(248 248 250)', color: 'rgb(28 28 30)'}}
                        >
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-8 px-10 text-right">
                  <div className="flex gap-3 justify-end">
                    {!isEditMode && (() => {
                      // 检查端口配置是否存在
                      const hasWebPort = site.configs.find((p) => p.name.includes("-5000"))
                      const hasSSHPort = site.configs.find((p) => p.name.endsWith("-22"))
                      const hasMySQLPort = site.configs.find((p) => p.name.endsWith("-3306"))
                      // BS暂时假设可用，后续可添加具体端口检查
                      const hasBSPort = true
                      
                      return (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasWebPort}
                            onClick={() => hasWebPort && onAccessSite(site)}
                            className="ios-button text-foreground rounded-2xl px-3 py-2 text-xs animated-element"
                            title={hasWebPort ? "访问站点" : "访问站点 - 未配置网站端口(-5000)"}
                          >
                            <Globe className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasSSHPort}
                            onClick={() => hasSSHPort && onSSHAccess(site)}
                            className="ios-button text-foreground rounded-2xl px-3 py-2 text-xs font-normal animated-element"
                            title={hasSSHPort ? "SSH连接" : "SSH连接 - 未配置SSH端口(-22)"}
                          >
                            <Terminal className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasMySQLPort}
                            onClick={() => hasMySQLPort && onMySQLAccess(site)}
                            className="ios-button text-foreground rounded-2xl px-3 py-2 text-xs font-normal animated-element"
                            title={hasMySQLPort ? "MySQL连接" : "MySQL连接 - 未配置MySQL端口(-3306)"}
                          >
                            <Database className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasBSPort}
                            onClick={() => {
                              if (hasBSPort) {
                                // BS功能处理
                                console.log(`BS访问: ${site.siteName}`)
                              }
                            }}
                            className="ios-button text-foreground rounded-2xl px-3 py-2 text-xs font-normal animated-element"
                            title="BS平台"
                          >
                            <Monitor className="w-4 h-4" />
                          </Button>
                        </>
                      )
                    })()}
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onShowProxyConfig(site)}
                        className="ios-button text-foreground rounded-2xl px-4 py-2 text-xs font-normal animated-element"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        端口配置
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
