
/*
    * CDISC Library Tool
        * Tool for accessing CDISC Library API to retrieve SDTM domain definitions and variable definitions
*/
export class CDISCLibraryTool extends BaseTool {
    constructor(cacheService, sdtm_version = '3-4') {
        super(cacheService);
        this.baseUrl = 'https://api.library.cdisc.org/api/';
        this.sdtm_version = sdtm_version;
    }

    /**
     * Streamline dataset extraction
     * @param {object} dataset 
     * @returns 
     */
    extractDataset(dataset) {
        // Streamline variable extraction
        const variables = dataset.datasetVariables.map(variable => {
            return {
                name: variable.name,
                label: variable.label,
                type: variable.simpleDatatype,
                description: variable.description || null,
            };
        });

        return {
            domain_code: dataset.href.split('/').pop(),
            name: dataset.title,
            href: dataset.href,
            variables: variables,   
        };
    }

    /**
     * Fetch an SDTM Domain Variable Definition by its domain code
     */
    async fetchSDTMDomainVariableDefinition(domainCode, variableName) {
        const cacheKey = this.getCacheKey('cdisc_domain_definition', domainCode);
        let cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            console.error(`Cache hit for domain definition: ${domainCode}`);
            return cachedData;
        }

    }

    /**
     * Fetch an SDTM Domain definition by its domain code
     */
    async fetchSDTMDomainDefinition(domainCode) {
        const cacheKey = this.getCacheKey('cdisc_domain_definition', domainCode);
        let cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            console.error(`Cache hit for domain definition: ${domainCode}`);
            return cachedData;
        }

        const url = `${this.baseUrl}/mdr/sdtmig/${this.sdtm_version}/datasets/${encodeURIComponent(domainCode)}`;
        try {
            const options = {
                headers: {
                    'Accept': 'application/json',
                    'api-key': process.env.CDISC_LIBRARY_API_KEY || ''
                }
            };
            const data = await this.makeRequest(url, options);
            this.cache.set(cacheKey, data, 86400); // Cache for 24 hours
            return data;
        } catch (error) {
            console.error(`Error fetching domain definition for ${domainCode}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Expand datasets from API response from summary
     */
    expandDatasets(datasets) {
        return datasets.map(dataset => {
             return {
                domain_code: dataset.href.split('/').pop(),
                name: dataset.title,
                href: dataset.href,
            };
        });
    }

    /**
     * Fetch all CDISC SDTM Domain definitions
     */
    async fetchSDTMDomains() {
        const cacheKey = this.getCacheKey('cdisc_domains_definition', this.sdtm_version);
        let cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            console.error(`Cache hit for domain definitions: ${this.sdtm_version}`);
            const datasets = this.expandDatasets(cachedData._links.datasets || []);
            return datasets;
        }

        const url = `${this.baseUrl}/mdr/sdtmig/${this.sdtm_version}/datasets`;
        try {
            const options = {
                headers: {
                    'Accept': 'application/json',
                    'api-key': process.env.CDISC_LIBRARY_API_KEY || ''
                }
            };
            const data = await this.makeRequest(url, options);
            this.cache.set(cacheKey, data, 86400); // Cache for 24 hours
            // get the datasets array
            const datasets = this.expandDatasets(data._links.datasets || []);
            return datasets;
        } catch (error) {
            console.error(`Error fetching domain definition for ${domainCode}: ${error.message}`);
            throw error;
        }
    }


}
