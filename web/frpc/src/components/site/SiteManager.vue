<template>
    <div class="site-manager">
        <!-- Header Section -->
        <el-row class="header-section" :gutter="20">
            <el-col :span="12">
                <h2>站点管理</h2>
                <p class="subtitle">STCP代理配置站点管理</p>
            </el-col>
            <el-col :span="12" class="header-actions">
                <el-button 
                    :type="editMode ? 'success' : 'primary'" 
                    :icon="editMode ? 'el-icon-check' : 'el-icon-edit'"
                    @click="toggleEditMode"
                >
                    {{ editMode ? '完成' : '编辑' }}
                </el-button>
                <el-button 
                    v-if="editMode" 
                    type="info" 
                    icon="el-icon-upload2"
                    @click="showBatchImport = true"
                >
                    批量导入
                </el-button>
                <el-button 
                    v-if="editMode" 
                    type="warning" 
                    icon="el-icon-document"
                    @click="showConfigEditor = true"
                >
                    配置文件
                </el-button>
                <el-button 
                    type="primary" 
                    icon="el-icon-refresh"
                    @click="loadData"
                    :loading="loading"
                >
                    刷新
                </el-button>
            </el-col>
        </el-row>

        <!-- Search and Filter Section -->
        <el-row class="filter-section" :gutter="20">
            <el-col :span="8">
                <el-input
                    v-model="searchKeyword"
                    placeholder="搜索站点编号、名称、标签..."
                    prefix-icon="el-icon-search"
                    clearable
                    @input="handleSearch"
                />
            </el-col>
            <el-col :span="4">
                <el-button 
                    :type="showTagFilter ? 'primary' : ''"
                    @click="showTagFilter = !showTagFilter"
                    icon="el-icon-collection-tag"
                >
                    标签筛选 ({{ selectedTags.length }})
                </el-button>
            </el-col>
            <el-col :span="12" class="filter-stats">
                <span class="stats-text">
                    显示 {{ filteredSites.length }} / {{ sites.length }} 个站点
                </span>
            </el-col>
        </el-row>

        <!-- Tag Filter Panel -->
        <TagFilter
            v-if="showTagFilter"
            :all-tags="allTags"
            :selected-tags="selectedTags"
            @tag-change="handleTagChange"
            @clear-filters="clearTagFilters"
        />

        <!-- Site List -->
        <SiteList
            :sites="filteredSites"
            :edit-mode="editMode"
            :loading="loading"
            @edit-site="handleEditSite"
            @delete-site="handleDeleteSite"
            @edit-configs="handleEditConfigs"
            @quick-access="handleQuickAccess"
        />

        <!-- Site Edit Form Dialog -->
        <el-dialog
            title="编辑站点信息"
            :visible.sync="showEditDialog"
            width="600px"
        >
            <SiteEditForm
                v-if="showEditDialog"
                :site="currentEditSite"
                :all-tags="allTags"
                @save="handleSaveSite"
                @cancel="showEditDialog = false"
            />
        </el-dialog>

        <!-- Batch Import Dialog -->
        <BatchImport
            :visible.sync="showBatchImport"
            @import-success="handleBatchImportSuccess"
        />

        <!-- Config File Editor Dialog -->
        <ConfigFileEditor
            :visible.sync="showConfigEditor"
            :config-content="rawConfigContent"
            @save-config="handleSaveConfig"
        />

        <!-- Proxy Config Manager Dialog -->
        <ProxyConfigManager
            :visible.sync="showProxyConfigDialog"
            :site="currentConfigSite"
            @save-configs="handleSaveConfigs"
        />
    </div>
</template>

<script>
import STCPManager from '../../utils/STCPManager.js';
import TagManager from '../../utils/TagManager.js';
import QuickAccessManager from '../../utils/QuickAccessManager.js';

import SiteList from './SiteList.vue';
import SiteEditForm from './SiteEditForm.vue';
import TagFilter from './TagFilter.vue';
import BatchImport from './BatchImport.vue';
import ConfigFileEditor from './ConfigFileEditor.vue';
import ProxyConfigManager from './ProxyConfigManager.vue';

