/**
 * Quick Access Manager
 * Handles generation of quick access URLs and commands for different services
 */
export class QuickAccessManager {

    /**
     * Get current host information from browser
     * @returns {Object} Host information {hostname, port, protocol}
     */
    static getCurrentHost() {
        const location = window.location;
        return {
            hostname: location.hostname,
            port: location.port,
            protocol: location.protocol,
            host: location.host
        };
    }

    /**
     * Find STCP configuration by MAC address and service port
     * @param {Object} site - Site object with configs
     * @param {number} servicePort - Service port number
     * @returns {Object|null} STCP configuration or null
     */
    static findConfigByPort(site, servicePort) {
        if (!site || !site.configs || !Array.isArray(site.configs)) {
            return null;
        }

        return site.configs.find(config => {
            // Extract port from configuration name (e.g., "R-E721EE345A2-22" -> 22)
            const configPort = this.extractPortFromConfigName(config.name);
            return configPort === servicePort;
        });
    }

    /**
     * Extract port number from configuration name
     * @param {string} configName - Configuration name
     * @returns {number|null} Port number or null
     */
    static extractPortFromConfigName(configName) {
        if (!configName) return null;
        
        const parts = configName.split('-');
        if (parts.length >= 3) {
            const port = parseInt(parts[parts.length - 1]);
            return isNaN(port) ? null : port;
        }
        return null;
    }

    /**
     * Generate web access URL for site (port 5000)
     * @param {Object} site - Site object
     * @returns {string|null} Web access URL or null
     */
    static generateWebAccessUrl(site) {
        const config = this.findConfigByPort(site, QuickAccessManager.SERVICE_PORTS.WEB);
        if (!config || !config.bind_port) {
            return null;
        }

        const host = this.getCurrentHost();
        const protocol = host.protocol === 'https:' ? 'http:' : 'http:'; // Force HTTP for web access
        return `${protocol}//${host.hostname}:${config.bind_port}`;
    }

    /**
     * Generate SSH connection command
     * @param {Object} site - Site object
     * @param {string} username - SSH username (default: 'root')
     * @returns {string|null} SSH command or null
     */
    static generateSSHCommand(site, username = 'root') {
        const config = this.findConfigByPort(site, QuickAccessManager.SERVICE_PORTS.SSH);
        if (!config || !config.bind_port) {
            return null;
        }

        const host = this.getCurrentHost();
        return `ssh -p ${config.bind_port} ${username}@${host.hostname}`;
    }

    /**
     * Generate MySQL connection command
     * @param {Object} site - Site object
     * @param {string} username - MySQL username (default: 'root')
     * @returns {string|null} MySQL command or null
     */
    static generateMySQLCommand(site, username = 'root') {
        const config = this.findConfigByPort(site, QuickAccessManager.SERVICE_PORTS.MYSQL);
        if (!config || !config.bind_port) {
            return null;
        }

        const host = this.getCurrentHost();
        return `mysql -h ${host.hostname} -P ${config.bind_port} -u ${username} -p`;
    }

    /**
     * Generate all quick access information for a site
     * @param {Object} site - Site object
     * @returns {Object} Quick access information
     */
    static generateQuickAccessInfo(site) {
        const info = {
            webUrl: this.generateWebAccessUrl(site),
            sshCommand: this.generateSSHCommand(site),
            mysqlCommand: this.generateMySQLCommand(site),
            availableServices: [],
            allPorts: []
        };

        if (site.configs && Array.isArray(site.configs)) {
            site.configs.forEach(config => {
                const servicePort = this.extractPortFromConfigName(config.name);
                if (servicePort && config.bind_port) {
                    const serviceInfo = {
                        servicePort,
                        bindPort: parseInt(config.bind_port),
                        configName: config.name,
                        serviceName: this.getServiceName(servicePort)
                    };

                    info.availableServices.push(serviceInfo);
                    info.allPorts.push(serviceInfo);
                }
            });
        }

        // Sort by service port
        info.availableServices.sort((a, b) => a.servicePort - b.servicePort);
        info.allPorts.sort((a, b) => a.servicePort - b.servicePort);

        return info;
    }

    /**
     * Get service name by port number
     * @param {number} port - Port number
     * @returns {string} Service name
     */
    static getServiceName(port) {
        const serviceMap = {
            22: 'SSH',
            80: 'HTTP',
            443: 'HTTPS',
            3306: 'MySQL',
            5000: 'Web',
            8080: 'HTTP-Alt',
            9000: 'Web-Alt'
        };

        return serviceMap[port] || `Port-${port}`;
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                textArea.remove();
                return result;
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    /**
     * Open URL in new tab
     * @param {string} url - URL to open
     * @returns {boolean} Success status
     */
    static openUrl(url) {
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            return true;
        } catch (error) {
            console.error('Failed to open URL:', error);
            return false;
        }
    }

