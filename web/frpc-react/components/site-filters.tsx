"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Filter, FileText, Plus, Loader2, Edit, X } from "lucide-react"
import type { Site } from "@/types/site"

interface SiteFiltersProps {
  sites: Site[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  showTagFilter: boolean
  setShowTagFilter: (show: boolean) => void
  filteredSites: Site[]
  editMode: boolean
  loading: boolean
  onEditModeChange: (editMode: boolean) => void
  onSaveChanges: () => void
  onShowBatchImport: () => void
  onShowConfigEditor: () => void
}

export function SiteFilters({
  sites,
  searchTerm,
  setSearchTerm,
  selectedTags,
  setSelectedTags,
  showTagFilter,
  setShowTagFilter,
  filteredSites,
  editMode,
  loading,
  onEditModeChange,
  onSaveChanges,
  onShowBatchImport,
  onShowConfigEditor,
}: SiteFiltersProps) {
  // Get all available tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    sites.forEach((site) => {
      site.tags.forEach((tag) => tagSet.add(tag))
    })
    return ["无标签", ...Array.from(tagSet)]
  }, [sites])

  return (
    <>
      {/* Search and Filter */}
      <Card className="glass-effect border-0 rounded-3xl card-hover">
        <CardContent className="p-8">
          <div className="flex flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="搜索站点编号、名称或标签"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-12 apple-input h-14 text-base placeholder:text-muted-foreground"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1 rounded-full hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setShowTagFilter(!showTagFilter)}
                    className="text-secondary-foreground hover:text-primary hover:bg-accent hover:border-primary border-border rounded-2xl w-12 h-12 p-0 transition-all duration-300"
                  >
                    <Filter className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>标签</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* 右侧悬浮按钮组 - 苹果风格 */}
      {!editMode ? (
        <div className="fixed right-[10px] top-1/2 -translate-y-1/2 z-50 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-xl border border-border/30 rounded-3xl p-3 shadow-2xl shadow-black/10">
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={onShowBatchImport} 
                      className="bg-success hover:bg-success/90 text-success-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-success/25"
                      disabled={loading}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>导入</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => onEditModeChange(true)} 
                      className="bg-background hover:bg-accent text-foreground border border-border rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit className="w-5 h-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>修改</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed right-[10px] top-1/2 -translate-y-1/2 z-50 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-xl border border-border/30 rounded-3xl p-3 shadow-2xl shadow-black/10">
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={onShowConfigEditor} 
                      className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-warning/25"
                      disabled={loading}
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>文本模式</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={onSaveChanges} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-primary/25"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{loading ? '保存中...' : '保存'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => onEditModeChange(false)} 
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>取消</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {/* 移动端底部按钮栏 */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-xl border border-border/30 rounded-3xl p-3 shadow-2xl shadow-black/10">
          <div className="flex justify-center gap-3">
            {!editMode ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onShowBatchImport} 
                        className="bg-success hover:bg-success/90 text-success-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-success/25"
                        disabled={loading}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>导入</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => onEditModeChange(true)} 
                        className="bg-background hover:bg-accent text-foreground border border-border rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit className="w-5 h-5" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>修改</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onShowConfigEditor} 
                        className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-warning/25"
                        disabled={loading}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>文本模式</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onSaveChanges} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50 shadow-lg shadow-primary/25"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{loading ? '保存中...' : '保存'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => onEditModeChange(false)} 
                        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>取消</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tag Filter Panel */}
      {showTagFilter && (
        <Card className="glass-effect border-0 rounded-3xl animated-element card-hover">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  const siteCount =
                    tag === "无标签"
                      ? sites.filter((s) => s.tags.length === 0).length
                      : sites.filter((s) => s.tags.includes(tag)).length
                  return (
                    <Button
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(selectedTags.filter((t) => t !== tag))
                        } else {
                          setSelectedTags([...selectedTags, tag])
                        }
                      }}
                      className={`rounded-full px-5 py-2.5 text-sm font-medium animated-element transition-all duration-300 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-0 scale-105 shadow-lg shadow-primary/25"
                          : "bg-accent hover:bg-accent/80 text-accent-foreground border border-border scale-100"
                      }`}
                    >
                      {tag} ({siteCount})
                    </Button>
                  )
                })}
              </div>
              {selectedTags.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="caption text-muted-foreground">
                      已选择 {selectedTags.length} 个标签，匹配 {filteredSites.length} 个站点
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="border-border text-muted-foreground bg-background hover:bg-accent hover:text-accent-foreground rounded-2xl px-4 py-2"
                    >
                      清除
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}