export default {
    name: 'SiteManager',
    components: {
        SiteList,
        SiteEditForm,
        TagFilter,
        BatchImport,
        ConfigFileEditor,
        ProxyConfigManager
    },
    data() {
        return {
            // Core data
            stcpManager: null,
            sites: [],
            filteredSites: [],
            allTags: [],
            rawConfigContent: '',
            
            // UI state
            loading: false,
            editMode: false,
            showTagFilter: false,
            showEditDialog: false,
            showBatchImport: false,
            showConfigEditor: false,
            showProxyConfigDialog: false,
            
            // Search and filter
            searchKeyword: '',
            selectedTags: [],
            
            // Current editing
            currentEditSite: null,
            currentConfigSite: null,
            
            // Search debounce
            searchTimer: null
        };
    },
    async created() {
        this.stcpManager = new STCPManager();
        await this.loadData();
    },
    beforeDestroy() {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
    },
    methods: {
        /**
         * Load data from API
         */
        async loadData() {
            this.loading = true;
            try {
                await this.stcpManager.loadConfig();
                this.sites = this.stcpManager.getSites();
                this.allTags = TagManager.getAllTags(this.sites);
                this.applyFilters();
                
                this.$message.success('数据加载成功');
            } catch (error) {
                console.error('Failed to load data:', error);
                this.$message.error('数据加载失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        /**
         * Toggle edit mode
         */
        toggleEditMode() {
            this.editMode = !this.editMode;
            if (!this.editMode) {
                // Exiting edit mode, save changes
                this.saveChanges();
            }
        },

        /**
         * Save all changes
         */
        async saveChanges() {
            if (!this.stcpManager) return;
            
            this.loading = true;
            try {
                await this.stcpManager.saveConfig();
                this.$message.success('配置保存成功');
            } catch (error) {
                console.error('Failed to save configuration:', error);
                this.$message.error('配置保存失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        /**
         * Handle search input
         */
        handleSearch() {
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            
            this.searchTimer = setTimeout(() => {
                this.applyFilters();
            }, 300);
        },

        /**
         * Handle tag filter change
         */
        handleTagChange(selectedTags) {
            this.selectedTags = selectedTags;
            this.applyFilters();
        },

        /**
         * Clear tag filters
         */
        clearTagFilters() {
            this.selectedTags = [];
            this.applyFilters();
        },

        /**
         * Apply search and tag filters
         */
        applyFilters() {
            let filtered = this.sites;

            // Apply search filter
            if (this.searchKeyword) {
                filtered = this.stcpManager.searchSites(this.searchKeyword);
            }

            // Apply tag filter
            if (this.selectedTags.length > 0) {
                filtered = TagManager.filterSitesByTags(filtered, this.selectedTags, 'OR');
            }

            this.filteredSites = filtered;
        },

        /**
         * Handle edit site
         */
        handleEditSite(site) {
            this.currentEditSite = Object.assign({}, site);
            this.showEditDialog = true;
        },

        /**
         * Handle save site
         */
        async handleSaveSite(siteData) {
            try {
                await this.stcpManager.updateSite(siteData.macAddress, siteData);
                
                // Update local data
                const siteIndex = this.sites.findIndex(s => s.macAddress === siteData.macAddress);
                if (siteIndex !== -1) {
                    Object.assign(this.sites[siteIndex], siteData);
                }
                
                this.allTags = TagManager.getAllTags(this.sites);
                this.applyFilters();
                this.showEditDialog = false;
                
                this.$message.success('站点信息更新成功');
            } catch (error) {
                console.error('Failed to update site:', error);
                this.$message.error('站点更新失败: ' + error.message);
            }
        },

        /**
         * Handle delete site
         */
        handleDeleteSite(site) {
            this.$confirm(`确定要删除站点 "${site.siteName}" 及其所有配置吗？`, '删除确认', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    await this.stcpManager.deleteSite(site.macAddress);
                    
                    // Remove from local data
                    const siteIndex = this.sites.findIndex(s => s.macAddress === site.macAddress);
                    if (siteIndex !== -1) {
                        this.sites.splice(siteIndex, 1);
                    }
                    
                    this.allTags = TagManager.getAllTags(this.sites);
                    this.applyFilters();
                    
                    this.$message.success('站点删除成功');
                } catch (error) {
                    console.error('Failed to delete site:', error);
                    this.$message.error('站点删除失败: ' + error.message);
                }
            }).catch(() => {
                this.$message.info('已取消删除');
            });
        },

        /**
         * Handle edit proxy configurations
         */
        handleEditConfigs(site) {
            this.currentConfigSite = site;
            this.showProxyConfigDialog = true;
        },

        /**
         * Handle save proxy configurations
         */
        handleSaveConfigs() {
            // Refresh data after config changes
            this.loadData();
            this.showProxyConfigDialog = false;
        },

        /**
         * Handle quick access actions
         */
        async handleQuickAccess(site, action) {
            const quickInfo = QuickAccessManager.generateQuickAccessInfo(site);
            
            switch (action) {
                case 'web':
                    if (quickInfo.webUrl) {
                        QuickAccessManager.openUrl(quickInfo.webUrl);
                    } else {
                        this.$message.warning('该站点没有配置Web服务(端口5000)');
                    }
                    break;
                    
                case 'ssh':
                    if (quickInfo.sshCommand) {
                        const success = await QuickAccessManager.copyToClipboard(quickInfo.sshCommand);
                        if (success) {
                            this.$message.success('SSH命令已复制到剪贴板');
                        } else {
                            this.$message.error('复制失败');
                        }
                    } else {
                        this.$message.warning('该站点没有配置SSH服务(端口22)');
                    }
                    break;
                    
                case 'mysql':
                    if (quickInfo.mysqlCommand) {
                        const success = await QuickAccessManager.copyToClipboard(quickInfo.mysqlCommand);
                        if (success) {
                            this.$message.success('MySQL命令已复制到剪贴板');
                        } else {
                            this.$message.error('复制失败');
                        }
                    } else {
                        this.$message.warning('该站点没有配置MySQL服务(端口3306)');
                    }
                    break;
                    
                case 'bs':
                    this.$message.info('BS功能暂未实现');
                    break;
            }
        },

        /**
         * Handle batch import success
         */
        handleBatchImportSuccess(result) {
            this.$message.success(`批量导入完成: 成功 ${result.success.length} 个，失败 ${result.failed.length} 个`);
            this.loadData(); // Reload data
            this.showBatchImport = false;
        },

        /**
         * Handle save config file
         */
        async handleSaveConfig(configContent) {
            this.loading = true;
            try {
                // Save directly through API
                const response = await fetch('/api/config', {
                    credentials: 'include',
                    method: 'PUT',
                    body: configContent,
                });

                if (!response.ok) {
                    throw new Error('Failed to save configuration');
                }

                // Reload configuration
                await fetch('/api/reload', { credentials: 'include' });
                
                this.showConfigEditor = false;
                await this.loadData();
                
                this.$message.success('配置文件保存成功');
            } catch (error) {
                console.error('Failed to save config file:', error);
                this.$message.error('配置文件保存失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>

<style scoped>
.site-manager {
    padding: 20px;
}

.header-section {
    margin-bottom: 20px;
    align-items: center;
}

.header-section h2 {
    margin: 0;
    color: #303133;
}

.subtitle {
    color: #909399;
    margin: 5px 0 0 0;
    font-size: 14px;
}

.header-actions {
    text-align: right;
}

.header-actions .el-button {
    margin-left: 10px;
}

.filter-section {
    margin-bottom: 20px;
    align-items: center;
}

.filter-stats {
    text-align: right;
}

.stats-text {
    color: #909399;
    font-size: 14px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .header-section,
    .filter-section {
        flex-direction: column;
    }
    
    .header-actions,
    .filter-stats {
        text-align: left;
        margin-top: 10px;
    }
    
    .header-actions .el-button {
        margin: 5px 5px 5px 0;
    }
}
</style>