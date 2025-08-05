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
  onImport: (sites: Site[]) => Promise<void>
}

export function BatchImport({ showBatchImport, setShowBatchImport, onImport }: BatchImportProps) {
  const [batchImportText, setBatchImportText] = useState("")
  const [importing, setImporting] = useState(false)

  const parseCSVToSites = (csvContent: string): Site[] => {
    const lines = csvContent.trim().split('\n')
    const sites: Site[] = []
    let portCounter = 18015

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // 支持两种格式：
      // 1. 逗号分隔：站点编号,站点名称,MAC地址,密码,标签(用,分隔)
      // 2. 空格分隔：站点编号 MAC地址 [站点名称]
      let parts: string[]
      if (trimmedLine.includes(',')) {
        parts = trimmedLine.split(',').map(p => p.trim())
      } else {
        parts = trimmedLine.split(/\s+/)
      }

      if (parts.length >= 2) {
        const [siteCode, macOrName, nameOrMac = '', password = '', tagsStr = ''] = parts
        
        let macAddress: string
        let siteName: string
        
        // 判断第二个字段是MAC地址还是站点名称
        if (parts[1].match(/^[A-F0-9]{12}$/i)) {
          // 第二个字段是MAC地址
          macAddress = parts[1]
          siteName = nameOrMac || siteCode
        } else {
          // 假设是CSV格式：编号,名称,MAC,密码,标签
          siteName = macOrName
          macAddress = nameOrMac
        }

        if (!macAddress.match(/^[A-F0-9]{12}$/i)) {
          console.warn(`Invalid MAC address: ${macAddress}, skipping line: ${trimmedLine}`)
          continue
        }

        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : []

        const site: Site = {
          macAddress,
          siteCode,
          siteName,
          password,
          tags,
          configs: [
            {
              name: `R-${macAddress}-22`,
              type: 'stcp',
              role: 'visitor',
              server_name: `R-${macAddress}-22`,
              sk: macAddress,
              bind_addr: '0.0.0.0',
              bind_port: portCounter++
            },
            {
              name: `R-${macAddress}-3306`,
              type: 'stcp',
              role: 'visitor',
              server_name: `R-${macAddress}-3306`,
              sk: macAddress,
              bind_addr: '0.0.0.0',
              bind_port: portCounter++
            },
            {
              name: `R-${macAddress}-5000`,
              type: 'stcp',
              role: 'visitor',
              server_name: `R-${macAddress}-5000`,
              sk: macAddress,
              bind_addr: '0.0.0.0',
              bind_port: portCounter++
            }
          ]
        }
        sites.push(site)
      }
    }

    return sites
  }

  const handleBatchImport = async () => {
    if (!batchImportText.trim()) return

    setImporting(true)
    try {
      const sites = parseCSVToSites(batchImportText)
      if (sites.length === 0) {
        throw new Error('没有找到有效的站点数据')
      }
      
      await onImport(sites)
      setBatchImportText('')
      setShowBatchImport(false)
    } catch (error) {
      console.error('Batch import failed:', error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
      <DialogContent className="max-w-[90rem] w-[90%] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>批量导入站点</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="importData" className="text-sm font-semibold text-foreground">
              批量导入数据
            </Label>
            <Textarea
              id="importData"
              value={batchImportText}
              onChange={(e) => setBatchImportText(e.target.value)}
              placeholder={`请输入站点数据...

CSV格式（推荐）：站点编号,站点名称,MAC地址,密码,标签(用;分隔)
示例：DC20240102,苏州辐射站,E721EE345A2,password123,测试;在线

简单格式：站点编号 MAC地址 [站点名称]
示例：DC20240102 E721EE345A2 苏州辐射站`}
              rows={12}
              className="apple-input resize-none placeholder:text-muted-foreground placeholder:opacity-70"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowBatchImport(false)}
              className="flex-1 py-4"
            >
              取消
            </Button>
            <Button 
              onClick={handleBatchImport} 
              className="flex-1 py-4" 
              disabled={!batchImportText.trim() || importing}
            >
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
