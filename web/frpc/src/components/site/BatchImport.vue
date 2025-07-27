<template>
    <el-dialog
        title="批量导入站点"
        :visible.sync="dialogVisible"
        width="800px"
        :close-on-click-modal="false"
        @close="handleClose"
    >
        <div class="batch-import">
            <!-- Import Instructions -->
            <el-alert
                title="导入格式说明"
                type="info"
                :closable="false"
                class="format-alert"
            >
                <div class="format-description">
                    <p><strong>格式:</strong> 站点编号 MAC地址 [站点名称]</p>
                    <p><strong>示例:</strong></p>
                    <div class="example-code">
                        DC20240102 E721EE345A2 苏州辐射站<br>
                        DC20240103 F821EE345B3 太平岭01<br>
                        DC20240104 G921EE345C4<br>
                        DC20240105 G921EE345C5
                    </div>
                    <p class="format-note">
                        <i class="el-icon-info"></i>
                        站点名称为可选项，如未提供则使用站点编号作为名称
                    </p>
                </div>
            </el-alert>

            <!-- Import Configuration -->
            <el-card class="config-card" header="导入配置">
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="默认端口:">
                            <el-tag
                                v-for="port in defaultPorts"
                                :key="port"
                                closable
                                @close="removePort(port)"
                                class="port-tag"
                            >
                                {{ port }}
                            </el-tag>
                            <el-input
                                v-if="showPortInput"
                                v-model="newPort"
                                size="small"
                                style="width: 80px"
                                @keyup.enter.native="addPort"
                                @blur="addPort"
                                ref="portInput"
                            />
                            <el-button
                                v-else
                                size="small"
                                type="text"
                                @click="showAddPort"
                                icon="el-icon-plus"
                            >
                                添加端口
                            </el-button>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="起始端口:">
                            <el-input-number
                                v-model="startPort"
                                :min="1024"
                                :max="65535"
                                size="small"
                                controls-position="right"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-card>

            <!-- Import Text Area -->
            <div class="import-section">
                <div class="section-header">
                    <span class="section-title">导入数据</span>
                    <div class="section-actions">
                        <el-button size="small" @click="clearImportText">清空</el-button>
                        <el-button size="small" @click="loadExample">加载示例</el-button>
                    </div>
                </div>
                <el-input
                    type="textarea"
                    v-model="importText"
                    placeholder="请输入站点数据，每行一个站点..."
                    :rows="8"
                    class="import-textarea"
                />
                <div class="import-stats">
                    <span>行数: {{ lineCount }}</span>
                    <span>有效行: {{ validLineCount }}</span>
                    <span v-if="invalidLineCount > 0" class="error-text">
                        无效行: {{ invalidLineCount }}
                    </span>
                </div>
            </div>

            <!-- Preview Section -->
            <div class="preview-section" v-if="previewData.length > 0">
                <div class="section-header">
                    <span class="section-title">导入预览</span>
                    <span class="preview-count">({{ previewData.length }} 个站点)</span>
                </div>
                
                <el-table
                    :data="previewData"
                    size="small"
                    max-height="300"
                    border
                    class="preview-table"
                >
                    <el-table-column prop="siteCode" label="站点编号" width="120"/>
                    <el-table-column prop="macAddress" label="MAC地址" width="140"/>
                    <el-table-column prop="siteName" label="站点名称" min-width="150"/>
                    <el-table-column label="端口配置" min-width="200">
                        <template slot-scope="scope">
                            <el-tag
                                v-for="port in scope.row.ports"
                                :key="port.service"
                                size="mini"
                                class="port-preview-tag"
                            >
                                {{ port.service }}:{{ port.bind }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" width="80">
                        <template slot-scope="scope">
                            <i
                                :class="scope.row.valid ? 'el-icon-success' : 'el-icon-error'"
                                :style="{ color: scope.row.valid ? '#67C23A' : '#F56C6C' }"
                            ></i>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- Error Display -->
            <div class="error-section" v-if="parseErrors.length > 0">
                <div class="section-header">
                    <span class="section-title error-title">解析错误</span>
                </div>
                <div class="error-list">
                    <div
                        v-for="error in parseErrors"
                        :key="error.line"
                        class="error-item"
                    >
                        <span class="error-line">第{{ error.line }}行:</span>
                        <span class="error-message">{{ error.message }}</span>
                        <code class="error-content">{{ error.content }}</code>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dialog Actions -->
        <div slot="footer" class="dialog-footer">
            <div class="footer-stats">
                <span v-if="previewData.length > 0">
                    准备导入 {{ validPreviewCount }} 个站点，共 {{ totalConfigCount }} 个配置
                </span>
            </div>
            <div class="footer-actions">
                <el-button @click="handleClose">取消</el-button>
                <el-button
                    type="primary"
                    @click="handleImport"
                    :loading="importing"
                    :disabled="validPreviewCount === 0"
                >
                    {{ importing ? '导入中...' : '开始导入' }}
                </el-button>
            </div>
        </div>

        <!-- Import Progress Dialog -->
        <el-dialog
            title="导入进度"
            :visible.sync="showProgress"
            width="500px"
            :close-on-click-modal="false"
            :show-close="false"
        >
            <div class="progress-content">
                <el-progress
                    :percentage="importProgress"
                    :status="importProgressStatus"
                />
                <div class="progress-text">
                    {{ progressText }}
                </div>
            </div>
        </el-dialog>
    </el-dialog>
</template>

<script>
import STCPManager from '../../utils/STCPManager.js';
import PortAllocator from '../../utils/PortAllocator.js';

export default {
    name: 'BatchImport',
    props: {
        visible: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            dialogVisible: false,
            importText: '',
            defaultPorts: [22, 3306, 5000],
            startPort: 18015,
            newPort: '',
            showPortInput: false,
            previewData: [],
            parseErrors: [],
            importing: false,
            showProgress: false,
            importProgress: 0,
            importProgressStatus: '',
            progressText: '',
            stcpManager: null
        };
    },
    computed: {
        /**
         * Calculate line count
         */
        lineCount() {
            return this.importText ? this.importText.split('\n').length : 0;
        },

        /**
         * Calculate valid line count
         */
        validLineCount() {
            return this.previewData.filter(item => item.valid).length;
        },

        /**
         * Calculate invalid line count
         */
        invalidLineCount() {
            return this.parseErrors.length;
        },

        /**
         * Calculate valid preview count
         */
        validPreviewCount() {
            return this.previewData.filter(item => item.valid).length;
        },

        /**
         * Calculate total configuration count
         */
        totalConfigCount() {
            return this.validPreviewCount * this.defaultPorts.length;
        }
    },
    watch: {
        visible: {
            immediate: true,
            handler(newVal) {
                this.dialogVisible = newVal;
            }
        },
        dialogVisible(newVal) {
            this.$emit('update:visible', newVal);
        },
        importText: {
            handler() {
                this.parseImportText();
            }
        },
        defaultPorts: {
            handler() {
                this.parseImportText();
            }
        }
    },
    async created() {
        this.stcpManager = new STCPManager();
        await this.loadExistingConfig();
    },
    methods: {
        /**
         * Load existing configuration
         */
        async loadExistingConfig() {
            try {
                await this.stcpManager.loadConfig();
            } catch (error) {
                console.error('Failed to load existing config:', error);
                this.$message.warning('无法加载现有配置，端口分配可能存在冲突');
            }
        },

        /**
         * Parse import text
         */
        parseImportText() {
            this.previewData = [];
            this.parseErrors = [];

            if (!this.importText.trim()) return;

            const lines = this.importText.split('\n');
            const usedPorts = this.stcpManager ? this.stcpManager.getAllUsedPorts() : [];
            let currentPort = this.startPort;

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                try {
                    const parsed = this.parseLine(trimmedLine, index + 1);
                    if (parsed) {
                        // Allocate ports for this site
                        const portAllocations = [];
                        this.defaultPorts.forEach(servicePort => {
                            // Find next available port
                            while (usedPorts.includes(currentPort)) {
                                currentPort++;
                            }
                            portAllocations.push({
                                service: servicePort,
                                bind: currentPort
                            });
                            usedPorts.push(currentPort);
                            currentPort++;
                        });

                        parsed.ports = portAllocations;
                        this.previewData.push(parsed);
                    }
                } catch (error) {
                    this.parseErrors.push({
                        line: index + 1,
                        message: error.message,
                        content: trimmedLine
                    });
                }
            });
        },

        /**
         * Parse single line
         */
        parseLine(line, lineNumber) {
            const parts = line.split(/\s+/);
            
            if (parts.length < 2) {
                throw new Error('格式错误：至少需要站点编号和MAC地址');
            }

            const siteCode = parts[0];
            const macAddress = parts[1].toUpperCase().replace(/[:-]/g, '');
            const siteName = parts.slice(2).join(' ') || siteCode;

            // Validate site code
            if (!siteCode || siteCode.length < 1) {
                throw new Error('站点编号不能为空');
            }

            // Validate MAC address
            if (!/^[A-F0-9]{12}$/.test(macAddress)) {
                throw new Error('MAC地址格式不正确，应为12位十六进制字符');
            }

            // Check for duplicates in current preview
            const existingSite = this.previewData.find(site => 
                site.macAddress === macAddress || site.siteCode === siteCode
            );
            if (existingSite) {
                throw new Error('站点编号或MAC地址重复');
            }

            // Check against existing sites
            if (this.stcpManager) {
                const existingInSystem = this.stcpManager.getSiteByMac(macAddress);
                if (existingInSystem) {
                    throw new Error('MAC地址已存在于系统中');
                }
            }

            return {
                siteCode,
                macAddress,
                siteName,
                valid: true,
                lineNumber
            };
        },

        /**
         * Add port to default ports
         */
        addPort() {
            const port = parseInt(this.newPort);
            if (port && port >= 1 && port <= 65535 && !this.defaultPorts.includes(port)) {
                this.defaultPorts.push(port);
                this.defaultPorts.sort((a, b) => a - b);
            }
            this.newPort = '';
            this.showPortInput = false;
        },

        /**
         * Remove port from default ports
         */
        removePort(port) {
            const index = this.defaultPorts.indexOf(port);
            if (index > -1) {
                this.defaultPorts.splice(index, 1);
            }
        },

        /**
         * Show add port input
         */
        showAddPort() {
            this.showPortInput = true;
            this.$nextTick(() => {
                this.$refs.portInput.focus();
            });
        },

        /**
         * Clear import text
         */
        clearImportText() {
            this.importText = '';
        },

        /**
         * Load example data
         */
        loadExample() {
            this.importText = `DC20240107 E721EE345A3 苏州辐射站
DC20240108 F821EE345B4 太平岭01
DC20240109 G921EE345C5 烟气监测站
DC20240110 H921EE345D6`;
        },

        /**
         * Handle import
         */
        async handleImport() {
            if (this.validPreviewCount === 0) {
                this.$message.error('没有有效的站点数据可导入');
                return;
            }

            this.importing = true;
            this.showProgress = true;
            this.importProgress = 0;
            this.importProgressStatus = '';
            this.progressText = '开始导入...';

            try {
                const validSites = this.previewData.filter(site => site.valid);
                const result = { success: [], failed: [] };

                for (let i = 0; i < validSites.length; i++) {
                    const site = validSites[i];
                    this.progressText = `正在导入站点 ${site.siteCode}...`;
                    this.importProgress = Math.round((i / validSites.length) * 100);

                    try {
                        // Create site data
                        const siteData = {
                            siteCode: site.siteCode,
                            macAddress: site.macAddress,
                            siteName: site.siteName,
                            password: '',
                            tags: []
                        };

                        // Add site with custom port allocations
                        const addedSite = this.stcpManager.addSite(siteData, this.defaultPorts);
                        
                        // Update port allocations to match preview
                        addedSite.configs.forEach((config, index) => {
                            if (site.ports[index]) {
                                config.bind_port = site.ports[index].bind;
                            }
                        });

                        result.success.push({ site: addedSite, line: site.lineNumber });
                    } catch (error) {
                        result.failed.push({
                            site: site.siteCode,
                            line: site.lineNumber,
                            error: error.message
                        });
                    }

                    // Small delay to show progress
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                this.importProgress = 100;
                this.progressText = '导入完成，正在保存配置...';

                // Save configuration
                await this.stcpManager.saveConfig();

                this.importProgressStatus = 'success';
                this.progressText = `导入完成！成功 ${result.success.length} 个，失败 ${result.failed.length} 个`;

                // Wait a moment to show completion
                await new Promise(resolve => setTimeout(resolve, 1500));

                this.showProgress = false;
                this.$emit('import-success', result);

                // Show detailed result if there are failures
                if (result.failed.length > 0) {
                    this.showImportErrors(result.failed);
                }

            } catch (error) {
                this.importProgressStatus = 'exception';
                this.progressText = '导入失败: ' + error.message;
                this.$message.error('批量导入失败: ' + error.message);
                
                setTimeout(() => {
                    this.showProgress = false;
                }, 2000);
            } finally {
                this.importing = false;
            }
        },

        /**
         * Show import errors
         */
        showImportErrors(failures) {
            const errorMessage = failures.map(f => 
                `第${f.line}行 (${f.site}): ${f.error}`
            ).join('\n');

            this.$alert(errorMessage, '导入错误详情', {
                type: 'warning',
                confirmButtonText: '确定'
            });
        },

        /**
         * Handle dialog close
         */
        handleClose() {
            this.dialogVisible = false;
            this.importText = '';
            this.previewData = [];
            this.parseErrors = [];
            this.importing = false;
            this.showProgress = false;
        }
    }
};
</script>

