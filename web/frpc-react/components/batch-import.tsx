"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
  { value: "password", label: "密码" },
  { value: "tags", label: "标签" },
  { value: "ignore", label: "忽略此列" }
]

const REQUIRED_FIELDS = ["macAddress"]

export function BatchImport({ showBatchImport, setShowBatchImport }: BatchImportProps) {
  const [batchImportText, setBatchImportText] = useState("")
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateSites, setDuplicateSites] = useState<Site[]>([])
  const [pendingSites, setPendingSites] = useState<Site[]>([])
  const { toast } = useToast()
  const { actions } = useSiteContext()

  const exampleData = `苏州辐射站|DC001|E721EE345A01|pass123|测试,在线,重要
南京监测点|DC002|E721EE345A02|pass456|生产,稳定
无锡数据中心|DC003|E721EE345A03|pass789|重要,维护,关键,核心`

  // 智能检测分隔符并解析数据
  const parsedData = useMemo(() => {
    if (!batchImportText.trim()) return []
    
    const lines = batchImportText.trim().split('\n')
    if (lines.length === 0) return []
    
    // 分隔符优先级：| > 制表符 > 空格（移除逗号，因为标签内部使用逗号）
    const separators = ['|', '\t', ' ']
    let bestSeparator = ' '
    let maxColumns = 0
    
    // 检测最佳分隔符（基于第一行和整体一致性）
    for (const sep of separators) {
      const firstRowColumns = lines[0].split(sep).length
      if (firstRowColumns > 1) {
        // 检查所有行是否大致一致（允许轻微差异）
        const allColumnCounts = lines.map(line => line.split(sep).length)
        const avgColumns = allColumnCounts.reduce((a, b) => a + b, 0) / allColumnCounts.length
        
        if (firstRowColumns >= maxColumns && Math.abs(firstRowColumns - avgColumns) < 1) {
          bestSeparator = sep
          maxColumns = firstRowColumns
        }
      }
    }
    
    return lines.map(line => 
      line.split(bestSeparator).map(cell => cell.trim())
    ).filter(row => row.some(cell => cell.length > 0))
  }, [batchImportText])

  // 获取最大列数
  const maxColumns = useMemo(() => {
    return Math.max(0, ...parsedData.map(row => row.length))
  }, [parsedData])

  // 智能默认列映射
  const defaultColumnMappings = useMemo(() => {
    if (maxColumns === 0) return {}
    
    const defaultMapping: Record<number, string> = {}
    const fieldOrder = ["siteName", "siteCode", "macAddress", "password", "tags"]
    
    for (let i = 0; i < Math.min(maxColumns, fieldOrder.length); i++) {
      defaultMapping[i] = fieldOrder[i]
    }
    
    // 超过5列的都映射为标签
    for (let i = fieldOrder.length; i < maxColumns; i++) {
      defaultMapping[i] = "tags"
    }
    
    return defaultMapping
  }, [maxColumns])

  // 应用默认映射（如果用户没有设置）
  const effectiveColumnMappings = useMemo(() => {
    const effective = { ...defaultColumnMappings }
    
    // 用户的映射会覆盖默认映射
    Object.entries(columnMappings).forEach(([colIndex, fieldName]) => {
      if (fieldName && fieldName !== "unselected") {
        effective[parseInt(colIndex)] = fieldName
      }
    })
    
    return effective
  }, [defaultColumnMappings, columnMappings])

  // 验证映射是否完整
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    const mappedFields = Object.values(effectiveColumnMappings).filter(field => field && field !== "ignore" && field !== "unselected")
    
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
        fieldName !== "ignore" && 
        fieldName !== "unselected" &&
        fieldName !== "tags" // 标签可以重复使用
      )
      .map(([, fieldName]) => fieldName)

    return FIELD_OPTIONS.filter(option => 
      option.value === "unselected" || 
      option.value === "ignore" || 
      option.value === "tags" || 
      !usedFields.includes(option.value)
    )
  }

  const generateSitesFromMapping = (): Site[] => {
    const sites: Site[] = []
    let portCounter = 18015

    for (const row of parsedData) {
      try {
        const siteData: any = {}
        
        // 根据映射提取数据
        Object.entries(effectiveColumnMappings).forEach(([colIndex, fieldName]) => {
          const cellValue = row[parseInt(colIndex)] || ""
          
          if (fieldName === "tags") {
            // 处理标签，支持多个标签用逗号分隔
            const existingTags = siteData.tags || []
            const newTags = cellValue ? cellValue.split(',').map(tag => tag.trim()).filter(tag => tag) : []
            siteData.tags = [...existingTags, ...newTags]
          } else if (fieldName && fieldName !== "ignore" && fieldName !== "unselected") {
            siteData[fieldName] = cellValue
          }
        })

        // 验证必填字段
        if (!siteData.macAddress) {
          continue
        }

        // 生成代理配置
        const configs = [
          {
            name: `E-${siteData.macAddress}-22`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-22`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: portCounter++
          },
          {
            name: `E-${siteData.macAddress}-3306`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-3306`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: portCounter++
          },
          {
            name: `E-${siteData.macAddress}-5000`,
            type: 'stcp',
            role: 'visitor',
            server_name: `E-${siteData.macAddress}-5000`,
            sk: siteData.macAddress,
            bind_addr: '0.0.0.0',
            bind_port: portCounter++
          }
        ]

        const site: Site = {
          macAddress: siteData.macAddress,
          siteCode: siteData.siteCode,
          siteName: siteData.siteName,
          password: siteData.password || '',
          tags: siteData.tags || [],
          configs
        }

        sites.push(site)
      } catch (error) {
        console.warn('Failed to process row:', row, error)
      }
    }

    return sites
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
        <DialogContent className="max-w-[90vw] w-[90%] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量导入站点
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-4">
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
              placeholder="请粘贴数据，每行一个站点，支持 竖线 制表符 空格 分隔，标签内用逗号分隔..."
              rows={6}
              className="apple-input resize-none font-mono text-sm"
            />
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

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
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