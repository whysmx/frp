"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Plus, Trash2 } from "lucide-react"
import type { Site, Proxy } from "@/types/site"

interface ProxyConfigProps {
  showProxyConfig: Site | null
  setShowProxyConfig: (site: Site | null) => void
  onSave: (site: Site, configs: Proxy[]) => void
}

export function ProxyConfig({ showProxyConfig, setShowProxyConfig, onSave }: ProxyConfigProps) {
  const [editingConfigs, setEditingConfigs] = useState<Proxy[]>([])

  useEffect(() => {
    if (showProxyConfig) {
      setEditingConfigs([...showProxyConfig.configs])
    }
  }, [showProxyConfig])

  const handleSaveProxyConfig = () => {
    if (showProxyConfig) {
      onSave(showProxyConfig, editingConfigs)
    }
    setShowProxyConfig(null)
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
    setEditingConfigs((prev) => prev.map((proxy, i) => (i === index ? { ...proxy, [field]: value } : proxy)))
  }

  if (!showProxyConfig) return null

  return (
    <Card className="glass-effect border-0 rounded-3xl animated-element card-hover">
      <CardContent className="p-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="title-3">代理配置</h3>
                <p className="caption text-slate-500">
                  {showProxyConfig.siteName} ({showProxyConfig.siteCode})
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveProxyConfig}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 rounded-2xl px-6 py-3 animated-element shadow-lg shadow-green-500/25"
              >
                保存
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelProxyEdit}
                className="border-slate-200 text-slate-500 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl px-6 py-3 animated-element backdrop-blur-sm"
              >
                取消
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white/60 rounded-2xl p-6 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200">
                  <TableHead className="text-slate-600 font-semibold py-4">配置名称</TableHead>
                  <TableHead className="text-slate-600 font-semibold py-4">类型</TableHead>
                  <TableHead className="text-slate-600 font-semibold py-4">服务名称</TableHead>
                  <TableHead className="text-slate-600 font-semibold py-4">绑定端口</TableHead>
                  <TableHead className="text-slate-600 font-semibold py-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingConfigs.map((proxy, index) => (
                  <TableRow key={index} className="border-b border-slate-100">
                    <TableCell className="py-4">
                      <Input
                        value={proxy.name}
                        onChange={(e) => handleProxyFieldChange(index, "name", e.target.value)}
                        className="border-0 bg-slate-100/60 rounded-xl h-11 font-mono text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <Input
                        value={proxy.type}
                        onChange={(e) => handleProxyFieldChange(index, "type", e.target.value)}
                        className="border-0 bg-slate-100/60 rounded-xl h-11 text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <Input
                        value={proxy.server_name}
                        onChange={(e) => handleProxyFieldChange(index, "server_name", e.target.value)}
                        className="border-0 bg-slate-100/60 rounded-xl h-11 font-mono text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <Input
                        type="number"
                        value={proxy.bind_port}
                        onChange={(e) =>
                          handleProxyFieldChange(index, "bind_port", Number.parseInt(e.target.value) || 0)
                        )
                        className="border-0 bg-slate-100/60 rounded-xl h-11 text-sm focus:bg-white focus:shadow-md transition-all duration-200"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProxy(index)}
                        className="border-0 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl h-10 w-10 p-0 animated-element shadow-lg shadow-red-500/25"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button
            variant="outline"
            onClick={handleAddNewProxy}
            className="w-full border-2 border-dashed border-slate-300 text-slate-600 bg-white/60 hover:bg-white hover:shadow-lg rounded-2xl py-6 animated-element backdrop-blur-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增端口配置
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
