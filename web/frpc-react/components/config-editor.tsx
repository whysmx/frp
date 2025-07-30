"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface ConfigEditorProps {
  showConfigEditor: boolean
  setShowConfigEditor: (show: boolean) => void
}

export function ConfigEditor({ showConfigEditor, setShowConfigEditor }: ConfigEditorProps) {
  const [configText, setConfigText] = useState("")

  // 当对话框打开时加载配置
  useEffect(() => {
    if (showConfigEditor) {
      fetchData()
    }
  }, [showConfigEditor])

  const fetchData = () => {
    fetch('/api/config', { credentials: 'include' })
      .then(res => {
        return res.text()
      }).then(text => {
        setConfigText(text)
      }).catch(err => {
        toast.error('Get configure content from frpc failed!')
      })
  }

  const uploadConfig = () => {
    if (configText === "") {
      toast.error('Configure content can not be empty!')
      return
    }

    fetch('/api/config', {
      credentials: 'include',
      method: 'PUT',
      body: configText,
    }).then(() => {
      fetch('/api/reload', { credentials: 'include' })
        .then(() => {
          toast.success('Success')
          setShowConfigEditor(false)
        }).catch(err => {
          toast.error('Reload frpc configure file error, ' + err)
        })
    }).catch(err => {
      toast.error('Put config to frpc and hot reload failed!')
    })
  }

  return (
    <Dialog open={showConfigEditor} onOpenChange={setShowConfigEditor}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>修改配置文件</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 按钮栏 */}
          <div className="flex gap-2 mb-4">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button onClick={uploadConfig}>
              上传
            </Button>
          </div>

          {/* 配置编辑器 */}
          <Textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder="frpc configure file, can not be empty..."
            rows={20}
            className="font-mono text-sm text-black"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
