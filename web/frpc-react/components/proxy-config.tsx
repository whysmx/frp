"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Plus, Trash2 } from "lucide-react"
import type { Site, Proxy } from "@/types/site"

interface ProxyConfigProps {
  showProxyConfig: Site | null
  setShowProxyConfig: (site: Site | null) => void
  onSave: (site: Site, configs: Proxy[]) => void
  allSites?: Site[]  // 添加所有站点数据，用于端口分配
}

export function ProxyConfig({ showProxyConfig, setShowProxyConfig, onSave, allSites = [] }: ProxyConfigProps) {
  const [editingConfigs, setEditingConfigs] = useState<Proxy[]>([])

  useEffect(() => {
    if (showProxyConfig) {
      setEditingConfigs([...showProxyConfig.configs])
    }
  }, [showProxyConfig])

  const handleSaveProxyConfig = () => {
    if (showProxyConfig) {
      // 自动分配端口给bind_port为0的配置
      const configsWithPorts = editingConfigs.map((config) => {
        if (config.bind_port === 0) {
          const assignedPort = getNextAvailablePort()
          console.log(`自动分配端口: ${config.name} -> ${assignedPort}`)
          return {
            ...config,
            bind_port: assignedPort
          }
        }
        return config
      })
      onSave(showProxyConfig, configsWithPorts)
    }
    setShowProxyConfig(null)
  }

  // 获取下一个可用端口，参考批量导入的分配规则
  const getNextAvailablePort = (): number => {
    let portCounter = 18015
    const usedPorts = new Set<number>()
    
    // 收集全局所有已使用的端口
    allSites.forEach(site => {
      site.configs.forEach(config => {
        if (config.bind_port > 0) {
          usedPorts.add(config.bind_port)
        }
      })
    })
    
    // 收集当前编辑配置中的端口
    editingConfigs.forEach(config => {
      if (config.bind_port > 0) {
        usedPorts.add(config.bind_port)
      }
    })
    
    // 找到下一个可用端口
    while (usedPorts.has(portCounter)) {
      portCounter++
    }
    
    return portCounter
  }

  const handleCancelProxyEdit = () => {
    setShowProxyConfig(null)
  }

  const handleAddNewProxy = () => {
    const newProxy: Proxy = {
      name: "",
      type: "stcp",
      role: "visitor",
      server_name: "",
      sk: showProxyConfig?.macAddress || "",
      bind_addr: "0.0.0.0",
      bind_port: 0,
    }
    setEditingConfigs((prev) => [...prev, newProxy])
  }

  const handleDeleteProxy = (index: number) => {
    setEditingConfigs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProxyFieldChange = (index: number, field: keyof Proxy, value: string | number) => {
    setEditingConfigs((prev) => prev.map((proxy, i) => 
      i === index ? { ...proxy, [field]: value, bind_addr: "0.0.0.0" } : proxy
    ))
  }

  if (!showProxyConfig) return null

  return (
    <div className="sticky top-4 z-20 glass-effect border-0 rounded-3xl animated-element card-hover bg-white/95 backdrop-blur-sm shadow-xl mb-6">
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="title-3">端口配置</h3>
                <p className="caption text-foreground">
                  站点: {showProxyConfig.siteName || ''} ({showProxyConfig.siteCode || ''})
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelProxyEdit}
                className="border-border text-foreground bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl px-6 py-3 animated-element backdrop-blur-sm"
              >
                取消
              </Button>
              <Button onClick={handleSaveProxyConfig} className="button-primary animated-element font-semibold">
                确认
              </Button>
            </div>
          </div>

          <Table className="bg-white/70 rounded-2xl backdrop-blur-sm">
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground font-semibold">代理名称</TableHead>
                <TableHead className="text-foreground font-semibold">类型</TableHead>
                <TableHead className="text-foreground font-semibold">角色</TableHead>
                <TableHead className="text-foreground font-semibold">服务名</TableHead>
                <TableHead className="text-foreground font-semibold">密钥</TableHead>
                <TableHead className="text-foreground font-semibold">绑定端口</TableHead>
                <TableHead className="text-foreground font-semibold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editingConfigs.map((config, index) => (
                <TableRow key={index} className="border-border hover:bg-white/80 transition-colors">
                  <TableCell>
                    <Input
                      value={config.name}
                      onChange={(e) => handleProxyFieldChange(index, "name", e.target.value)}
                      className="bg-white/60 border-border rounded-xl"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={config.type}
                      onChange={(e) => handleProxyFieldChange(index, "type", e.target.value)}
                      className="bg-white/60 border-border rounded-xl"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={config.role}
                      onChange={(e) => handleProxyFieldChange(index, "role", e.target.value)}
                      className="bg-white/60 border-border rounded-xl"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={config.server_name}
                      onChange={(e) => handleProxyFieldChange(index, "server_name", e.target.value)}
                      className="bg-white/60 border-border rounded-xl"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={config.sk}
                      onChange={(e) => handleProxyFieldChange(index, "sk", e.target.value)}
                      className="bg-white/60 border-border rounded-xl"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        value={config.bind_port}
                        onChange={(e) => handleProxyFieldChange(index, "bind_port", parseInt(e.target.value) || 0)}
                        placeholder="输入0自动分配"
                        className="bg-white/60 border-border rounded-xl"
                      />
                      {config.bind_port === 0 && (
                        <div className="text-xs text-muted-foreground">
                          保存时自动分配端口
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProxy(index)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            onClick={handleAddNewProxy}
            variant="outline"
            className="w-full border-dashed border-2 border-border text-foreground hover:bg-accent rounded-2xl py-4 animated-element"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增端口配置
          </Button>
        </div>
      </div>
    </div>
  )
}