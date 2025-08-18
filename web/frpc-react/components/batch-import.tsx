"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Upload, AlertTriangle } from "lucide-react"
import type { Site } from "@/types/site"
import { useSiteContext } from "@/contexts/site-context"

interface BatchImportProps {
  showBatchImport: boolean
  setShowBatchImport: (show: boolean) => void
}

const FIELD_OPTIONS = [
  { value: "unselected", label: "选择字段..." },
  { value: "siteCode", label: "站点编号" },
  { value: "siteName", label: "站点名称" },
  { value: "macAddress", label: "MAC地址" },
  { value: "password", label: "密码" }
]

const REQUIRED_FIELDS = ["macAddress"]

export function BatchImport({ showBatchImport, setShowBatchImport }: BatchImportProps) {
  const [batchImportText, setBatchImportText] = useState("")
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateSites, setDuplicateSites] = useState<Site[]>([])
  const [pendingSites, setPendingSites] = useState<Site[]>([])
  const [unifiedTags, setUnifiedTags] = useState("")
  const { toast } = useToast()
  const { state, actions } = useSiteContext()

  const exampleData = `苏州辐射站|DC001|E721EE345A01|pass123|测试,在线,重要
南京监测点|DC002|E721EE345A02||生产,稳定
无锡数据中心||E721EE345A03|pass789|重要,维护,关键,核心
常州分站|DC004|E721EE345A04|pass000|`

  // 智能检测分隔符并解析数据
  const parsedData = useMemo(() => {
    if (!batchImportText.trim()) return []
    
    const lines = batchImportText.trim().split('\n')
    if (lines.length === 0) return []
    
    // 分隔符优先级：| > 制表符 > 空格
    const separators = [
      { char: '|', name: '竖线' },
      { char: '\t', name: '制表符' },
      { char: ' ', name: '空格' }
    ]
    
    let bestSeparator = ' '
    let maxScore = 0
    
    // 检测最佳分隔符
    for (const sep of separators) {
      let score = 0
      let totalColumns = 0
      const columnCounts: number[] = []
      
      // 分析每一行的列数
      for (const line of lines) {
        if (line.trim()) {
          // 使用正则表达式分割，保留空列
          let parts: string[]
          if (sep.char === ' ') {
            // 对于空格，需要处理多个连续空格的情况
            parts = line.split(/\s+/).filter(part => part.length > 0)
          } else {
            // 对于|和制表符，直接分割保留空列
            parts = line.split(sep.char)
          }
          
          const columnCount = parts.length
          columnCounts.push(columnCount)
          totalColumns += columnCount
        }
      }
      
      if (columnCounts.length > 0) {
        const avgColumns = totalColumns / columnCounts.length
        const maxCols = Math.max(...columnCounts)
        const minCols = Math.min(...columnCounts)
        
        // 评分：优先考虑列数一致性和分隔符优先级
        if (maxCols > 1) {
          // 一致性评分：差异越小分数越高
          const consistency = 1 - (maxCols - minCols) / maxCols
          // 优先级评分：| > \t > 空格
          const priority = separators.length - separators.findIndex(s => s.char === sep.char)
          
          score = consistency * 100 + priority * 10 + avgColumns
          
          if (score > maxScore) {
            maxScore = score
            bestSeparator = sep.char
          }
        }
      }
    }
    
    // 使用最佳分隔符解析数据
    return lines.map(line => {
      if (!line.trim()) return []
      
      let parts: string[]
      if (bestSeparator === ' ') {
        // 空格分隔：合并多个连续空格，但保留所有非空部分
        parts = line.split(/\s+/).filter(part => part.length > 0)
      } else {
        // 其他分隔符：保留空列
        parts = line.split(bestSeparator)
      }
      
      return parts.map(cell => cell.trim())
    }).filter(row => row.length > 0 && row.some(cell => cell.length > 0))
  }, [batchImportText])

  // 获取最大列数
  const maxColumns = useMemo(() => {
    return Math.max(0, ...parsedData.map(row => row.length))
  }, [parsedData])

  // 智能默认列映射
  const defaultColumnMappings = useMemo(() => {
    if (maxColumns === 0) return {}
    
    const defaultMapping: Record<number, string> = {}
    const fieldOrder = ["siteName", "siteCode", "macAddress", "password"]
    
    for (let i = 0; i < Math.min(maxColumns, fieldOrder.length); i++) {
      defaultMapping[i] = fieldOrder[i]
    }
    
    // 超过4列的不映射
    return defaultMapping
  }, [maxColumns])

  // 应用默认映射（如果用户没有设置）
  const effectiveColumnMappings = useMemo(() => {
    const effective = { ...defaultColumnMappings }
    
    // 用户的映射会覆盖默认映射
    Object.entries(columnMappings).forEach(([colIndex, fieldName]) => {
      if (fieldName) {
        effective[parseInt(colIndex)] = fieldName
      }
    })
    
    return effective
  }, [defaultColumnMappings, columnMappings])

  // 验证映射是否完整
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    const mappedFields = Object.values(effectiveColumnMappings).filter(field => field && field !== "unselected")
    
    // 检查必填字段
    for (const required of REQUIRED_FIELDS) {
      if (!mappedFields.includes(required)) {
        const fieldLabel = FIELD_OPTIONS.find(opt => opt.value === required)?.label
        errors.push(`缺少必填字段：${fieldLabel}`)
      }
    }
    
    // 检查重复映射
    const duplicateFields = mappedFields.filter((field, index) => 
      mappedFields.indexOf(field) !== index
    )
    if (duplicateFields.length > 0) {
      errors.push(`重复映射字段：${duplicateFields.join(', ')}`)
    }
    
    return errors
  }, [effectiveColumnMappings])

  const handleColumnMappingChange = (columnIndex: number, fieldValue: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [columnIndex]: fieldValue
    }))
  }


  // 获取每列可用的选项（防止重复映射）
  const getAvailableOptionsForColumn = (currentColumnIndex: number) => {
    const usedFields = Object.entries(effectiveColumnMappings)
      .filter(([colIndex, fieldName]) => 
        parseInt(colIndex) !== currentColumnIndex && 
        fieldName && 
        fieldName !== "unselected"
      )
      .map(([, fieldName]) => fieldName)

    return FIELD_OPTIONS.filter(option => 
      option.value === "unselected" || 
      !usedFields.includes(option.value)
    )
  }

  const generateSitesFromMapping = (): Site[] => {
    const sites: Site[] = []

    for (const row of parsedData) {
      try {
        const siteData: any = {}
        
        // 根据映射提取数据
        Object.entries(effectiveColumnMappings).forEach(([colIndex, fieldName]) => {
          const cellValue = row[parseInt(colIndex)] || ""
          
          if (fieldName && fieldName !== "unselected") {
            siteData[fieldName] = cellValue
          }
        })

        // 添加统一标签
        siteData.tags = []
        if (unifiedTags.trim()) {
          const unifiedTagsList = unifiedTags.split(',').map(tag => tag.trim()).filter(tag => tag)
          siteData.tags = unifiedTagsList
        }

        // 验证必填字段
        if (!siteData.macAddress) {
          continue
        }

        // 创建临时站点对象以使用STCPManager的端口分配
        const tempSite: Site = {
          macAddress: siteData.macAddress,
          siteCode: siteData.siteCode,
          siteName: siteData.siteName,
          password: siteData.password || '',
          tags: siteData.tags || [],
          configs: []
        }

        // 生成代理配置 - 使用actions获取当前站点状态来正确分配端口
        const configs = [
          {
            name: `E-${siteData.macAddress}-22`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-22`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: getAllocatedPort(sites)
          },
          {
            name: `E-${siteData.macAddress}-3306`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-3306`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: getAllocatedPort(sites)
          },
          {
            name: `E-${siteData.macAddress}-5000`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-5000`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: getAllocatedPort(sites)
          }
        ]

        const site: Site = {
          ...tempSite,
          configs
        }

        sites.push(site)
      } catch (error) {
        console.warn('Failed to process row:', row, error)
      }
    }

    return sites
  }

  // 获取下一个可用端口的辅助函数
  const getAllocatedPort = (currentSites: Site[]): number => {
    const usedPorts = new Set<number>()
    
    // 收集现有站点的已使用端口
    const existingSites = state.sites || []
    existingSites.forEach(site => {
      site.configs.forEach(config => {
        usedPorts.add(config.bind_port)
      })
    })
    
    // 收集当前批次中已分配的端口
    currentSites.forEach(site => {
      site.configs.forEach(config => {
        usedPorts.add(config.bind_port)
      })
    })

    // 从18000开始分配新端口
    let port = 18000
    while (usedPorts.has(port)) {
      port++
    }

    return port
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "映射错误",
        description: validationErrors[0],
        variant: "destructive"
      })
      return
    }

    const sites = generateSitesFromMapping()
    if (sites.length === 0) {
      toast({
        title: "导入失败",
        description: "没有找到有效的站点数据",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    try {
      // 先检测重复数据
      const result = await actions.importSitesWithDuplicateCheck(sites)
      
      if (result.duplicates.length > 0) {
        // 有重复数据，显示确认对话框
        setDuplicateSites(result.duplicates)
        setPendingSites(sites)
        setShowDuplicateDialog(true)
        setImporting(false)
      } else {
        // 没有重复数据，直接导入成功
        if (result.success > 0) {
          toast({
            title: "导入成功",
            description: `成功导入 ${result.success} 个站点`
          })
        }
        
        resetStates()
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
      setImporting(false)
    }
  }

  const handleDuplicateConfirm = async (overwrite: boolean) => {
    setShowDuplicateDialog(false)
    setImporting(true)
    
    try {
      const result = await actions.importSitesWithOverwrite(pendingSites, overwrite)
      
      let message = ''
      if (result.success > 0) {
        message += `新增 ${result.success} 个站点`
      }
      if (result.overwritten > 0) {
        message += `${message ? '，' : ''}覆盖 ${result.overwritten} 个站点`
      }
      
      if (message) {
        toast({
          title: "导入完成",
          description: message
        })
      }
      
      if (result.errors.length > 0) {
        toast({
          title: "部分导入失败",
          description: result.errors.slice(0, 3).join('; '),
          variant: "destructive"
        })
      }
      
      resetStates()
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  const resetStates = () => {
    setBatchImportText('')
    setColumnMappings({})
    setDuplicateSites([])
    setPendingSites([])
    setUnifiedTags('')
    setShowBatchImport(false)
  }

  const loadExampleData = () => {
    setBatchImportText(exampleData)
    setColumnMappings({})
    toast({
      title: "示例数据已加载",
      description: "请为每列选择对应的字段"
    })
  }

  return (
    <>
      <Dialog open={showBatchImport} onOpenChange={setShowBatchImport}>
        <DialogContent className="max-w-[90vw] w-[90%] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量导入站点
            </DialogTitle>
          </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* 数据输入区域 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="importData" className="text-sm font-semibold">
导入数据
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={loadExampleData}
                className="text-xs"
              >
                加载示例
              </Button>
            </div>
            <Textarea
              id="importData"
              value={batchImportText}
              onChange={(e) => setBatchImportText(e.target.value)}
              placeholder="请粘贴数据，每行一个站点，支持 空格 制表符 竖线 分隔，空列可留空..."
              rows={6}
              className="apple-input resize-none font-mono text-sm"
            />
          </div>

          {/* 统一标签输入 */}
          <div className="space-y-2">
            <Label htmlFor="unifiedTags" className="text-sm font-semibold">
              统一标签 (可选)
            </Label>
            <Input
              id="unifiedTags"
              value={unifiedTags}
              onChange={(e) => setUnifiedTags(e.target.value)}
              placeholder="为所有导入的站点添加统一标签，多个标签用逗号分隔..."
              className="apple-input text-sm"
            />
            <p className="text-xs text-muted-foreground">
              这些标签将会添加到所有导入的站点中，如：批量导入,2024年度,测试环境
            </p>
          </div>

          {/* 列映射表格 */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">列映射</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Array.from({ length: maxColumns }, (_, index) => (
                          <TableHead key={index} className="min-w-[150px]">
                            <Select
                              value={effectiveColumnMappings[index] || "unselected"}
                              onValueChange={(value) => handleColumnMappingChange(index, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="选择字段" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableOptionsForColumn(index).map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Array.from({ length: maxColumns }, (_, colIndex) => (
                            <TableCell key={colIndex} className="text-xs font-mono">
                              {row[colIndex] || ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* 验证错误提示 */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 操作按钮 - 固定在底部 */}
        <div className="flex-shrink-0 flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setShowBatchImport(false)}
            className="flex-1"
          >
            取消
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!parsedData.length || validationErrors.length > 0 || importing}
            className="flex-1"
          >
            {importing ? '导入中...' : `导入 ${parsedData.length} 个站点`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* 重复数据确认对话框 */}
    <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            发现重复数据
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              发现 <span className="font-semibold">{duplicateSites.length}</span> 个重复的MAC地址，请选择处理方式：
            </AlertDescription>
          </Alert>
          
          {duplicateSites.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">重复的MAC地址：</Label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {duplicateSites.map((site, index) => (
                  <div key={index} className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                    {site.macAddress} {site.siteName && `(${site.siteName})`}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleDuplicateConfirm(false)}
              disabled={importing}
              className="flex-1"
            >
              跳过重复数据
            </Button>
            <Button 
              onClick={() => handleDuplicateConfirm(true)}
              disabled={importing}
              className="flex-1"
            >
              覆盖全部重复
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}