    /**
     * Generate connection info for all services
     * @param {Object} site - Site object
     * @returns {Array} Array of connection info objects
     */
    static generateAllConnectionInfo(site) {
        const connections = [];
        const host = this.getCurrentHost();

        if (site.configs && Array.isArray(site.configs)) {
            site.configs.forEach(config => {
                const servicePort = this.extractPortFromConfigName(config.name);
                const bindPort = parseInt(config.bind_port);
                
                if (servicePort && bindPort) {
                    const connection = {
                        serviceName: this.getServiceName(servicePort),
                        servicePort,
                        bindPort,
                        configName: config.name
                    };

                    // Generate appropriate connection info based on service type
                    switch (servicePort) {
                        case 22: // SSH
                            connection.command = `ssh -p ${bindPort} root@${host.hostname}`;
                            connection.type = 'command';
                            connection.description = 'SSH连接命令';
                            break;
                        
                        case 3306: // MySQL
                            connection.command = `mysql -h ${host.hostname} -P ${bindPort} -u root -p`;
                            connection.type = 'command';
                            connection.description = 'MySQL连接命令';
                            break;
                        
                        case 5000: // Web service
                            connection.url = `http://${host.hostname}:${bindPort}`;
                            connection.type = 'url';
                            connection.description = 'Web界面访问';
                            break;
                        
                        case 80: // HTTP
                            connection.url = `http://${host.hostname}:${bindPort}`;
                            connection.type = 'url';
                            connection.description = 'HTTP服务访问';
                            break;
                        
                        case 443: // HTTPS
                            connection.url = `https://${host.hostname}:${bindPort}`;
                            connection.type = 'url';
                            connection.description = 'HTTPS服务访问';
                            break;
                        
                        default:
                            connection.url = `http://${host.hostname}:${bindPort}`;
                            connection.type = 'url';
                            connection.description = `端口${servicePort}服务访问`;
                    }

                    connections.push(connection);
                }
            });
        }

        return connections.sort((a, b) => a.servicePort - b.servicePort);
    }

    /**
     * Validate if a service is accessible
     * @param {Object} site - Site object
     * @param {number} servicePort - Service port to check
     * @returns {Promise<boolean>} Accessibility status
     */
    static async validateServiceAccess(site, servicePort) {
        const config = this.findConfigByPort(site, servicePort);
        if (!config || !config.bind_port) {
            return false;
        }

        const host = this.getCurrentHost();
        const url = `http://${host.hostname}:${config.bind_port}`;

        try {
            // Use a simple fetch with short timeout to check if service responds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                mode: 'no-cors' // Avoid CORS issues
            });

            clearTimeout(timeoutId);
            return true; // If we get here, the service is likely accessible
        } catch (error) {
            // Service might be running but not HTTP, or genuinely inaccessible
            return false;
        }
    }

    /**
     * Get quick access button configuration
     * @param {Object} site - Site object
     * @returns {Array} Array of button configurations
     */
    static getQuickAccessButtons(site) {
        const buttons = [];
        const quickInfo = this.generateQuickAccessInfo(site);

        // Web access button (port 5000)
        if (quickInfo.webUrl) {
            buttons.push({
                type: 'web',
                label: '访问',
                title: '打开Web界面',
                icon: 'el-icon-view',
                action: () => this.openUrl(quickInfo.webUrl),
                url: quickInfo.webUrl,
                primary: true
            });
        }

        // SSH button (port 22)
        if (quickInfo.sshCommand) {
            buttons.push({
                type: 'ssh',
                label: 'SSH',
                title: '复制SSH连接命令',
                icon: 'el-icon-document-copy',
                action: () => this.copyToClipboard(quickInfo.sshCommand),
                command: quickInfo.sshCommand
            });
        }

        // MySQL button (port 3306)
        if (quickInfo.mysqlCommand) {
            buttons.push({
                type: 'mysql',
                label: 'MySQL',
                title: '复制MySQL连接命令',
                icon: 'el-icon-document-copy',
                action: () => this.copyToClipboard(quickInfo.mysqlCommand),
                command: quickInfo.mysqlCommand
            });
        }

        // BS button (placeholder for future functionality)
        buttons.push({
            type: 'bs',
            label: 'BS',
            title: 'BS功能 (预留)',
            icon: 'el-icon-setting',
            action: () => console.log('BS functionality not implemented'),
            disabled: true
        });

        return buttons;
    }
}

/**
 * Service port mappings
 */
QuickAccessManager.SERVICE_PORTS = {
    SSH: 22,
    MYSQL: 3306,
    WEB: 5000,
    HTTP: 80,
    HTTPS: 443
};

export default QuickAccessManager;