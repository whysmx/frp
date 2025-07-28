"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Download, Upload } from "lucide-react"
import { FrpcApiClient } from "@/lib/api/frpc-client"
import { toast } from "sonner"

interface ConfigEditorProps {
  showConfigEditor: boolean
  setShowConfigEditor: (show: boolean) => void
}

export function ConfigEditor({ showConfigEditor, setShowConfigEditor }: ConfigEditorProps) {
  const [configText, setConfigText] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiClient] = useState(() => new FrpcApiClient())

  // 当对话框打开时加载配置
  useEffect(() => {
    if (showConfigEditor) {
      loadConfig()
    }
  }, [showConfigEditor])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const config = await apiClient.getConfig()
      setConfigText(config)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载配置失败'
      toast.error(errorMessage)
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await apiClient.saveConfig(configText)
      await apiClient.reloadConfig()
      toast.success('配置保存成功')
      setShowConfigEditor(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存配置失败'
      toast.error(errorMessage)
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  const downloadConfig = () => {
    const blob = new Blob([configText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frpc-config-${new Date().toISOString().slice(0, 10)}.ini`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('配置文件已下载')
  }

  const uploadConfig = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ini,.txt,.conf'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setConfigText(content)
          toast.success('配置文件已上传')
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <Dialog open={showConfigEditor} onOpenChange={setShowConfigEditor}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] glass-effect rounded-3xl border-0">
        <DialogHeader>
          <DialogTitle className="title-2 flex items-center gap-2">
            修改配置文件
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* 工具栏 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={uploadConfig}
              disabled={loading || saving}
              className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-xl px-4 py-2 animated-element backdrop-blur-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              上传文件
            </Button>
            <Button
              variant="outline"
              onClick={downloadConfig}
              disabled={loading || saving || !configText}
              className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-xl px-4 py-2 animated-element backdrop-blur-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </Button>
            <Button
              variant="outline"
              onClick={loadConfig}
              disabled={loading || saving}
              className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-xl px-4 py-2 animated-element backdrop-blur-sm"
            >
              <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              重新加载
            </Button>
          </div>

          {/* 配置编辑器 */}
          <div className="relative">
            <Textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder={loading ? "正在加载配置..." : "请输入frpc配置文件内容..."}
              rows={20}
              disabled={loading}
              className="border-0 bg-slate-100/60 rounded-2xl font-mono text-sm resize-none focus:bg-white focus:shadow-lg transition-all duration-200 backdrop-blur-sm"
            />
            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowConfigEditor(false)}
              disabled={saving}
              className="flex-1 border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl py-4 animated-element backdrop-blur-sm"
            >
              取消
            </Button>
            <Button 
              onClick={saveConfig} 
              disabled={loading || saving || !configText.trim()}
              className="flex-1 button-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
