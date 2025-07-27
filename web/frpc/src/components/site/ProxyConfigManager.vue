<template>
    <el-dialog
        :title="`代理配置管理 - ${site.siteName || site.siteCode}`"
        :visible.sync="dialogVisible"
        width="900px"
        :close-on-click-modal="false"
        @close="handleClose"
    >
        <div class="proxy-config-manager">
            <!-- Site Information Header -->
            <el-card class="site-info-card" shadow="never">
                <div class="site-info">
                    <div class="info-item">
                        <span class="label">站点编号:</span>
                        <span class="value">{{ site.siteCode }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">站点名称:</span>
                        <span class="value">{{ site.siteName }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">MAC地址:</span>
                        <span class="value mac-value">{{ site.macAddress }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">配置数量:</span>
                        <span class="value">{{ configs.length }} 个</span>
                    </div>
                </div>
            </el-card>

            <!-- Config Management Actions -->
            <div class="config-actions">
                <el-button
                    type="primary"
                    icon="el-icon-plus"
                    @click="showAddConfigDialog"
                    size="small"
                >
                    新增端口配置
                </el-button>
                <el-button
                    type="info"
                    icon="el-icon-refresh"
                    @click="loadConfigs"
                    size="small"
                    :loading="loading"
                >
                    刷新
                </el-button>
                <el-button
                    type="warning"
                    icon="el-icon-setting"
                    @click="showPortAllocationDialog"
                    size="small"
                >
                    端口分配
                </el-button>
            </div>

            <!-- Configurations Table -->
            <el-table
                :data="configs"
                v-loading="loading"
                border
                size="small"
                class="config-table"
            >
                <el-table-column
                    prop="name"
                    label="配置名称"
                    width="200"
                >
                    <template slot-scope="scope">
                        <span class="config-name">{{ scope.row.name }}</span>
                    </template>
                </el-table-column>

                <el-table-column
                    label="服务端口"
                    width="100"
                >
                    <template slot-scope="scope">
                        <el-tag size="mini" type="primary">
                            {{ extractServicePort(scope.row.name) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="server_name"
                    label="服务名称"
                    width="200"
                >
                    <template slot-scope="scope">
                        <el-input
                            v-if="scope.row.editing"
                            v-model="scope.row.server_name"
                            size="mini"
                        />
                        <span v-else class="server-name">{{ scope.row.server_name }}</span>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="bind_port"
                    label="绑定端口"
                    width="120"
                >
                    <template slot-scope="scope">
                        <el-input-number
                            v-if="scope.row.editing"
                            v-model="scope.row.bind_port"
                            :min="1024"
                            :max="65535"
                            size="mini"
                            controls-position="right"
                        />
                        <span v-else class="bind-port">{{ scope.row.bind_port }}</span>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="bind_addr"
                    label="绑定地址"
                    width="120"
                >
                    <template slot-scope="scope">
                        <el-input
                            v-if="scope.row.editing"
                            v-model="scope.row.bind_addr"
                            size="mini"
                        />
                        <span v-else class="bind-addr">{{ scope.row.bind_addr }}</span>
                    </template>
                </el-table-column>

                <el-table-column
                    label="状态"
                    width="80"
                >
                    <template slot-scope="scope">
                        <el-tooltip
                            :content="getConfigStatus(scope.row).tooltip"
                            placement="top"
                        >
                            <i
                                :class="getConfigStatus(scope.row).icon"
                                :style="{ color: getConfigStatus(scope.row).color }"
                            ></i>
                        </el-tooltip>
                    </template>
                </el-table-column>

                <el-table-column
                    label="操作"
                    width="180"
                    fixed="right"
                >
                    <template slot-scope="scope">
                        <div class="config-actions-cell">
                            <template v-if="scope.row.editing">
                                <el-button
                                    size="mini"
                                    type="success"
                                    icon="el-icon-check"
                                    @click="saveConfig(scope.row)"
                                    title="保存"
                                />
                                <el-button
                                    size="mini"
                                    type="info"
                                    icon="el-icon-close"
                                    @click="cancelEdit(scope.row)"
                                    title="取消"
                                />
                            </template>
                            <template v-else>
                                <el-button
                                    size="mini"
                                    type="primary"
                                    icon="el-icon-edit"
                                    @click="editConfig(scope.row)"
                                    title="编辑"
                                />
                                <el-button
                                    size="mini"
                                    type="success"
                                    icon="el-icon-view"
                                    @click="testConfig(scope.row)"
                                    title="测试连接"
                                />
                                <el-button
                                    size="mini"
                                    type="danger"
                                    icon="el-icon-delete"
                                    @click="deleteConfig(scope.row)"
                                    title="删除"
                                />
                            </template>
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Empty State -->
            <div v-if="!loading && configs.length === 0" class="empty-state">
                <i class="el-icon-box empty-icon"></i>
                <p class="empty-text">该站点暂无代理配置</p>
                <el-button type="primary" @click="showAddConfigDialog">
                    添加第一个配置
                </el-button>
            </div>
        </div>

        <!-- Dialog Footer -->
        <div slot="footer" class="dialog-footer">
            <div class="footer-info">
                <span>配置数量: {{ configs.length }}</span>
                <span>已用端口: {{ usedPorts.length }}</span>
            </div>
            <div class="footer-actions">
                <el-button @click="handleClose">关闭</el-button>
                <el-button
                    type="primary"
                    @click="saveAllChanges"
                    :loading="saving"
                    :disabled="!hasChanges"
                >
                    保存所有更改
                </el-button>
            </div>
        </div>

        <!-- Add Config Dialog -->
        <el-dialog
            title="新增端口配置"
            :visible.sync="showAddDialog"
            width="600px"
            append-to-body
        >
            <el-form
                ref="addConfigForm"
                :model="newConfig"
                :rules="configRules"
                label-width="120px"
            >
                <el-form-item label="服务端口" prop="servicePort">
                    <el-input-number
                        v-model="newConfig.servicePort"
                        :min="1"
                        :max="65535"
                        placeholder="如: 22, 3306, 5000"
                        style="width: 200px"
                    />
                    <div class="field-hint">
                        要代理的服务端口号
                    </div>
                </el-form-item>

                <el-form-item label="绑定端口" prop="bindPort">
                    <el-input-number
                        v-model="newConfig.bindPort"
                        :min="1024"
                        :max="65535"
                        placeholder="本地绑定端口"
                        style="width: 200px"
                    />
                    <div class="field-hint">
                        留空将自动分配可用端口
                    </div>
                </el-form-item>

                <el-form-item label="服务名称" prop="serverName">
                    <el-input
                        v-model="newConfig.serverName"
                        placeholder="自动生成或自定义"
                    />
                </el-form-item>

                <el-form-item label="绑定地址" prop="bindAddr">
                    <el-select
                        v-model="newConfig.bindAddr"
                        style="width: 200px"
                    >
                        <el-option label="0.0.0.0 (所有接口)" value="0.0.0.0"/>
                        <el-option label="127.0.0.1 (仅本地)" value="127.0.0.1"/>
                    </el-select>
                </el-form-item>
            </el-form>

            <div slot="footer">
                <el-button @click="showAddDialog = false">取消</el-button>
                <el-button type="primary" @click="addConfig">确定</el-button>
            </div>
        </el-dialog>

        <!-- Port Allocation Dialog -->
        <el-dialog
            title="端口分配管理"
            :visible.sync="showPortDialog"
            width="700px"
            append-to-body
        >
            <div class="port-allocation">
                <div class="allocation-summary">
                    <el-row :gutter="20">
                        <el-col :span="6">
                            <div class="summary-item">
                                <div class="summary-value">{{ usedPorts.length }}</div>
                                <div class="summary-label">已用端口</div>
                            </div>
                        </el-col>
                        <el-col :span="6">
                            <div class="summary-item">
                                <div class="summary-value">{{ nextAvailablePort }}</div>
                                <div class="summary-label">下个可用</div>
                            </div>
                        </el-col>
                        <el-col :span="6">
                            <div class="summary-item">
                                <div class="summary-value">{{ portRange.start }}-{{ portRange.end }}</div>
                                <div class="summary-label">分配范围</div>
                            </div>
                        </el-col>
                        <el-col :span="6">
                            <div class="summary-item">
                                <div class="summary-value">{{ conflictCount }}</div>
                                <div class="summary-label">端口冲突</div>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <div class="port-list">
                    <div
                        v-for="config in configs"
                        :key="config.name"
                        class="port-item"
                        :class="{ 'port-conflict': hasPortConflict(config.bind_port) }"
                    >
                        <span class="port-service">{{ extractServicePort(config.name) }}</span>
                        <span class="port-arrow">→</span>
                        <span class="port-bind">{{ config.bind_port }}</span>
                        <span class="port-name">{{ config.name }}</span>
                        <el-button
                            v-if="hasPortConflict(config.bind_port)"
                            size="mini"
                            type="warning"
                            @click="resolvePortConflict(config)"
                        >
                            解决冲突
                        </el-button>
                    </div>
                </div>
            </div>

            <div slot="footer">
                <el-button @click="showPortDialog = false">关闭</el-button>
                <el-button type="primary" @click="autoResolveConflicts">
                    自动解决所有冲突
                </el-button>
            </div>
        </el-dialog>
    </el-dialog>
</template>

<script>
import STCPManager from '../../utils/STCPManager.js';
import PortAllocator from '../../utils/PortAllocator.js';
import QuickAccessManager from '../../utils/QuickAccessManager.js';

export default {
    name: 'ProxyConfigManager',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        site: {
            type: Object,
            default: () => ({})
        }
    },
    data() {
        return {
            dialogVisible: false,
            loading: false,
            saving: false,
            configs: [],
            originalConfigs: [],
            stcpManager: null,
            showAddDialog: false,
            showPortDialog: false,
            newConfig: {
                servicePort: null,
                bindPort: null,
                serverName: '',
                bindAddr: '0.0.0.0'
            },
            configRules: {
                servicePort: [
                    { required: true, message: '请输入服务端口', trigger: 'blur' },
                    { type: 'number', min: 1, max: 65535, message: '端口范围 1-65535', trigger: 'blur' }
                ]
            },
            portRange: { start: 18000, end: 20000 }
        };
    },
    computed: {
        /**
         * Check if there are unsaved changes
         */
        hasChanges() {
            return JSON.stringify(this.configs) !== JSON.stringify(this.originalConfigs);
        },

        /**
         * Get all used ports
         */
        usedPorts() {
            return this.configs
                .map(config => parseInt(config.bind_port))
                .filter(port => !isNaN(port))
                .sort((a, b) => a - b);
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
        },

        /**
         * Count port conflicts
         */
        conflictCount() {
            const portCounts = new Map();
            this.configs.forEach(config => {
                const port = parseInt(config.bind_port);
                if (!isNaN(port)) {
                    portCounts.set(port, (portCounts.get(port) || 0) + 1);
                }
            });
            
            return Array.from(portCounts.values()).filter(count => count > 1).length;
        }
    },
    watch: {
        visible: {
            immediate: true,
            handler(newVal) {
                this.dialogVisible = newVal;
                if (newVal) {
                    this.loadConfigs();
                }
            }
        },
        dialogVisible(newVal) {
            this.$emit('update:visible', newVal);
        },
        'newConfig.servicePort'() {
            this.updateNewConfigDefaults();
        }
    },
    async created() {
        this.stcpManager = new STCPManager();
        await this.stcpManager.loadConfig();
    },
    methods: {
        /**
         * Load configurations for the site
         */
        loadConfigs() {
            this.loading = true;
            try {
                this.configs = this.site.configs ? this.site.configs.slice() : [];
                this.originalConfigs = JSON.parse(JSON.stringify(this.configs));
                
                // Add editing property to each config
                this.configs.forEach(config => {
                    this.$set(config, 'editing', false);
                });
            } catch (error) {
                this.$message.error('加载配置失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        /**
         * Extract service port from config name
         */
        extractServicePort(configName) {
            const parts = configName.split('-');
            if (parts.length >= 3) {
                const port = parseInt(parts[parts.length - 1]);
                return isNaN(port) ? 'N/A' : port;
            }
            return 'N/A';
        },

        /**
         * Get configuration status
         */
        getConfigStatus(config) {
            const servicePort = this.extractServicePort(config.name);
            const bindPort = parseInt(config.bind_port);
            
            if (isNaN(bindPort)) {
                return {
                    icon: 'el-icon-error',
                    color: '#F56C6C',
                    tooltip: '绑定端口无效'
                };
            }
            
            if (this.hasPortConflict(bindPort)) {
                return {
                    icon: 'el-icon-warning',
                    color: '#E6A23C',
                    tooltip: '端口冲突'
                };
            }
            
            return {
                icon: 'el-icon-success',
                color: '#67C23A',
                tooltip: '配置正常'
            };
        },

        /**
         * Check if port has conflict
         */
        hasPortConflict(port) {
            return this.configs.filter(config => 
                parseInt(config.bind_port) === parseInt(port)
            ).length > 1;
        },

        /**
         * Edit configuration
         */
        editConfig(config) {
            config.editing = true;
            // Store original values for cancel
            config._original = {
                server_name: config.server_name,
                bind_port: config.bind_port,
                bind_addr: config.bind_addr
            };
        },

        /**
         * Cancel edit
         */
        cancelEdit(config) {
            if (config._original) {
                config.server_name = config._original.server_name;
                config.bind_port = config._original.bind_port;
                config.bind_addr = config._original.bind_addr;
                delete config._original;
            }
            config.editing = false;
        },

        /**
         * Save configuration
         */
        saveConfig(config) {
            // Validate
            if (!config.server_name) {
                this.$message.error('服务名称不能为空');
                return;
            }
            
            const bindPort = parseInt(config.bind_port);
            if (isNaN(bindPort) || bindPort < 1024 || bindPort > 65535) {
                this.$message.error('绑定端口范围应在 1024-65535');
                return;
            }
            
            config.editing = false;
            delete config._original;
            this.$message.success('配置已更新');
        },

        /**
         * Delete configuration
         */
        deleteConfig(config) {
            this.$confirm(`确定要删除配置 "${config.name}" 吗？`, '删除确认', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                const index = this.configs.indexOf(config);
                if (index > -1) {
                    this.configs.splice(index, 1);
                    this.$message.success('配置已删除');
                }
            }).catch(() => {
                this.$message.info('已取消删除');
            });
        },

        /**
         * Test configuration
         */
        async testConfig(config) {
            const servicePort = this.extractServicePort(config.name);
            this.$message.info(`正在测试端口 ${servicePort} 的连接...`);
            
            try {
                const accessible = await QuickAccessManager.validateServiceAccess(this.site, servicePort);
                const message = accessible ? 
                    `端口 ${servicePort} 连接正常` : 
                    `端口 ${servicePort} 连接失败`;
                const type = accessible ? 'success' : 'warning';
                this.$message({ message, type });
            } catch (error) {
                this.$message.error(`测试连接失败: ${error.message}`);
            }
        },

        /**
         * Show add configuration dialog
         */
        showAddConfigDialog() {
            this.resetNewConfig();
            this.showAddDialog = true;
        },

        /**
         * Reset new config form
         */
        resetNewConfig() {
            this.newConfig = {
                servicePort: null,
                bindPort: null,
                serverName: '',
                bindAddr: '0.0.0.0'
            };
        },

        /**
         * Update new config defaults based on service port
         */
        updateNewConfigDefaults() {
            if (this.newConfig.servicePort) {
                // Auto-generate server name
                this.newConfig.serverName = `R-${this.site.macAddress}-${this.newConfig.servicePort}`;
                
                // Auto-assign bind port if not set
                if (!this.newConfig.bindPort) {
                    try {
                        this.newConfig.bindPort = PortAllocator.allocatePort(this.usedPorts);
                    } catch (error) {
                        console.warn('Could not auto-assign port:', error);
                    }
                }
            }
        },

        /**
         * Add new configuration
         */
        async addConfig() {
            try {
                await this.$refs.addConfigForm.validate();
                
                // Check for duplicate service port
                const existingServicePort = this.configs.find(config => 
                    this.extractServicePort(config.name) === this.newConfig.servicePort
                );
                
                if (existingServicePort) {
                    this.$message.error(`服务端口 ${this.newConfig.servicePort} 已存在`);
                    return;
                }
                
                // Check for duplicate bind port
                if (this.newConfig.bindPort && this.usedPorts.includes(this.newConfig.bindPort)) {
                    this.$message.error(`绑定端口 ${this.newConfig.bindPort} 已被使用`);
                    return;
                }
                
                // Auto-assign bind port if not provided
                if (!this.newConfig.bindPort) {
                    this.newConfig.bindPort = PortAllocator.allocatePort(this.usedPorts);
                }
                
                const newConfig = {
                    name: this.newConfig.serverName,
                    type: 'stcp',
                    role: 'visitor',
                    server_name: this.newConfig.serverName,
                    sk: this.site.macAddress,
                    bind_addr: this.newConfig.bindAddr,
                    bind_port: this.newConfig.bindPort,
                    editing: false
                };
                
                this.configs.push(newConfig);
                this.showAddDialog = false;
                this.$message.success('配置添加成功');
                
            } catch (error) {
                console.error('Add config validation failed:', error);
            }
        },

        /**
         * Show port allocation dialog
         */
        showPortAllocationDialog() {
            this.showPortDialog = true;
        },

        /**
         * Resolve port conflict for specific config
         */
        resolvePortConflict(config) {
            try {
                const newPort = PortAllocator.allocatePort(this.usedPorts);
                config.bind_port = newPort;
                this.$message.success(`端口冲突已解决，新端口: ${newPort}`);
            } catch (error) {
                this.$message.error('无法分配新端口: ' + error.message);
            }
        },

        /**
         * Auto resolve all port conflicts
         */
        autoResolveConflicts() {
            let resolvedCount = 0;
            const conflictConfigs = [];
            
            // Find all conflicting configs
            const portCounts = new Map();
            this.configs.forEach(config => {
                const port = parseInt(config.bind_port);
                if (!isNaN(port)) {
                    if (!portCounts.has(port)) {
                        portCounts.set(port, []);
                    }
                    portCounts.get(port).push(config);
                }
            });
            
            // Resolve conflicts (keep first, reassign others)
            portCounts.forEach((configsWithSamePort, port) => {
                if (configsWithSamePort.length > 1) {
                    // Skip the first one, reassign the rest
                    for (let i = 1; i < configsWithSamePort.length; i++) {
                        try {
                            const newPort = PortAllocator.allocatePort(this.usedPorts);
                            configsWithSamePort[i].bind_port = newPort;
                            this.usedPorts.push(newPort);
                            resolvedCount++;
                        } catch (error) {
                            console.error('Failed to resolve conflict:', error);
                        }
                    }
                }
            });
            
            if (resolvedCount > 0) {
                this.$message.success(`已解决 ${resolvedCount} 个端口冲突`);
            } else {
                this.$message.info('没有发现端口冲突');
            }
        },

        /**
         * Save all changes
         */
        async saveAllChanges() {
            this.saving = true;
            try {
                // Update site configs
                this.site.configs = this.configs.slice();
                
                // Update in STCP manager
                this.configs.forEach(config => {
                    this.stcpManager.updateSTCPConfig(config.name, config);
                });
                
                // Save to server
                await this.stcpManager.saveConfig();
                
                this.originalConfigs = JSON.parse(JSON.stringify(this.configs));
                this.$emit('save-configs');
                this.$message.success('所有更改已保存');
                
            } catch (error) {
                this.$message.error('保存失败: ' + error.message);
            } finally {
                this.saving = false;
            }
        },

        /**
         * Handle dialog close
         */
        handleClose() {
            if (this.hasChanges) {
                this.$confirm('有未保存的更改，确定要关闭吗？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    this.dialogVisible = false;
                }).catch(() => {
                    // Do nothing, keep dialog open
                });
            } else {
                this.dialogVisible = false;
            }
        }
    }
};
</script>

<style scoped>
.proxy-config-manager {
    max-height: 70vh;
    overflow-y: auto;
}

.site-info-card {
    margin-bottom: 20px;
    background: #F8F9FA;
}

.site-info {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.info-item {
    display: flex;
    align-items: center;
}

.label {
    font-weight: 500;
    color: #606266;
    margin-right: 8px;
}

.value {
    color: #303133;
}

.mac-value {
    font-family: monospace;
    color: #409EFF;
}

.config-actions {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
}

.config-table {
    margin-bottom: 20px;
}

.config-name {
    font-family: monospace;
    color: #409EFF;
    font-weight: 500;
}

.server-name,
.bind-port,
.bind-addr {
    font-family: monospace;
    color: #606266;
}

.config-actions-cell {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.config-actions-cell .el-button {
    padding: 4px 6px;
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #909399;
}

.empty-icon {
    font-size: 48px;
    color: #C0C4CC;
    margin-bottom: 15px;
}

.empty-text {
    margin-bottom: 20px;
    font-size: 16px;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-info {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #606266;
}

.footer-actions {
    display: flex;
    gap: 10px;
}

.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
}

/* Port Allocation Dialog */
.port-allocation {
    max-height: 500px;
    overflow-y: auto;
}

.allocation-summary {
    margin-bottom: 20px;
    padding: 15px;
    background: #F8F9FA;
    border-radius: 6px;
}

.summary-item {
    text-align: center;
}

.summary-value {
    font-size: 24px;
    font-weight: 600;
    color: #409EFF;
    margin-bottom: 5px;
}

.summary-label {
    font-size: 12px;
    color: #909399;
}

.port-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.port-item {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    background: #FFFFFF;
    border: 1px solid #E4E7ED;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.port-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.port-conflict {
    border-color: #E6A23C;
    background: #FDF6EC;
}

.port-service {
    font-weight: 600;
    color: #409EFF;
    min-width: 60px;
    font-family: monospace;
}

.port-arrow {
    margin: 0 10px;
    color: #909399;
}

.port-bind {
    font-weight: 600;
    color: #67C23A;
    min-width: 60px;
    font-family: monospace;
}

.port-name {
    flex: 1;
    margin-left: 15px;
    color: #606266;
    font-family: monospace;
    font-size: 13px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .site-info {
        flex-direction: column;
        gap: 10px;
    }
    
    .config-actions {
        flex-direction: column;
    }
    
    .dialog-footer {
        flex-direction: column;
        gap: 10px;
    }
    
    .footer-info {
        flex-direction: column;
        gap: 5px;
        text-align: center;
    }
}
</style>