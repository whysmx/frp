import INIParser from './INIParser.js';
import PortAllocator from './PortAllocator.js';

/**
 * STCP Configuration Manager
 * Handles CRUD operations for STCP configurations and site management
 */
export class STCPManager {
    constructor() {
        this.configData = null;
        this.sites = [];
        this.lastSyncTime = null;
    }

    /**
     * Load configuration from API
     * @returns {Promise<Object>} Configuration data
     */
    async loadConfig() {
        try {
            const response = await fetch('/api/config', { credentials: 'include' });
            const configText = await response.text();
            
            this.configData = INIParser.parse(configText);
            this.sites = INIParser.groupConfigsBySite(this.configData.stcpConfigs, this.configData.devices);
            this.lastSyncTime = new Date();
            
            return this.configData;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw error;
        }
    }

    /**
     * Save configuration to API
     * @returns {Promise<void>}
     */
    async saveConfig() {
        try {
            const configText = INIParser.generate(this.configData);
            
            const response = await fetch('/api/config', {
                credentials: 'include',
                method: 'PUT',
                body: configText,
            });

            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }

            // Reload configuration after saving
            await fetch('/api/reload', { credentials: 'include' });
            this.lastSyncTime = new Date();
            
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Get all sites
     * @returns {Array} Array of site objects
     */
    getSites() {
        return this.sites;
    }

    /**
     * Get site by MAC address
     * @param {string} macAddress - MAC address
     * @returns {Object|null} Site object or null
     */
    getSiteByMac(macAddress) {
        return this.sites.find(site => site.macAddress === macAddress);
    }

    /**
     * Add new site
     * @param {Object} siteData - Site data {siteCode, siteName, macAddress, password, tags}
     * @param {Array} defaultPorts - Default ports to create (default: [22, 3306, 5000])
     * @returns {Object} Created site object
     */
    addSite(siteData, defaultPorts = [22, 3306, 5000]) {
        // Validate MAC address uniqueness
        if (this.getSiteByMac(siteData.macAddress)) {
            throw new Error(`Site with MAC address ${siteData.macAddress} already exists`);
        }

        // Create device entry
        const device = {
            macAddress: siteData.macAddress,
            siteCode: siteData.siteCode,
            siteName: siteData.siteName || siteData.siteCode,
            password: siteData.password || '',
            tags: siteData.tags || []
        };

        // Add to devices array
        this.configData.devices.push(device);

        // Create STCP configurations for default ports
        const configs = this.createSTCPConfigs(siteData.macAddress, siteData.siteCode, defaultPorts);
        
        // Add to STCP configs
        this.configData.stcpConfigs = this.configData.stcpConfigs.concat(configs);

        // Create site object
        const site = Object.assign({}, device, {
            configs: configs
        });

        // Add to sites array
        this.sites.push(site);

        return site;
    }

    /**
     * Update site information
     * @param {string} macAddress - MAC address (unchangeable identifier)
     * @param {Object} updates - Updates {siteCode, siteName, password, tags}
     * @returns {Object} Updated site object
     */
    updateSite(macAddress, updates) {
        const site = this.getSiteByMac(macAddress);
        if (!site) {
            throw new Error(`Site with MAC address ${macAddress} not found`);
        }

        // Update device entry
        const device = this.configData.devices.find(d => d.macAddress === macAddress);
        if (device) {
            if (updates.siteCode !== undefined) device.siteCode = updates.siteCode;
            if (updates.siteName !== undefined) device.siteName = updates.siteName;
            if (updates.password !== undefined) device.password = updates.password;
            if (updates.tags !== undefined) device.tags = updates.tags;
        }

        // Update site object
        Object.assign(site, updates);

        return site;
    }

    /**
     * Delete site and all its configurations
     * @param {string} macAddress - MAC address
     * @returns {boolean} Success status
     */
    deleteSite(macAddress) {
        const siteIndex = this.sites.findIndex(site => site.macAddress === macAddress);
        if (siteIndex === -1) {
            return false;
        }

        // Remove device entry
        const deviceIndex = this.configData.devices.findIndex(d => d.macAddress === macAddress);
        if (deviceIndex !== -1) {
            this.configData.devices.splice(deviceIndex, 1);
        }

        // Remove all STCP configurations for this site
        this.configData.stcpConfigs = this.configData.stcpConfigs.filter(config => config.sk !== macAddress);

        // Remove from sites array
        this.sites.splice(siteIndex, 1);

        return true;
    }

    /**
     * Add STCP configuration to site
     * @param {string} macAddress - MAC address
     * @param {Object} configData - Configuration data {port, bind_port, server_name}
     * @returns {Object} Created configuration
     */
    addSTCPConfig(macAddress, configData) {
        const site = this.getSiteByMac(macAddress);
        if (!site) {
            throw new Error(`Site with MAC address ${macAddress} not found`);
        }

        // Determine port if not provided
        const port = configData.port || INIParser.extractPortFromConfigName(configData.server_name);
        if (!port) {
            throw new Error('Port number is required');
        }

        // Allocate bind port if not provided
        const bindPort = configData.bind_port || PortAllocator.allocatePort(this.getAllUsedPorts());

        // Generate configuration name
        const configName = configData.name || INIParser.generateConfigName('R', macAddress, port);

        const config = {
            name: configName,
            type: 'stcp',
            role: 'visitor',
            server_name: configData.server_name || configName,
            sk: macAddress,
            bind_addr: configData.bind_addr || '0.0.0.0',
            bind_port: bindPort
        };

        // Add to configurations
        this.configData.stcpConfigs.push(config);
        site.configs.push(config);

        return config;
    }

    /**
     * Update STCP configuration
     * @param {string} configName - Configuration name
     * @param {Object} updates - Updates
     * @returns {Object} Updated configuration
     */
    updateSTCPConfig(configName, updates) {
        const config = this.configData.stcpConfigs.find(c => c.name === configName);
        if (!config) {
            throw new Error(`STCP configuration ${configName} not found`);
        }

        Object.assign(config, updates);
        return config;
    }

    /**
     * Delete STCP configuration
     * @param {string} configName - Configuration name
     * @returns {boolean} Success status
     */
    deleteSTCPConfig(configName) {
        const configIndex = this.configData.stcpConfigs.findIndex(c => c.name === configName);
        if (configIndex === -1) {
            return false;
        }

        const config = this.configData.stcpConfigs[configIndex];
        
        // Remove from main configs
        this.configData.stcpConfigs.splice(configIndex, 1);

        // Remove from site configs
        const site = this.getSiteByMac(config.sk);
        if (site) {
            const siteConfigIndex = site.configs.findIndex(c => c.name === configName);
            if (siteConfigIndex !== -1) {
                site.configs.splice(siteConfigIndex, 1);
            }
        }

        return true;
    }

    /**
     * Create STCP configurations for a site
     * @param {string} macAddress - MAC address
     * @param {string} siteCode - Site code
     * @param {Array} ports - Array of port numbers
     * @returns {Array} Array of created configurations
     */
    createSTCPConfigs(macAddress, siteCode, ports) {
        const configs = [];
        const usedPorts = this.getAllUsedPorts();

        ports.forEach(port => {
            const bindPort = PortAllocator.allocatePort(usedPorts);
            usedPorts.push(bindPort); // Add to used ports for next allocation

            const configName = INIParser.generateConfigName('R', macAddress, port);
            
            const config = {
                name: configName,
                type: 'stcp',
                role: 'visitor',
                server_name: configName,
                sk: macAddress,
                bind_addr: '0.0.0.0',
                bind_port: bindPort
            };

            configs.push(config);
        });

        return configs;
    }

    /**
     * Get all used bind ports
     * @returns {Array} Array of used port numbers
     */
    getAllUsedPorts() {
        return this.configData.stcpConfigs
            .map(config => parseInt(config.bind_port))
            .filter(port => !isNaN(port));
    }

    /**
     * Batch import sites
     * @param {string} importText - Import text (format: siteCode macAddress [siteName])
     * @param {Array} defaultPorts - Default ports for each site
     * @returns {Object} Import result {success: Array, failed: Array}
     */
    batchImportSites(importText, defaultPorts = [22, 3306, 5000]) {
        const lines = importText.split('\n').map(line => line.trim()).filter(line => line);
        const result = { success: [], failed: [] };

        lines.forEach((line, index) => {
            try {
                const parts = line.split(/\s+/);
                if (parts.length < 2) {
                    throw new Error('Invalid format: requires at least siteCode and macAddress');
                }

                const siteData = {
                    siteCode: parts[0],
                    macAddress: parts[1],
                    siteName: parts[2] || parts[0],
                    password: '',
                    tags: []
                };

                const site = this.addSite(siteData, defaultPorts);
                result.success.push({ line: index + 1, site });

            } catch (error) {
                result.failed.push({ line: index + 1, error: error.message, text: line });
            }
        });

        return result;
    }

    /**
     * Search sites by keyword
     * @param {string} keyword - Search keyword
     * @returns {Array} Filtered sites
     */
    searchSites(keyword) {
        if (!keyword) return this.sites;

        const lowerKeyword = keyword.toLowerCase();
        return this.sites.filter(site => 
            site.siteCode.toLowerCase().includes(lowerKeyword) ||
            site.siteName.toLowerCase().includes(lowerKeyword) ||
            site.macAddress.toLowerCase().includes(lowerKeyword) ||
            site.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * Filter sites by tags
     * @param {Array} tags - Array of tag names
     * @returns {Array} Filtered sites
     */
    filterSitesByTags(tags) {
        if (!tags || tags.length === 0) return this.sites;

        return this.sites.filter(site =>
            tags.some(tag => site.tags.includes(tag))
        );
    }

    /**
     * Get all unique tags
     * @returns {Array} Array of unique tags with count
     */
    getAllTags() {
        const tagCounts = new Map();
        
        this.sites.forEach(site => {
            site.tags.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });

        return Array.from(tagCounts.entries()).map(([tag, count]) => ({ tag, count }));
    }
}

export default STCPManager;