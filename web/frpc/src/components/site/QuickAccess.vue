<template>
    <div class="quick-access">
        <!-- Primary Web Access Button -->
        <el-button
            v-if="quickInfo.webUrl"
            size="mini"
            type="success"
            icon="el-icon-view"
            @click="handleWebAccess"
            :title="'打开Web界面: ' + quickInfo.webUrl"
            class="access-button primary-access"
        >
            访问
        </el-button>

        <!-- SSH Access Button -->
        <el-button
            v-if="quickInfo.sshCommand"
            size="mini"
            type="info"
            icon="el-icon-monitor"
            @click="handleSSHAccess"
            :title="'复制SSH命令: ' + quickInfo.sshCommand"
            class="access-button"
        >
            SSH
        </el-button>

        <!-- MySQL Access Button -->
        <el-button
            v-if="quickInfo.mysqlCommand"
            size="mini"
            type="warning"
            icon="el-icon-coin"
            @click="handleMySQLAccess"
            :title="'复制MySQL命令: ' + quickInfo.mysqlCommand"
            class="access-button"
        >
            MySQL
        </el-button>

        <!-- BS Button (Placeholder) -->
        <el-button
            size="mini"
            type="info"
            icon="el-icon-setting"
            @click="handleBSAccess"
            title="BS功能 (预留)"
            class="access-button"
            :disabled="true"
        >
            BS
        </el-button>

        <!-- More Actions Dropdown -->
        <el-dropdown
            v-if="hasMultipleServices"
            @command="handleDropdownCommand"
            trigger="click"
            size="mini"
            class="more-actions"
        >
            <el-button size="mini" type="text" class="more-button">
                更多
                <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
                <!-- All Available Services -->
                <el-dropdown-item
                    v-for="service in quickInfo.availableServices"
                    :key="service.configName"
                    :command="{ action: 'service', service }"
                    :disabled="!service.bindPort"
                >
                    <i :class="getServiceIcon(service.servicePort)"></i>
                    {{ service.serviceName }}
                    <span class="port-info">
                        ({{ service.servicePort }}:{{ service.bindPort }})
                    </span>
                </el-dropdown-item>

                <el-dropdown-item divided command="copy-all">
                    <i class="el-icon-document-copy"></i>
                    复制所有连接信息
                </el-dropdown-item>

                <el-dropdown-item command="test-connectivity">
                    <i class="el-icon-link"></i>
                    测试连通性
                </el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>

        <!-- Connection Status Indicator -->
        <div class="connection-status" v-if="showStatus">
            <el-tooltip
                :content="statusTooltip"
                placement="top"
            >
                <i
                    :class="statusIcon"
                    :style="{ color: statusColor }"
                ></i>
            </el-tooltip>
        </div>
    </div>
</template>

<script>
import QuickAccessManager from '../../utils/QuickAccessManager.js';

