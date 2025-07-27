/**
 * Port Allocation Utility
 * Handles automatic port allocation for STCP configurations
 */
export class PortAllocator {

    /**
     * Allocate a single available port
     * @param {Array} usedPorts - Array of already used port numbers
     * @param {number} startPort - Starting port for allocation (default: 18000)
     * @returns {number} Allocated port number
     */
    static allocatePort(usedPorts = [], startPort = PortAllocator.DEFAULT_START_PORT) {
        const usedPortSet = new Set(usedPorts.map(port => parseInt(port)));
        
        for (let port = startPort; port <= PortAllocator.MAX_PORT; port++) {
            if (!usedPortSet.has(port)) {
                return port;
            }
        }
        
        throw new Error(`No available ports starting from ${startPort}`);
    }

    /**
     * Allocate multiple consecutive or non-consecutive ports
     * @param {Array} usedPorts - Array of already used port numbers
     * @param {number} count - Number of ports to allocate
     * @param {number} startPort - Starting port for allocation
     * @param {boolean} consecutive - Whether ports should be consecutive
     * @returns {Array} Array of allocated port numbers
     */
    static allocatePorts(usedPorts = [], count, startPort = PortAllocator.DEFAULT_START_PORT, consecutive = false) {
        if (count <= 0) {
            return [];
        }

        const usedPortSet = new Set(usedPorts.map(port => parseInt(port)));
        const allocatedPorts = [];

        if (consecutive) {
            // Find consecutive ports
            for (let port = startPort; port <= PortAllocator.MAX_PORT - count + 1; port++) {
                let consecutiveFound = true;
                
                for (let i = 0; i < count; i++) {
                    if (usedPortSet.has(port + i)) {
                        consecutiveFound = false;
                        break;
                    }
                }
                
                if (consecutiveFound) {
                    for (let i = 0; i < count; i++) {
                        allocatedPorts.push(port + i);
                    }
                    return allocatedPorts;
                }
            }
            
            throw new Error(`Could not find ${count} consecutive ports starting from ${startPort}`);
        } else {
            // Find non-consecutive ports
            let currentPort = startPort;
            
            while (allocatedPorts.length < count && currentPort <= PortAllocator.MAX_PORT) {
                if (!usedPortSet.has(currentPort)) {
                    allocatedPorts.push(currentPort);
                    usedPortSet.add(currentPort); // Add to used set for next iteration
                }
                currentPort++;
            }
            
            if (allocatedPorts.length < count) {
                throw new Error(`Could not allocate ${count} ports starting from ${startPort}`);
            }
            
            return allocatedPorts;
        }
    }

    /**
     * Allocate ports for batch site creation
     * @param {Array} usedPorts - Array of already used port numbers
     * @param {number} siteCount - Number of sites
     * @param {Array} portsPerSite - Array of port numbers for each site (default: [22, 3306, 5000])
     * @param {number} startPort - Starting port for allocation
     * @returns {Array} Array of site port allocations
     */
    static allocatePortsForSites(usedPorts = [], siteCount, portsPerSite = [22, 3306, 5000], startPort = PortAllocator.DEFAULT_START_PORT) {
        const totalPortsNeeded = siteCount * portsPerSite.length;
        const allocatedPorts = this.allocatePorts(usedPorts, totalPortsNeeded, startPort, false);
        
        const siteAllocations = [];
        let portIndex = 0;
        
        for (let siteIndex = 0; siteIndex < siteCount; siteIndex++) {
            const sitePortMap = new Map();
            
            portsPerSite.forEach(servicePort => {
                sitePortMap.set(servicePort, allocatedPorts[portIndex++]);
            });
            
            siteAllocations.push(sitePortMap);
        }
        
        return siteAllocations;
    }

    /**
     * Generate port allocation summary
     * @param {Array} usedPorts - Array of used port numbers
     * @param {number} startPort - Starting port to analyze
     * @param {number} endPort - Ending port to analyze (default: startPort + 1000)
     * @returns {Object} Port allocation summary
     */
    static getPortAllocationSummary(usedPorts = [], startPort = PortAllocator.DEFAULT_START_PORT, endPort = null) {
        endPort = endPort || startPort + 1000;
        
        const usedPortSet = new Set(usedPorts.map(port => parseInt(port)));
        const rangeSize = endPort - startPort + 1;
        const usedInRange = [];
        const availableInRange = [];
        
        for (let port = startPort; port <= endPort; port++) {
            if (usedPortSet.has(port)) {
                usedInRange.push(port);
            } else {
                availableInRange.push(port);
            }
        }
        
        return {
            startPort,
            endPort,
            rangeSize,
            totalUsed: usedPortSet.size,
            usedInRange: usedInRange.length,
            availableInRange: availableInRange.length,
            utilizationRate: (usedInRange.length / rangeSize * 100).toFixed(2) + '%',
            nextAvailable: availableInRange.length > 0 ? availableInRange[0] : null,
            usedPorts: usedInRange.sort((a, b) => a - b),
            availablePorts: availableInRange.slice(0, 20) // Show first 20 available ports
        };
    }

    /**
     * Validate port number
     * @param {number} port - Port number to validate
     * @returns {boolean} True if valid
     */
    static isValidPort(port) {
        return Number.isInteger(port) && port >= 1 && port <= PortAllocator.MAX_PORT;
    }

    /**
     * Check if port is in well-known range (0-1023)
     * @param {number} port - Port number
     * @returns {boolean} True if well-known port
     */
    static isWellKnownPort(port) {
        return port >= 0 && port <= 1023;
    }

    /**
     * Check if port is in registered range (1024-49151)
     * @param {number} port - Port number
     * @returns {boolean} True if registered port
     */
    static isRegisteredPort(port) {
        return port >= 1024 && port <= 49151;
    }

    /**
     * Check if port is in dynamic/private range (49152-65535)
     * @param {number} port - Port number
     * @returns {boolean} True if dynamic port
     */
    static isDynamicPort(port) {
        return port >= 49152 && port <= 65535;
    }

    /**
     * Get recommended port ranges for STCP allocation
     * @returns {Object} Recommended port ranges
     */
    static getRecommendedRanges() {
        return {
            conservative: { start: 18000, end: 20000, description: 'Conservative range avoiding common services' },
            extended: { start: 15000, end: 25000, description: 'Extended range for larger deployments' },
            dynamic: { start: 49152, end: 55000, description: 'Dynamic port range (RFC 6335)' }
        };
    }

    /**
     * Find gaps in port allocation
     * @param {Array} usedPorts - Array of used port numbers
     * @param {number} minGapSize - Minimum gap size to report
     * @returns {Array} Array of gap objects {start, end, size}
     */
    static findPortGaps(usedPorts = [], minGapSize = 10) {
        const uniquePorts = Array.from(new Set(usedPorts.map(port => parseInt(port))));
        const sortedPorts = uniquePorts.sort((a, b) => a - b);
        const gaps = [];
        
        for (let i = 0; i < sortedPorts.length - 1; i++) {
            const gapStart = sortedPorts[i] + 1;
            const gapEnd = sortedPorts[i + 1] - 1;
            const gapSize = gapEnd - gapStart + 1;
            
            if (gapSize >= minGapSize) {
                gaps.push({
                    start: gapStart,
                    end: gapEnd,
                    size: gapSize
                });
            }
        }
        
        return gaps;
    }
}

/**
 * Default starting port for allocation
 */
PortAllocator.DEFAULT_START_PORT = 18000;

/**
 * Maximum port number to consider
 */
PortAllocator.MAX_PORT = 65535;

export default PortAllocator;