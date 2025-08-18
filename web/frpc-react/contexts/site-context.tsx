"use client"

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { STCPManager } from '@/lib/managers/stcp-manager'
import { FrpcApiClient } from '@/lib/api/frpc-client'
import type { Site } from '@/types/site'
import { toast } from 'sonner'

// 状态接口
interface SiteState {
  sites: Site[]
  filteredSites: Site[]
  loading: boolean
  error: string | null
  editMode: boolean
  searchTerm: string
  selectedTags: string[]
  allTags: string[]
  lastSyncTime: Date | null
}

// 动作类型
type SiteAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SITES'; payload: Site[] }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SELECTED_TAGS'; payload: string[] }
  | { type: 'UPDATE_FILTERED_SITES'; payload: Site[] }
  | { type: 'SET_ALL_TAGS'; payload: string[] }
  | { type: 'SET_LAST_SYNC_TIME'; payload: Date | null }
  | { type: 'ADD_SITE'; payload: Site }
  | { type: 'UPDATE_SITE'; payload: { macAddress: string; updates: Partial<Site> } }
  | { type: 'DELETE_SITE'; payload: string }

// 初始状态
const initialState: SiteState = {
  sites: [],
  filteredSites: [],
  loading: false,
  error: null,
  editMode: false,
  searchTerm: '',
  selectedTags: [],
  allTags: [],
  lastSyncTime: null
}

// Reducer
function siteReducer(state: SiteState, action: SiteAction): SiteState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_SITES':
      return { ...state, sites: action.payload }
    
    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.payload }
    
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }
    
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.payload }
    
    case 'UPDATE_FILTERED_SITES':
      return { ...state, filteredSites: action.payload }
    
    case 'SET_ALL_TAGS':
      return { ...state, allTags: action.payload }
    
    case 'SET_LAST_SYNC_TIME':
      return { ...state, lastSyncTime: action.payload }
    
    case 'ADD_SITE':
      return { ...state, sites: [action.payload, ...state.sites] }
    
    case 'UPDATE_SITE': {
      const updatedSites = state.sites.map(site =>
        site.macAddress === action.payload.macAddress
          ? { ...site, ...action.payload.updates }
          : site
      )
      return { ...state, sites: updatedSites }
    }
    
    case 'DELETE_SITE': {
      const filteredSites = state.sites.filter(site => site.macAddress !== action.payload)
      return { ...state, sites: filteredSites }
    }
    
    default:
      return state
  }
}

// Context 类型
interface SiteContextType {
  state: SiteState
  actions: {
    loadSites: () => Promise<void>
    saveSites: () => Promise<void>
    setEditMode: (mode: boolean) => void
    setSearchTerm: (term: string) => void
    setSelectedTags: (tags: string[]) => void
    addSite: (site: Site) => Promise<void>
    updateSite: (macAddress: string, updates: Partial<Site>, silent?: boolean) => Promise<void>
    deleteSite: (macAddress: string) => Promise<void>
    importSites: (sites: Site[]) => Promise<{ success: number; errors: string[] }>
    importSitesWithDuplicateCheck: (sites: Site[]) => Promise<{ success: number; errors: string[]; duplicates: Site[] }>
    importSitesWithOverwrite: (sites: Site[], overwriteDuplicates: boolean) => Promise<{ success: number; errors: string[]; overwritten: number }>
    refreshData: () => Promise<void>
  }
}

// 创建 Context
const SiteContext = createContext<SiteContextType | undefined>(undefined)

// STCP Manager 实例
const stcpManager = new STCPManager(new FrpcApiClient())