export default {
    name: 'QuickAccess',
    props: {
        site: {
            type: Object,
            required: true
        },
        showStatus: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            connectionStatus: null, // 'online', 'offline', 'unknown'
            testingConnectivity: false
        };
    },
    computed: {
        /**
         * Get quick access information for the site
         */
        quickInfo() {
            return QuickAccessManager.generateQuickAccessInfo(this.site);
        },

        /**
         * Check if site has multiple services
         */
        hasMultipleServices() {
            return this.quickInfo.availableServices.length > 3;
        },

        /**
         * Get status icon
         */
        statusIcon() {
            switch (this.connectionStatus) {
                case 'online':
                    return 'el-icon-success';
                case 'offline':
                    return 'el-icon-error';
                case 'testing':
                    return 'el-icon-loading';
                default:
                    return 'el-icon-question';
            }
        },

        /**
         * Get status color
         */
        statusColor() {
            switch (this.connectionStatus) {
                case 'online':
                    return '#67C23A';
                case 'offline':
                    return '#F56C6C';
                case 'testing':
                    return '#409EFF';
                default:
                    return '#909399';
            }
        },

        /**
         * Get status tooltip
         */
        statusTooltip() {
            switch (this.connectionStatus) {
                case 'online':
                    return 'Web服务在线';
                case 'offline':
                    return 'Web服务离线';
                case 'testing':
                    return '正在测试连通性...';
                default:
                    return '连通性状态未知';
            }
        }
    },
    methods: {
        /**
         * Handle web access
         */
        async handleWebAccess() {
            if (this.quickInfo.webUrl) {
                const success = QuickAccessManager.openUrl(this.quickInfo.webUrl);
                if (success) {
                    this.$emit('quick-access', 'web');
                    this.$message.success('正在打开Web界面...');
                } else {
                    this.$message.error('打开Web界面失败');
                }
            }
        },

        /**
         * Handle SSH access
         */
        async handleSSHAccess() {
            if (this.quickInfo.sshCommand) {
                const success = await QuickAccessManager.copyToClipboard(this.quickInfo.sshCommand);
                if (success) {
                    this.$emit('quick-access', 'ssh');
                    this.$message.success('SSH命令已复制到剪贴板');
                } else {
                    this.$message.error('复制SSH命令失败');
                }
            }
        },

        /**
         * Handle MySQL access
         */
        async handleMySQLAccess() {
            if (this.quickInfo.mysqlCommand) {
                const success = await QuickAccessManager.copyToClipboard(this.quickInfo.mysqlCommand);
                if (success) {
                    this.$emit('quick-access', 'mysql');
                    this.$message.success('MySQL命令已复制到剪贴板');
                } else {
                    this.$message.error('复制MySQL命令失败');
                }
            }
        },

        /**
         * Handle BS access (placeholder)
         */
        handleBSAccess() {
            this.$emit('quick-access', 'bs');
            this.$message.info('BS功能暂未实现');
        },

        /**
         * Handle dropdown command
         */
        async handleDropdownCommand(command) {
            if (typeof command === 'string') {
                switch (command) {
                    case 'copy-all':
                        await this.copyAllConnectionInfo();
                        break;
                    case 'test-connectivity':
                        await this.testConnectivity();
                        break;
                }
            } else if (command.action === 'service') {
                await this.handleServiceAccess(command.service);
            }
        },

        /**
         * Handle specific service access
         */
        async handleServiceAccess(service) {
            const host = QuickAccessManager.getCurrentHost();
            
            switch (service.servicePort) {
                case 22: // SSH
                    const sshCmd = `ssh -p ${service.bindPort} root@${host.hostname}`;
                    const sshSuccess = await QuickAccessManager.copyToClipboard(sshCmd);
                    if (sshSuccess) {
                        this.$message.success('SSH命令已复制');
                    }
                    break;
                    
                case 3306: // MySQL
                    const mysqlCmd = `mysql -h ${host.hostname} -P ${service.bindPort} -u root -p`;
                    const mysqlSuccess = await QuickAccessManager.copyToClipboard(mysqlCmd);
                    if (mysqlSuccess) {
                        this.$message.success('MySQL命令已复制');
                    }
                    break;
                    
                case 5000: // Web
                case 80:   // HTTP
                case 443:  // HTTPS
                    const protocol = service.servicePort === 443 ? 'https' : 'http';
                    const url = `${protocol}://${host.hostname}:${service.bindPort}`;
                    QuickAccessManager.openUrl(url);
                    this.$message.success('正在打开服务页面...');
                    break;
                    
                default:
                    // Generic service
                    const genericUrl = `http://${host.hostname}:${service.bindPort}`;
                    QuickAccessManager.openUrl(genericUrl);
                    this.$message.success('正在打开服务页面...');
            }
        },

        /**
         * Copy all connection information
         */
        async copyAllConnectionInfo() {
            const connections = QuickAccessManager.generateAllConnectionInfo(this.site);
            
            let infoText = `站点: ${this.site.siteName} (${this.site.siteCode})\n`;
            infoText += `MAC地址: ${this.site.macAddress}\n\n`;
            infoText += '连接信息:\n';
            
            connections.forEach(conn => {
                infoText += `${conn.serviceName}: `;
                if (conn.type === 'url') {
                    infoText += `${conn.url}\n`;
                } else {
                    infoText += `${conn.command}\n`;
                }
            });
            
            const success = await QuickAccessManager.copyToClipboard(infoText);
            if (success) {
                this.$message.success('所有连接信息已复制到剪贴板');
            } else {
                this.$message.error('复制连接信息失败');
            }
        },

        /**
         * Test connectivity to web service
         */
        async testConnectivity() {
            if (!this.quickInfo.webUrl) {
                this.$message.warning('该站点没有Web服务，无法测试连通性');
                return;
            }

            this.connectionStatus = 'testing';
            this.testingConnectivity = true;

            try {
                const isAccessible = await QuickAccessManager.validateServiceAccess(this.site, 5000);
                this.connectionStatus = isAccessible ? 'online' : 'offline';
                
                const message = isAccessible ? 'Web服务连通正常' : 'Web服务连通失败';
                const type = isAccessible ? 'success' : 'warning';
                this.$message({ message, type });
                
            } catch (error) {
                this.connectionStatus = 'offline';
                this.$message.error('连通性测试失败: ' + error.message);
            } finally {
                this.testingConnectivity = false;
            }
        },

        /**
         * Get service icon by port
         */
        getServiceIcon(port) {
            const iconMap = {
                22: 'el-icon-monitor',      // SSH
                80: 'el-icon-view',         // HTTP
                443: 'el-icon-view',        // HTTPS
                3306: 'el-icon-coin',       // MySQL
                5000: 'el-icon-view',       // Web
                8080: 'el-icon-view',       // HTTP Alt
                9000: 'el-icon-view'        // Web Alt
            };
            
            return iconMap[port] || 'el-icon-link';
        },

        /**
         * Get button type for service
         */
        getServiceButtonType(port) {
            switch (port) {
                case 22: return 'info';     // SSH
                case 3306: return 'warning'; // MySQL
                case 5000: return 'success'; // Web
                case 80:
                case 443: return 'primary'; // HTTP/HTTPS
                default: return '';
            }
        }
    }
};
</script>

