"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface ConfigEditorProps {
  showConfigEditor: boolean
  setShowConfigEditor: (show: boolean) => void
}

export function ConfigEditor({ showConfigEditor, setShowConfigEditor }: ConfigEditorProps) {
  const [configText, setConfigText] = useState("")

  return (
    <Dialog open={showConfigEditor} onOpenChange={setShowConfigEditor}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] glass-effect rounded-3xl border-0">
        <DialogHeader>
          <DialogTitle className="title-2">修改配置文件</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder="请输入frpc配置文件内容..."
            rows={20}
            className="border-0 bg-slate-100/60 rounded-2xl font-mono text-sm resize-none focus:bg-white focus:shadow-lg transition-all duration-200 backdrop-blur-sm"
          />
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowConfigEditor(false)}
              className="flex-1 border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl py-4 animated-element backdrop-blur-sm"
            >
              取消
            </Button>
            <Button onClick={() => setShowConfigEditor(false)} className="flex-1 button-primary">
              保存配置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