// Provider 组件
export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(siteReducer, initialState)

  // 过滤逻辑
  const updateFilteredSites = (sites: Site[], searchTerm: string, selectedTags: string[]) => {
    let filtered = sites

    // 搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(site =>
        site.siteCode.toLowerCase().includes(term) ||
        (site.siteName || '').toLowerCase().includes(term) ||
        site.macAddress.toLowerCase().includes(term) ||
        site.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // 标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(site => {
        if (selectedTags.includes('无标签')) {
          return site.tags.length === 0
        }
        return selectedTags.some(tag => site.tags.includes(tag))
      })
    }

    dispatch({ type: 'UPDATE_FILTERED_SITES', payload: filtered })
  }

  // 当sites、searchTerm或selectedTags变化时更新过滤结果
  useEffect(() => {
    updateFilteredSites(state.sites, state.searchTerm, state.selectedTags)
  }, [state.sites, state.searchTerm, state.selectedTags])

  // 当sites变化时更新所有标签
  useEffect(() => {
    const allTags = stcpManager.getAllTags()
    dispatch({ type: 'SET_ALL_TAGS', payload: allTags })
  }, [state.sites])

  // Actions
  const actions = {
    async loadSites() {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      
      try {
        const sites = await stcpManager.loadData()
        // 倒序显示，最新添加的在前面
        const reversedSites = [...sites].reverse()
        dispatch({ type: 'SET_SITES', payload: reversedSites })
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: stcpManager.getLastSyncTime() })
        toast.success(`成功加载 ${sites.length} 个站点`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '加载站点失败'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        toast.error(errorMessage)
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    },

    async saveSites() {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      
      try {
        await stcpManager.saveData()
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() })
        toast.success('配置保存成功')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '保存配置失败'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        toast.error(errorMessage)
        throw error
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    },

    setEditMode(mode: boolean) {
      dispatch({ type: 'SET_EDIT_MODE', payload: mode })
    },

    setSearchTerm(term: string) {
      dispatch({ type: 'SET_SEARCH_TERM', payload: term })
    },

    setSelectedTags(tags: string[]) {
      dispatch({ type: 'SET_SELECTED_TAGS', payload: tags })
    },

    async addSite(site: Site) {
      try {
        stcpManager.addSite(site)
        dispatch({ type: 'ADD_SITE', payload: site })
        toast.success(`站点 ${site.siteCode} 添加成功`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '添加站点失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async updateSite(macAddress: string, updates: Partial<Site>, silent: boolean = false) {
      try {
        stcpManager.updateSite(macAddress, updates)
        dispatch({ type: 'UPDATE_SITE', payload: { macAddress, updates } })
        if (!silent) {
          toast.success('站点更新成功')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '更新站点失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async deleteSite(macAddress: string) {
      try {
        stcpManager.deleteSite(macAddress)
        dispatch({ type: 'DELETE_SITE', payload: macAddress })
        toast.success('站点删除成功')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '删除站点失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async importSites(sites: Site[]) {
      try {
        const result = stcpManager.importSites(sites)
        
        // 更新状态中的站点列表，保持倒序
        const updatedSites = stcpManager.getSites()
        const reversedSites = [...updatedSites].reverse()
        dispatch({ type: 'SET_SITES', payload: reversedSites })
        
        // 自动保存到配置文件
        if (result.success > 0) {
          await stcpManager.saveData()
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() })
          toast.success(`成功导入 ${result.success} 个站点并已保存`)
        }
        
        if (result.errors.length > 0) {
          toast.error(`导入失败: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`)
        }
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '导入失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async importSitesWithDuplicateCheck(sites: Site[]) {
      try {
        const result = stcpManager.importSitesWithDuplicateCheck(sites)
        
        // 更新状态中的站点列表，保持倒序
        const updatedSites = stcpManager.getSites()
        const reversedSites = [...updatedSites].reverse()
        dispatch({ type: 'SET_SITES', payload: reversedSites })
        
        // 自动保存到配置文件（仅在有新增数据时）
        if (result.success > 0) {
          await stcpManager.saveData()
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() })
        }
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '检测重复失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async importSitesWithOverwrite(sites: Site[], overwriteDuplicates: boolean) {
      try {
        const result = stcpManager.importSitesWithOverwrite(sites, overwriteDuplicates)
        
        // 更新状态中的站点列表，保持倒序
        const updatedSites = stcpManager.getSites()
        const reversedSites = [...updatedSites].reverse()
        dispatch({ type: 'SET_SITES', payload: reversedSites })
        
        // 自动保存到配置文件（有数据变更时）
        if (result.success > 0 || result.overwritten > 0) {
          await stcpManager.saveData()
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() })
        }
        
        let message = ''
        if (result.success > 0) {
          message += `新增 ${result.success} 个站点`
        }
        if (result.overwritten > 0) {
          message += `${message ? '，' : ''}覆盖 ${result.overwritten} 个站点`
        }
        
        if (message) {
          toast.success(`${message}并已保存`)
        }
        
        if (result.errors.length > 0) {
          toast.error(`导入失败: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`)
        }
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '导入失败'
        toast.error(errorMessage)
        throw error
      }
    },

    async refreshData() {
      await actions.loadSites()
    }
  }

  return (
    <SiteContext.Provider value={{ state, actions }}>
      {children}
    </SiteContext.Provider>
  )
}

// Hook
export function useSiteContext() {
  const context = useContext(SiteContext)
  if (context === undefined) {
    throw new Error('useSiteContext must be used within a SiteProvider')
  }
  return context
}