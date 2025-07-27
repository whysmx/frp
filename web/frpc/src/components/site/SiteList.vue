<template>
    <div class="site-list">
        <el-table
            :data="sites"
            v-loading="loading"
            stripe
            border
            style="width: 100%"
            :row-class-name="getRowClassName"
        >
            <!-- Site Code Column -->
            <el-table-column
                prop="siteCode"
                label="站点编号"
                width="120"
                sortable
            >
                <template slot-scope="scope">
                    <span class="site-code">{{ scope.row.siteCode }}</span>
                </template>
            </el-table-column>

            <!-- Site Name Column -->
            <el-table-column
                prop="siteName"
                label="站点名称"
                min-width="150"
                sortable
            >
                <template slot-scope="scope">
                    <span class="site-name">{{ scope.row.siteName }}</span>
                </template>
            </el-table-column>

            <!-- Password Column -->
            <el-table-column
                label="密码"
                width="120"
                v-if="editMode"
            >
                <template slot-scope="scope">
                    <span class="password-field">
                        {{ scope.row.password || '未设置' }}
                    </span>
                </template>
            </el-table-column>

            <!-- MAC Address Column (Edit Mode Only) -->
            <el-table-column
                prop="macAddress"
                label="MAC地址"
                width="140"
                v-if="editMode"
            >
                <template slot-scope="scope">
                    <span class="mac-address">{{ scope.row.macAddress }}</span>
                </template>
            </el-table-column>

            <!-- Ports Column -->
            <el-table-column
                label="端口"
                width="150"
            >
                <template slot-scope="scope">
                    <div class="ports-display">
                        <el-tag
                            v-for="config in scope.row.configs"
                            :key="config.name"
                            size="mini"
                            class="port-tag"
                        >
                            {{ extractPort(config.name) }}:{{ config.bind_port }}
                        </el-tag>
                    </div>
                </template>
            </el-table-column>

            <!-- Tags Column -->
            <el-table-column
                label="标签"
                min-width="200"
            >
                <template slot-scope="scope">
                    <div class="tags-display">
                        <el-tag
                            v-for="tag in scope.row.tags"
                            :key="tag"
                            size="small"
                            type="info"
                            class="tag-item"
                        >
                            {{ tag }}
                        </el-tag>
                        <span v-if="!scope.row.tags || scope.row.tags.length === 0" class="no-tags">
                            无标签
                        </span>
                    </div>
                </template>
            </el-table-column>

            <!-- Actions Column -->
            <el-table-column
                label="操作"
                width="280"
                fixed="right"
            >
                <template slot-scope="scope">
                    <div class="action-buttons">
                        <!-- Quick Access Buttons (Always Visible) -->
                        <QuickAccess
                            :site="scope.row"
                            @quick-access="(action) => $emit('quick-access', scope.row, action)"
                        />

                        <!-- Edit Mode Actions -->
                        <template v-if="editMode">
                            <el-button
                                size="mini"
                                type="primary"
                                icon="el-icon-edit"
                                @click="$emit('edit-site', scope.row)"
                                title="编辑站点信息"
                            >
                                编辑
                            </el-button>
                            <el-button
                                size="mini"
                                type="info"
                                icon="el-icon-setting"
                                @click="$emit('edit-configs', scope.row)"
                                title="代理配置"
                            >
                                配置
                            </el-button>
                            <el-button
                                size="mini"
                                type="danger"
                                icon="el-icon-delete"
                                @click="$emit('delete-site', scope.row)"
                                title="删除站点"
                            >
                                删除
                            </el-button>
                        </template>
                    </div>
                </template>
            </el-table-column>
        </el-table>

        <!-- Empty State -->
        <div v-if="!loading && sites.length === 0" class="empty-state">
            <i class="el-icon-box empty-icon"></i>
            <p class="empty-text">暂无站点数据</p>
            <p class="empty-hint">请点击"批量导入"添加站点或检查配置文件</p>
        </div>

        <!-- Footer Statistics -->
        <div class="footer-stats" v-if="sites.length > 0">
            <el-row :gutter="20">
                <el-col :span="6">
                    <div class="stat-item">
                        <span class="stat-label">总站点数:</span>
                        <span class="stat-value">{{ sites.length }}</span>
                    </div>
                </el-col>
                <el-col :span="6">
                    <div class="stat-item">
                        <span class="stat-label">总配置数:</span>
                        <span class="stat-value">{{ totalConfigs }}</span>
                    </div>
                </el-col>
                <el-col :span="6">
                    <div class="stat-item">
                        <span class="stat-label">已分配端口:</span>
                        <span class="stat-value">{{ usedPorts.length }}</span>
                    </div>
                </el-col>
                <el-col :span="6">
                    <div class="stat-item">
                        <span class="stat-label">下个可用端口:</span>
                        <span class="stat-value">{{ nextAvailablePort }}</span>
                    </div>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script>
import QuickAccess from './QuickAccess.vue';
import PortAllocator from '../../utils/PortAllocator.js';

