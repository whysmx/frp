/**
 * INI Configuration File Parser
 * Supports parsing standard INI sections and special DEVICE_REGISTRY area
 */
export class INIParser {
    /**
     * Parse INI content into structured data
     * @param {string} content - Raw INI file content
     * @returns {Object} Parsed configuration object
     */
    static parse(content) {
        const result = {
            common: {},
            devices: [],
            stcpConfigs: [],
            otherSections: []
        };

        const lines = content.split('\n').map(line => line.trim());
        let currentSection = null;
        let inDeviceRegistry = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines
            if (!line) continue;

            // Handle device registry markers
            if (line === '# DEVICE_REGISTRY_START') {
                inDeviceRegistry = true;
                continue;
            }
            if (line === '# DEVICE_REGISTRY_END') {
                inDeviceRegistry = false;
                continue;
            }

            // Parse device registry entries
            if (inDeviceRegistry && line.startsWith('# ') && line.includes('|')) {
                const deviceLine = line.substring(2); // Remove '# '
                const device = this.parseDeviceEntry(deviceLine);
                if (device) {
                    result.devices.push(device);
                }
                continue;
            }

            // Skip other comments
            if (line.startsWith('#')) continue;

            // Parse section headers
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.substring(1, line.length - 1);
                continue;
            }

            // Parse key-value pairs
            if (line.includes('=') && currentSection) {
                const [key, value] = line.split('=').map(part => part.trim());
                
                if (currentSection === 'common') {
                    result.common[key] = value;
                } else {
                    // Find or create section - we'll determine if it's STCP later
                    let section = result.otherSections.find(s => s.name === currentSection);
                    if (!section) {
                        section = { name: currentSection, config: {} };
                        result.otherSections.push(section);
                    }
                    section.config[key] = value;
                }
            }
        }

        // Post-process: identify STCP configurations
        result.otherSections = result.otherSections.filter(section => {
            if (section.config.type === 'stcp' && section.config.role === 'visitor') {
                // This is an STCP configuration, move it to stcpConfigs
                const stcpConfig = Object.assign({ name: section.name }, section.config);
                result.stcpConfigs.push(stcpConfig);
                return false; // Remove from otherSections
            }
            return true; // Keep in otherSections
        });

        return result;
    }

    /**
     * Parse device entry from DEVICE_REGISTRY
     * @param {string} deviceLine - Device entry line (MAC|Code|Name|Password|Tags)
     * @returns {Object|null} Parsed device object
     */
    static parseDeviceEntry(deviceLine) {
        const parts = deviceLine.split('|').map(part => part.trim());
        if (parts.length < 2) return null;

        return {
            macAddress: parts[0] || '',
            siteCode: parts[1] || '',
            siteName: parts[2] || parts[1], // Use siteCode as fallback
            password: parts[3] || '',
            tags: parts[4] ? parts[4].split(',').map(tag => tag.trim()).filter(tag => tag) : []
        };
    }

    /**
     * Check if section is STCP configuration
     * @param {string} sectionName - Section name
     * @param {Array} existingConfigs - Existing STCP configs
     * @returns {boolean} True if STCP section
     */
    static isSTCPSection(sectionName, existingConfigs) {
        // Check if this section name follows STCP naming pattern
        // STCP sections typically have format like "R-MACADDRESS-PORT" or similar
        return sectionName.includes('-') && sectionName !== 'common';
    }

    /**
     * Generate INI content from structured data
     * @param {Object} data - Structured configuration data
     * @returns {string} Generated INI content
     */
    static generate(data) {
        let content = '';

        // Generate common section
        if (data.common && Object.keys(data.common).length > 0) {
            content += '[common]\n';
            for (const [key, value] of Object.entries(data.common)) {
                content += `${key} = ${value}\n`;
            }
            content += '\n';
        }

        // Generate device registry section
        if (data.devices && data.devices.length > 0) {
            content += '# ==================== 设备元配置区域 ====================\n';
            content += '# 格式：MAC地址|站点编号|站点名称|加密密码|标签\n';
            content += '# 标签：多个标签用逗号分隔，仅用于筛选分类\n';
            content += '# DEVICE_REGISTRY_START\n\n';

            data.devices.forEach(device => {
                const tags = device.tags ? device.tags.join(',') : '';
                content += `# ${device.macAddress}|${device.siteCode}|${device.siteName}|${device.password}|${tags}\n`;
            });

            content += '\n# DEVICE_REGISTRY_END\n\n';
        }

        // Generate STCP configurations
        if (data.stcpConfigs && data.stcpConfigs.length > 0) {
            data.stcpConfigs.forEach(config => {
                content += `[${config.name}]\n`;
                for (const [key, value] of Object.entries(config)) {
                    if (key !== 'name') {
                        content += `${key} = ${value}\n`;
                    }
                }
                content += '\n';
            });
        }

        // Generate other sections
        if (data.otherSections && data.otherSections.length > 0) {
            data.otherSections.forEach(section => {
                content += `[${section.name}]\n`;
                for (const [key, value] of Object.entries(section.config)) {
                    content += `${key} = ${value}\n`;
                }
                content += '\n';
            });
        }

        return content;
    }

    /**
     * Group STCP configurations by MAC address (sk value)
     * @param {Array} stcpConfigs - Array of STCP configurations
     * @param {Array} devices - Array of device information
     * @returns {Array} Array of site objects with grouped configurations
     */
    static groupConfigsBySite(stcpConfigs, devices) {
        const sites = new Map();

        // Initialize sites from device registry
        devices.forEach(device => {
            sites.set(device.macAddress, {
                macAddress: device.macAddress,
                siteCode: device.siteCode,
                siteName: device.siteName,
                password: device.password,
                tags: device.tags,
                configs: []
            });
        });

        // Group STCP configs by sk (MAC address)
        stcpConfigs.forEach(config => {
            if (config.type === 'stcp' && config.role === 'visitor' && config.sk) {
                if (!sites.has(config.sk)) {
                    // Create site entry if not found in device registry
                    sites.set(config.sk, {
                        macAddress: config.sk,
                        siteCode: config.sk,
                        siteName: config.sk,
                        password: '',
                        tags: [],
                        configs: []
                    });
                }
                
                const site = sites.get(config.sk);
                site.configs.push(config);
            }
        });

        return Array.from(sites.values());
    }

    /**
     * Extract port number from STCP configuration name
     * @param {string} configName - Configuration name (e.g., "R-E721EE345A2-22")
     * @returns {number|null} Port number or null if not found
     */
    static extractPortFromConfigName(configName) {
        const parts = configName.split('-');
        if (parts.length >= 3) {
            const port = parseInt(parts[parts.length - 1]);
            return isNaN(port) ? null : port;
        }
        return null;
    }

    /**
     * Generate STCP configuration name
     * @param {string} prefix - Configuration prefix (e.g., "R" for radiation)
     * @param {string} macAddress - MAC address
     * @param {number} port - Port number
     * @returns {string} Generated configuration name
     */
    static generateConfigName(prefix, macAddress, port) {
        return `${prefix}-${macAddress}-${port}`;
    }
}

export default INIParser;