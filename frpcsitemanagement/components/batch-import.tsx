"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Site } from "@/types/site"

interface BatchImportProps {
  showBatchImport: boolean
  setShowBatchImport: (show: boolean) => void
  onImport: (sites: Site[]) => void
}

export function BatchImport({ showBatchImport, setShowBatchImport, onImport }: BatchImportProps) {
  const [batchImportText, setBatchImportText] = useState("")

  const handleBatchImport = () => {
    const lines = batchImportText.trim().split("\n")
    const newSites: Site[] = []
    let portCounter = 18015

    lines.forEach((line) => {
      const parts = line.trim().split(" ")
      if (parts.length >= 2) {
        const [id, mac, name = ""] = parts
        const site: Site = {
          id,
          name: name || id,
          mac,
          password: "",
          tags: [],
          proxies: [
            {
              name: `R-${mac}-22`,
              type: "stcp",
              role: "visitor",
              service: `R-${mac}-22`,
              sk: mac,
              bindAddr: "0.0.0.0",
              bindPort: portCounter++,
            },
            {
              name: `R-${mac}-3306`,
              type: "stcp",
              role: "visitor",
              service: `R-${mac}-3306`,
              sk: mac,
              bindAddr: "0.0.0.0",
              bindPort: portCounter++,
            },
            {
              name: `R-${mac}-5000`,
              type: "stcp",
              role: "visitor",
              service: `R-${mac}-5000`,
              sk: mac,
              bindAddr: "0.0.0.0",
              bindPort: portCounter++,
            },
          ],
        }
        newSites.push(site)
      }
    })

    onImport(newSites)
    setBatchImportText("")
    setShowBatchImport(false)
  }

  return (
    <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
      <DialogContent className="sm:max-w-2xl glass-effect rounded-3xl border-0">
        <DialogHeader>
          <DialogTitle className="title-2">批量导入站点</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">导入格式说明</Label>
            <div className="caption text-slate-600 bg-gradient-to-r from-slate-100 to-slate-200 p-6 rounded-2xl backdrop-blur-sm">
              <p>每行格式：站点编号 MAC地址 [站点名称]</p>
              <p className="mt-1">示例：DC20240102 E721EE345A2 苏州辐射站</p>
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="importData" className="text-sm font-semibold text-slate-700">
              导入数据
            </Label>
            <Textarea
              id="importData"
              value={batchImportText}
              onChange={(e) => setBatchImportText(e.target.value)}
              placeholder="请输入站点数据..."
              rows={6}
              className="border-0 bg-slate-100/60 rounded-2xl resize-none focus:bg-white focus:shadow-lg transition-all duration-200 backdrop-blur-sm"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowBatchImport(false)}
              className="flex-1 border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl py-4 animated-element backdrop-blur-sm"
            >
              取消
            </Button>
            <Button onClick={handleBatchImport} className="flex-1 button-primary" disabled={!batchImportText.trim()}>
              确认导入
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