export default {
    name: 'SiteList',
    components: {
        QuickAccess
    },
    props: {
        sites: {
            type: Array,
            default: () => []
        },
        editMode: {
            type: Boolean,
            default: false
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        /**
         * Calculate total number of configurations
         */
        totalConfigs() {
            return this.sites.reduce((total, site) => {
                return total + (site.configs ? site.configs.length : 0);
            }, 0);
        },

        /**
         * Get all used ports
         */
        usedPorts() {
            const ports = [];
            this.sites.forEach(site => {
                if (site.configs) {
                    site.configs.forEach(config => {
                        if (config.bind_port) {
                            ports.push(parseInt(config.bind_port));
                        }
                    });
                }
            });
            return ports.sort((a, b) => a - b);
        },

        /**
         * Get next available port
         */
        nextAvailablePort() {
            try {
                return PortAllocator.allocatePort(this.usedPorts);
            } catch (error) {
                return 'N/A';
            }
        }
    },
    methods: {
        /**
         * Extract port number from configuration name
         */
        extractPort(configName) {
            if (!configName) return 'N/A';
            
            const parts = configName.split('-');
            if (parts.length >= 3) {
                const port = parseInt(parts[parts.length - 1]);
                return isNaN(port) ? 'N/A' : port;
            }
            return 'N/A';
        },

        /**
         * Get row class name for styling
         */
        getRowClassName({ row, rowIndex }) {
            // Add different styling based on site characteristics
            if (!row.configs || row.configs.length === 0) {
                return 'no-configs-row';
            }
            
            if (!row.tags || row.tags.length === 0) {
                return 'no-tags-row';
            }
            
            return '';
        },

        /**
         * Format port display
         */
        formatPortDisplay(configs) {
            if (!Array.isArray(configs)) return [];
            
            return configs.map(config => {
                const servicePort = this.extractPort(config.name);
                return `${servicePort}:${config.bind_port}`;
            }).join(', ');
        },

        /**
         * Get service type by port
         */
        getServiceType(port) {
            const serviceMap = {
                22: 'SSH',
                3306: 'MySQL',
                5000: 'Web',
                80: 'HTTP',
                443: 'HTTPS'
            };
            return serviceMap[port] || `Port${port}`;
        },

        /**
         * Check if site has specific service
         */
        hasService(site, servicePort) {
            if (!site.configs) return false;
            
            return site.configs.some(config => {
                return this.extractPort(config.name) === servicePort;
            });
        }
    }
};
</script>

<style scoped>
.site-list {
    background: white;
    border-radius: 4px;
    padding: 0;
}

/* Table Styling */
.el-table {
    border-radius: 4px;
    overflow: hidden;
}

.site-code {
    font-weight: 600;
    color: #409EFF;
}

.site-name {
    font-weight: 500;
}

.password-field {
    font-family: monospace;
    color: #909399;
}

.mac-address {
    font-family: monospace;
    font-size: 12px;
    color: #606266;
}

/* Ports Display */
.ports-display {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.port-tag {
    font-family: monospace;
    font-size: 11px;
}

/* Tags Display */
.tags-display {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

.tag-item {
    margin: 0;
}

.no-tags {
    color: #C0C4CC;
    font-size: 12px;
    font-style: italic;
}

/* Action Buttons */
.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

.action-buttons .el-button {
    margin: 0;
    padding: 5px 8px;
}

/* Row Styling */
.el-table /deep/ .no-configs-row {
    background-color: #FDF5E6;
}

.el-table /deep/ .no-tags-row {
    background-color: #F5F7FA;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #909399;
}

.empty-icon {
    font-size: 64px;
    color: #C0C4CC;
    margin-bottom: 20px;
}

.empty-text {
    font-size: 16px;
    margin: 0 0 8px 0;
}

.empty-hint {
    font-size: 14px;
    color: #C0C4CC;
    margin: 0;
}

/* Footer Statistics */
.footer-stats {
    background: #F5F7FA;
    padding: 15px 20px;
    margin-top: 1px;
    border-radius: 0 0 4px 4px;
}

.stat-item {
    text-align: center;
}

.stat-label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
}

.stat-value {
    display: block;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .action-buttons {
        flex-direction: column;
        align-items: stretch;
    }
    
    .action-buttons .el-button {
        margin-bottom: 2px;
        width: 100%;
    }
}

@media (max-width: 768px) {
    .footer-stats .el-row {
        flex-direction: column;
    }
    
    .footer-stats .el-col {
        margin-bottom: 10px;
    }
    
    .ports-display,
    .tags-display {
        flex-direction: column;
        align-items: flex-start;
    }
}

/* Table Column Adjustments */
.el-table /deep/ .el-table__header-wrapper {
    background: #F5F7FA;
}

.el-table /deep/ .el-table__header th {
    background: #F5F7FA;
    color: #606266;
    font-weight: 600;
}

/* Compact mode for smaller screens */
@media (max-width: 1024px) {
    .el-table /deep/ .el-table__body-wrapper .el-table__body td {
        padding: 8px 0;
    }
    
    .action-buttons .el-button {
        padding: 3px 6px;
        font-size: 11px;
    }
    
    .port-tag,
    .tag-item {
        font-size: 10px;
        padding: 1px 4px;
    }
}
</style>