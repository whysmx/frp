"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="搜索站点编号、名称或标签"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 border-0 bg-slate-100/60 rounded-2xl h-14 text-base placeholder:text-slate-400 focus:bg-white focus:shadow-lg transition-all duration-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowTagFilter(!showTagFilter)}
              className="border-slate-200 text-slate-600 bg-white/90 hover:bg-white hover:shadow-lg rounded-2xl px-6 h-14 min-w-[140px] animated-element backdrop-blur-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              标签筛选
              {showTagFilter ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                      className={`rounded-full px-5 py-2.5 text-sm font-medium animated-element transition-all duration-200 ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 scale-105 shadow-lg shadow-blue-500/25"
                          : "bg-slate-100/60 hover:bg-white hover:shadow-lg text-slate-600 border-slate-200 scale-100 backdrop-blur-sm"
                      }`}
                    >
                      {tag} ({siteCount})
                    </Button>
                  )
                })}
              </div>
              {selectedTags.length > 0 && (
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="caption text-slate-500">
                      已选择 {selectedTags.length} 个标签，匹配 {filteredSites.length} 个站点
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="border-slate-200 text-slate-500 bg-white/90 hover:bg-white hover:shadow-md rounded-xl px-4 py-2 backdrop-blur-sm"
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