<style scoped>
.batch-import {
    max-height: 70vh;
    overflow-y: auto;
}

.format-alert {
    margin-bottom: 20px;
}

.format-description p {
    margin: 8px 0;
}

.example-code {
    background: #F5F7FA;
    padding: 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    color: #606266;
    margin: 8px 0;
}

.format-note {
    color: #909399;
    font-size: 13px;
    margin-top: 10px;
}

.config-card {
    margin-bottom: 20px;
}

.port-tag {
    margin-right: 6px;
    margin-bottom: 4px;
}

.import-section {
    margin-bottom: 20px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.section-title {
    font-weight: 600;
    color: #303133;
}

.error-title {
    color: #F56C6C;
}

.section-actions {
    display: flex;
    gap: 8px;
}

.import-textarea {
    margin-bottom: 8px;
}

.import-stats {
    display: flex;
    gap: 15px;
    font-size: 13px;
    color: #606266;
}

.error-text {
    color: #F56C6C;
}

.preview-section {
    margin-bottom: 20px;
}

.preview-count {
    color: #909399;
    font-size: 13px;
}

.preview-table {
    margin-top: 10px;
}

.port-preview-tag {
    margin-right: 4px;
    font-family: monospace;
    font-size: 11px;
}

.error-section {
    margin-bottom: 20px;
}

.error-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #F56C6C;
    border-radius: 4px;
    padding: 10px;
    background: #FEF0F0;
}

.error-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dotted #F56C6C;
}

.error-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.error-line {
    font-weight: 600;
    color: #F56C6C;
    font-size: 12px;
}

.error-message {
    color: #F56C6C;
    font-size: 13px;
    margin: 2px 0;
}

.error-content {
    background: #FFFFFF;
    border: 1px solid #F56C6C;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    color: #606266;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-stats {
    color: #606266;
    font-size: 13px;
}

.footer-actions {
    display: flex;
    gap: 10px;
}

.progress-content {
    text-align: center;
}

.progress-text {
    margin-top: 15px;
    color: #606266;
    font-size: 14px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .dialog-footer {
        flex-direction: column;
        gap: 10px;
    }
    
    .footer-stats {
        text-align: center;
    }
}
</style>