<style scoped>
.quick-access {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
}

.access-button {
    margin: 0;
    padding: 4px 8px;
    font-size: 11px;
    line-height: 1.2;
    border-radius: 3px;
    transition: all 0.3s ease;
}

.access-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.primary-access {
    font-weight: 600;
    position: relative;
}

.primary-access::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #67C23A, #85CE61);
    border-radius: 5px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.primary-access:hover::before {
    opacity: 1;
}

.more-actions {
    margin-left: 4px;
}

.more-button {
    font-size: 11px;
    padding: 4px 6px;
    color: #606266;
}

.more-button:hover {
    color: #409EFF;
}

.connection-status {
    margin-left: 6px;
    display: flex;
    align-items: center;
}

.connection-status i {
    font-size: 12px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
}

/* Dropdown styling */
.el-dropdown-menu /deep/ .el-dropdown-menu__item {
    font-size: 12px;
    line-height: 24px;
    padding: 6px 12px;
}

.port-info {
    color: #909399;
    font-family: monospace;
    font-size: 11px;
    margin-left: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
    .quick-access {
        justify-content: center;
    }
    
    .access-button {
        flex: 1;
        min-width: 50px;
    }
    
    .more-actions {
        margin-left: 0;
        margin-top: 4px;
    }
}

/* Button size variations */
.access-button.el-button--mini {
    padding: 3px 6px;
    font-size: 10px;
}

/* Loading animation for testing connectivity */
.connection-status .el-icon-loading {
    animation: rotating 2s linear infinite;
}

@keyframes rotating {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Disabled button styling */
.access-button.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Button group appearance */
.quick-access {
    background: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    padding: 2px;
}

/* Hover effects for better UX */
.access-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.access-button:active {
    transform: translateY(0);
}

/* Success feedback animation */
.access-button.success-feedback {
    animation: successPulse 0.6s ease;
}

@keyframes successPulse {
    0% { transform: scale(1); background-color: inherit; }
    50% { transform: scale(1.05); background-color: #67C23A; }
    100% { transform: scale(1); background-color: inherit; }
}
</style>