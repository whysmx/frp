<template>
    <el-dialog
        title="配置文件编辑器"
        :visible.sync="dialogVisible"
        width="900px"
        :close-on-click-modal="false"
        @open="loadConfigContent"
    >
        <div class="config-file-editor">
            <!-- Editor Header -->
            <div class="editor-header">
                <div class="header-info">
                    <i class="el-icon-document"></i>
                    <span>frpc.ini 配置文件</span>
                    <el-tag size="mini" type="info">INI格式</el-tag>
                </div>
                <div class="header-actions">
                    <el-button
                        size="small"
                        type="info"
                        icon="el-icon-refresh"
                        @click="loadConfigContent"
                        :loading="loading"
                    >
                        重新加载
                    </el-button>
                </div>
            </div>

            <!-- Editor Content -->
            <div class="editor-content">
                <el-input
                    type="textarea"
                    v-model="configContent"
                    :rows="20"
                    placeholder="配置文件内容..."
                    class="config-textarea"
                    :disabled="loading"
                />
            </div>

            <!-- Editor Stats -->
            <div class="editor-stats">
                <span>行数: {{ lineCount }}</span>
                <span>字符数: {{ charCount }}</span>
                <span>大小: {{ fileSize }}</span>
            </div>

            <!-- Editor Help -->
            <el-collapse class="editor-help">
                <el-collapse-item title="配置文件格式说明" name="help">
                    <div class="help-content">
                        <h4>INI 格式说明:</h4>
                        <ul>
                            <li><strong>[section]</strong> - 配置段名称</li>
                            <li><strong>key = value</strong> - 配置项</li>
                            <li><strong># comment</strong> - 注释行</li>
                        </ul>
                        
                        <h4>STCP 配置示例:</h4>
                        <pre class="config-example">
[R-E721EE345A2-22]
type = stcp
role = visitor
server_name = R-E721EE345A2-22
sk = E721EE345A2
bind_addr = 0.0.0.0
bind_port = 18000</pre>
                        
                        <h4>设备注册格式:</h4>
                        <pre class="config-example">
# DEVICE_REGISTRY_START
# E721EE345A2|DC20240102|苏州辐射站|bs123456|测试,在线,辐射
# DEVICE_REGISTRY_END</pre>
                        
                        <p><strong>注意:</strong> 直接编辑配置文件需要谨慎，错误的格式可能导致服务无法启动。</p>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>

        <!-- Dialog Footer -->
        <div slot="footer" class="dialog-footer">
            <div class="footer-info">
                <el-alert
                    v-if="hasChanges"
                    title="配置文件已修改"
                    type="warning"
                    :closable="false"
                    show-icon
                />
            </div>
            <div class="footer-actions">
                <el-button @click="handleClose">取消</el-button>
                <el-button
                    type="primary"
                    @click="saveConfig"
                    :loading="saving"
                    :disabled="!hasChanges"
                >
                    保存并重载
                </el-button>
            </div>
        </div>
    </el-dialog>
</template>

<script>
export default {
    name: 'ConfigFileEditor',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        configContent: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            dialogVisible: false,
            loading: false,
            saving: false,
            originalContent: '',
            currentContent: ''
        };
    },
    computed: {
        /**
         * Check if content has changes
         */
        hasChanges() {
            return this.currentContent !== this.originalContent;
        },

        /**
         * Calculate line count
         */
        lineCount() {
            return this.currentContent ? this.currentContent.split('\n').length : 0;
        },

        /**
         * Calculate character count
         */
        charCount() {
            return this.currentContent ? this.currentContent.length : 0;
        },

        /**
         * Calculate file size
         */
        fileSize() {
            const bytes = new Blob([this.currentContent || '']).size;
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        configContent: {
            immediate: true,
            handler(newVal) {
                this.currentContent = newVal || '';
                this.originalContent = newVal || '';
            }
        }
    },
    methods: {
        /**
         * Load configuration content from API
         */
        async loadConfigContent() {
            this.loading = true;
            try {
                const response = await fetch('/api/config', { credentials: 'include' });
                const content = await response.text();
                
                this.currentContent = content;
                this.originalContent = content;
                
                this.$message.success('配置文件加载成功');
            } catch (error) {
                console.error('Failed to load config content:', error);
                this.$message.error('加载配置文件失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        /**
         * Save configuration
         */
        async saveConfig() {
            if (!this.hasChanges) {
                this.$message.info('配置文件无变更');
                return;
            }

            this.saving = true;
            try {
                // Save configuration
                const response = await fetch('/api/config', {
                    credentials: 'include',
                    method: 'PUT',
                    body: this.currentContent,
                });

                if (!response.ok) {
                    throw new Error('Failed to save configuration');
                }

                // Reload configuration
                await fetch('/api/reload', { credentials: 'include' });
                
                this.originalContent = this.currentContent;
                this.$emit('save-config', this.currentContent);
                this.$message.success('配置文件保存成功');
                
            } catch (error) {
                console.error('Failed to save config:', error);
                this.$message.error('保存配置文件失败: ' + error.message);
            } finally {
                this.saving = false;
            }
        },

        /**
         * Handle dialog close
         */
        handleClose() {
            if (this.hasChanges) {
                this.$confirm('配置文件已修改但未保存，确定要关闭吗？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    this.dialogVisible = false;
                    this.currentContent = this.originalContent; // Reset changes
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
.config-file-editor {
    display: flex;
    flex-direction: column;
    height: 70vh;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 15px;
    border-bottom: 1px solid #E4E7ED;
    margin-bottom: 15px;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.header-info i {
    color: #409EFF;
    font-size: 18px;
}

.header-info span {
    font-weight: 500;
    color: #303133;
}

.editor-content {
    flex: 1;
    margin-bottom: 15px;
}

.config-textarea {
    height: 100%;
}

.config-textarea /deep/ .el-textarea__inner {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: none;
    height: 100% !important;
}

.editor-stats {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: #909399;
    padding: 8px 0;
    border-top: 1px solid #F0F2F5;
    margin-bottom: 15px;
}

.editor-help {
    margin-bottom: 15px;
}

.help-content {
    font-size: 14px;
    line-height: 1.6;
}

.help-content h4 {
    color: #303133;
    margin: 15px 0 8px 0;
}

.help-content ul {
    margin: 8px 0;
    padding-left: 20px;
}

.help-content li {
    margin: 4px 0;
}

.config-example {
    background: #F5F7FA;
    border: 1px solid #E4E7ED;
    border-radius: 4px;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    color: #606266;
    margin: 8px 0;
    overflow-x: auto;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-info {
    flex: 1;
}

.footer-actions {
    display: flex;
    gap: 10px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .config-file-editor {
        height: 60vh;
    }
    
    .editor-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .dialog-footer {
        flex-direction: column;
        gap: 10px;
    }
    
    .footer-info {
        width: 100%;
    }
    
    .config-textarea /deep/ .el-textarea__inner {
        font-size: 12px;
    }
}

/* Syntax highlighting simulation */
.config-textarea /deep/ .el-textarea__inner {
    color: #2c3e50;
}

/* Alert styling in footer */
.footer-info .el-alert {
    margin: 0;
}

.footer-info .el-alert /deep/ .el-alert__content {
    font-size: 13px;
}
</style>