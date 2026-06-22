import { BaseTool } from './base-tool.js';

// List of valid source vocabularies in UMLS
const SABS = ['AIR',
  'ALT',
  'AOD',
  'AOT',
  'ATC',
  'BI',
  'CCC',
  'CCPSS',
  'CCS',
  'CCSR_ICD10CM',
  'CCSR_ICD10PCS',
  'CDCREC',
  'CDT',
  'CHV',
  'COSTAR',
  'CPM',
  'CPT',
  'CSP',
  'CST',
  'CVX',
  'DDB',
  'DRUGBANK',
  'DSM-5',
  'DXP',
  'FMA',
  'GO',
  'GS',
  'HCDT',
  'HCPCS',
  'HCPT',
  'HGNC',
  'HL7V2.5',
  'HL7V3.0',
  'HLREL',
  'HPO',
  'ICD10',
  'ICD10AE',
  'ICD10AM',
  'ICD10AMAE',
  'ICD10CM',
  'ICD10PCS',
  'ICD9CM',
  'ICF',
  'ICF-CY',
  'ICNP',
  'ICPC',
  'ICPC2EENG',
  'ICPC2ICD10ENG',
  'ICPC2P',
  'JABL',
  'LCH',
  'LCH_NW',
  'LNC',
  'MCM',
  'MDR',
  'MED-RT',
  'MEDCIN',
  'MEDLINEPLUS',
  'MMSL',
  'MMX',
  'MSH',
  'MTH',
  'MTHCMSFRF',
  'MTHICD9',
  'MTHICPC2EAE',
  'MTHICPC2ICD10AE',
  'MTHMST',
  'MTHSPL',
  'MVX',
  'NANDA-I',
  'NCBI',
  'NCI',
  'NCISEER',
  'NDDF',
  'NEU',
  'NIC',
  'NOC',
  'NUCCHCPT',
  'OMIM',
  'OMS',
  'ORPHANET',
  'PCDS',
  'PDQ',
  'PNDS',
  'PPAC',
  'PSY',
  'QMR',
  'RAM',
  'RCD',
  'RCDAE',
  'RCDSA',
  'RCDSY',
  'RXNORM',
  'SNM',
  'SNMI',
  'SNOMEDCT_US',
  'SNOMEDCT_VET',
  'SOP',
  'SPN',
  'SRC',
  'ULT',
  'UMD',
  'USP',
  'USPMG',
  'UWDA',
  'VANDF',
  'WHO'];

// 
const SABS_BY_NAME = {
  'AI/RHEUM': 'AIR',
  'Alternative Billing Concepts': 'ALT',
  'Alcohol and Other Drug Thesaurus': 'AOD',
  'Authorized Osteopathic Thesaurus': 'AOT',
  'Anatomical Therapeutic Chemical Classification System': 'ATC',
  'Beth Israel Problem List': 'BI',
  'Clinical Care Classification': 'CCC',
  'Clinical Problem Statements': 'CCPSS',
  'Clinical Classifications Software': 'CCS',
  'Clinical Classifications Software Refined for ICD-10-CM': 'CCSR_ICD10CM',
  'Clinical Classifications Software Refined for ICD-10-PCS': 'CCSR_ICD10PCS',
  'Race & Ethnicity - CDC': 'CDCREC',
  'Clinical Drug Terms': 'CDT',
  'Consumer Health Vocabulary': 'CHV',
  'COSTAR': 'COSTAR',
  'Medical Entities Dictionary': 'CPM',
  'CPT - Current Procedural Terminology': 'CPT',
  'CRISP Thesaurus': 'CSP',
  'COSTART': 'CST',
  'Vaccines Administered': 'CVX',
  'Diseases Database': 'DDB',
  'DrugBank': 'DRUGBANK',
  'Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition': 'DSM-5',
  'DXplain': 'DXP',
  'Foundational Model of Anatomy': 'FMA',
  'Gene Ontology': 'GO',
  'Gold Standard Drug Database': 'GS',
  'Clinical Drug Terms in HCPCS': 'HCDT',
  'Healthcare Common Procedure Coding System': 'HCPCS',
  'Current Procedural Terminology in HCPCS': 'HCPT',
  'HUGO Gene Nomenclature Committee': 'HGNC',
  'HL7 Version 2.5': 'HL7V2.5',
  'HL7 Version 3.0': 'HL7V3.0',
  'ICPC2E ICD10 Relationships': 'HLREL',
  'Human Phenotype Ontology': 'HPO',
  'International Classification of Diseases and Related Health Problems, Tenth Revision': 'ICD10',
  'ICD-10, American English Equivalents': 'ICD10AE',
  'ICD-10, Australian Modification': 'ICD10AM',
  'ICD-10, Australian Modification, Americanized English Equivalents': 'ICD10AMAE',
  'International Classification of Diseases, Tenth Revision, Clinical Modification': 'ICD10CM',
  'ICD-10 Procedure Coding System': 'ICD10PCS',
  'International Classification of Diseases, Ninth Revision, Clinical Modification': 'ICD9CM',
  'International Classification of Functioning, Disability and Health': 'ICF',
  'International Classification of Functioning, Disability and Health for Children and Youth': 'ICF-CY',
  'International Classification for Nursing Practice': 'ICNP',
  'International Classification of Primary Care': 'ICPC',
  'International Classification of Primary Care, 2nd Edition, Electronic': 'ICPC2EENG',
  'ICPC2-ICD10 Thesaurus': 'ICPC2ICD10ENG',
  'ICPC-2 PLUS': 'ICPC2P',
  'Congenital Mental Retardation Syndromes': 'JABL',
  'Library of Congress Subject Headings': 'LCH',
  'Library of Congress Subject Headings, Northwestern University subset': 'LCH_NW',
  'LOINC': 'LNC',
  'Glossary of Clinical Epidemiologic Terms': 'MCM',
  'MedDRA': 'MDR',
  'Medication Reference Terminology': 'MED-RT',
  'MEDCIN': 'MEDCIN',
  'MedlinePlus Health Topics': 'MEDLINEPLUS',
  'Multum': 'MMSL',
  'Micromedex': 'MMX',
  'MeSH': 'MSH',
  'Metathesaurus Names': 'MTH',
  'Metathesaurus CMS Formulary Reference File': 'MTHCMSFRF',
  'ICD-9-CM Entry Terms': 'MTHICD9',
  'ICPC2E American English Equivalents': 'MTHICPC2EAE',
  'ICPC2E-ICD10 Thesaurus, American English Equivalents': 'MTHICPC2ICD10AE',
  'Minimal Standard Terminology (UMLS)': 'MTHMST',
  'FDA Structured Product Labels': 'MTHSPL',
  'Manufacturers of Vaccines': 'MVX',
  'NANDA-I Taxonomy': 'NANDA-I',
  'NCBI Taxonomy': 'NCBI',
  'NCI Thesaurus': 'NCI',
  'NCI SEER ICD Mappings': 'NCISEER',
  'FDB MedKnowledge': 'NDDF',
  'Neuronames Brain Hierarchy': 'NEU',
  'Nursing Interventions Classification': 'NIC',
  'Nursing Outcomes Classification': 'NOC',
  'National Uniform Claim Committee - Health Care Provider Taxonomy': 'NUCCHCPT',
  'Online Mendelian Inheritance in Man': 'OMIM',
  'Omaha System': 'OMS',
  'ORPHANET': 'ORPHANET',
  'Patient Care Data Set': 'PCDS',
  'Physician Data Query': 'PDQ',
  'Perioperative Nursing Data Set': 'PNDS',
  'Pharmacy Practice Activity Classification': 'PPAC',
  'Psychological Index Terms': 'PSY',
  'Quick Medical Reference': 'QMR',
  'Clinical Concepts by R A Miller': 'RAM',
  'Read Codes': 'RCD',
  'Read Codes Am Engl': 'RCDAE',
  'Read Codes Am Synth': 'RCDSA',
  'Read Codes Synth': 'RCDSY',
  'RXNORM': 'RXNORM',
  'SNOMED 1982': 'SNM',
  'SNOMED Intl 1998': 'SNMI',
  'SNOMED CT, US Edition': 'SNOMEDCT_US',
  'SNOMED CT, Veterinary Extension': 'SNOMEDCT_VET',
  'Source of Payment Typology': 'SOP',
  'Standard Product Nomenclature': 'SPN',
  'Source Terminology Names (UMLS)': 'SRC',
  'UltraSTAR': 'ULT',
  'UMDNS': 'UMD',
  'USP Compendial Nomenclature': 'USP',
  'USP Model Guidelines': 'USPMG',
  'Digital Anatomist': 'UWDA',
  'National Drug File': 'VANDF',
  'WHOART': 'WHO'
}
// Valid values for UTS REST search parameters
// https://documentation.uts.nlm.nih.gov/rest/search/index.html
const SEARCH_TYPES = ['words', 'exact', 'leftTruncation', 'rightTruncation', 'normalizedString', 'normalizedWords', 'approximate'];
const RETURN_ID_TYPES = ['aui', 'concept', 'code', 'sourceConcept', 'sourceDescriptor', 'sourceUi'];
const INPUT_TYPES = ['atom', 'code', 'sourceConcept', 'sourceDescriptor', 'sourceUi', 'tty'];

/**
 * Tool for searching clinical concepts from UMLS
 */
export class ClinicalConceptsTool extends BaseTool {
  constructor(cacheService) {
    super(cacheService);
    this.baseUrl = 'https://uts-ws.nlm.nih.gov/rest';
  }

  /**
   * Get the Source abbreviation (SAB) for a given source name
   */
  async getSourceAbbreviations() {
    const results = [];
    for (const [name, abbr] of Object.entries(SABS_BY_NAME)) {
      results.push({ name: name, abbreviation: abbr });
    }
    return this.formatSuccessResponse({ count: results.length, sources: results });
  }

  /**
   * Fetch a clinical concept by its CUI (Concept Unique Identifier)
   */
  async getConceptById(cui, version = "current") {
    if (!cui) {
      return this.formatErrorResponse('CUI is required');
    }
    // Create cache key
    const cacheKey = this.getCacheKey('clinical_concept', cui, version);
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for Clinical Concepts search: ${concept}`);
      return cachedResult;
    }

    try {
      console.error(`Fetching concept for CUI: ${cui}`);
      const params = {
        'apiKey': process.env.UMLS_API_KEY || ''
      };

      const url = this.buildUrl(`${this.baseUrl}/content/${version}/CUI/${cui}`, params);

      // Make the request
      const data = await this.makeRequest(url);

      // Process the response
      if (data && data.result) {
        const result = data.result;

        // Cache the result
        this.cache.set(cacheKey, this.formatSuccessResponse(result));
        return this.formatSuccessResponse(result);
      } else {
        return this.formatErrorResponse('No concept found for the given CUI');
      }
    } catch (error) {
      console.error(`Error fetching concept by CUI: ${error.message}`);
      return this.formatErrorResponse(`Error fetching concept: ${error.message}`);
    }
  }

  /**
   * Get the concept definitions for a given CUI
   */
  async getConceptDefinitions(cui, version = "current", sources = [], maxResults = 25, pageNumber = 1) {
    if (!cui) {
      return this.formatErrorResponse('CUI is required');
    }

    // Validate maxResults
    const validMaxResults = Math.min(Math.max(parseInt(maxResults) || 25, 1), 1000);
    
    // Create cache key
    const cacheKey = this.getCacheKey('concept_definitions', cui, version, sources.join(','), validMaxResults, pageNumber);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for concept definitions of CUI: ${cui}`);
      return cachedResult;
    }

    try {
      console.error(`Fetching concept definitions for CUI: ${cui}, page: ${pageNumber}, maxResults: ${validMaxResults}`);
      
      let allResults = [];
      let totalCount = 0;
      let currentPage = 1;
      const pageSize = Math.min(validMaxResults, 25); // UMLS API typical max page size
      let hasMoreResults = true;

      // Continue fetching until we hit the requested page and get results
      while (hasMoreResults && (currentPage <= pageNumber)) {
        const params = {
          'apiKey': process.env.UMLS_API_KEY || '',
          'pageNumber': currentPage,
          'pageSize': pageSize
        };

        if (sources && Array.isArray(sources) && sources.length > 0) {
          // Validate and filter sources
          const validSources = sources.map(s => s.toUpperCase()).filter(s => SABS.includes(s));
          if (validSources.length > 0) {
            params['sabs'] = validSources.join(',');
          }
        }

        const url = this.buildUrl(`${this.baseUrl}/content/${version}/CUI/${cui}/definitions`, params);

        console.error(`Fetching page ${currentPage} for concept definitions`);

        // Make the request
        const data = await this.makeRequest(url);

        // Process the response
        if (data && data.result && Array.isArray(data.result)) {
          // Update total count from API on first page
          if (currentPage === 1 && data.pageCount) {
            totalCount = data.pageCount * pageSize; // Estimate total
          }

          // If this is the page we want, collect the results
          if (currentPage === pageNumber) {
            allResults = data.result.map(definition => ({
              definition: definition.value || '',
              source: definition.rootSource || '',
              sourceOriginated: definition.sourceOriginated || ''
            }));
          }

          // Check if we should continue
          if (data.result.length === 0 || data.result.length < pageSize) {
            hasMoreResults = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreResults = false;
        }

        // Add small delay to be respectful to the API
        if (hasMoreResults && currentPage <= pageNumber) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.error(`Concept definitions search completed: found ${allResults.length} results for page ${pageNumber}`);

      // Create result object
      const result = this.formatSuccessResponse({
        cui: cui,
        pageNumber: pageNumber,
        pageSize: pageSize,
        totalCount: totalCount,
        returnedCount: allResults.length,
        maxRequested: validMaxResults,
        results: allResults
      });

      // Cache for 24 hours (86400 seconds)
      this.cache.set(cacheKey, result, 86400);

      return result;
    } catch (error) {
      console.error(`Error fetching related concepts: ${error.message}`);
      return this.formatErrorResponse(`Error fetching related concepts: ${error.message}`);
    }
  }

  /**
   * Get the related concepts for a given CUI
   */
  async getRelatedConcepts(cui, version = "current", sources = [], maxResults = 25, pageNumber = 1) {
    if (!cui) {
      return this.formatErrorResponse('CUI is required');
    }

    // Validate maxResults
    const validMaxResults = Math.min(Math.max(parseInt(maxResults) || 25, 1), 1000);
    
    // Create cache key
    const cacheKey = this.getCacheKey('related_concepts', cui, version, sources.join(','), validMaxResults, pageNumber);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for related concepts of CUI: ${cui}`);
      return cachedResult;
    }

    try {
      console.error(`Fetching related concepts for CUI: ${cui}, page: ${pageNumber}, maxResults: ${validMaxResults}`);
      
      let allResults = [];
      let totalCount = 0;
      let currentPage = 1;
      const pageSize = Math.min(validMaxResults, 25); // UMLS API typical max page size
      let hasMoreResults = true;

      // Continue fetching until we hit the requested page and get results
      while (hasMoreResults && (currentPage <= pageNumber)) {
        const params = {
          'apiKey': process.env.UMLS_API_KEY || '',
          'pageNumber': currentPage,
          'pageSize': pageSize
        };

        if (sources && Array.isArray(sources) && sources.length > 0) {
          // Validate and filter sources
          const validSources = sources.map(s => s.toUpperCase()).filter(s => SABS.includes(s));
          if (validSources.length > 0) {
            params['sabs'] = validSources.join(',');
          }
        }

        const url = this.buildUrl(`${this.baseUrl}/content/${version}/CUI/${cui}/relations`, params);

        console.error(`Fetching page ${currentPage} for related concepts`);

        // Make the request
        const data = await this.makeRequest(url);

        // Process the response
        if (data && data.result && Array.isArray(data.result)) {
          // Update total count from API on first page
          if (currentPage === 1 && data.pageCount) {
            totalCount = data.pageCount * pageSize; // Estimate total
          }

          // If this is the page we want, collect the results
          if (currentPage === pageNumber) {
            allResults = data.result.map(relation => ({
              ui: relation.ui || '',
              relatedId: relation.relatedId || '',
              relatedIdName: relation.relatedIdName || '',
              relationLabel: relation.relationLabel || '',
              additionalRelationLabel: relation.additionalRelationLabel || '',
              rootSource: relation.rootSource || '',
              classType: relation.classType || ''
            }));
          }

          // Check if we should continue
          if (data.result.length === 0 || data.result.length < pageSize) {
            hasMoreResults = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreResults = false;
        }

        // Add small delay to be respectful to the API
        if (hasMoreResults && currentPage <= pageNumber) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.error(`Related concepts search completed: found ${allResults.length} results for page ${pageNumber}`);

      // Create result object
      const result = this.formatSuccessResponse({
        cui: cui,
        pageNumber: pageNumber,
        pageSize: pageSize,
        totalCount: totalCount,
        returnedCount: allResults.length,
        maxRequested: validMaxResults,
        results: allResults
      });

      // Cache for 24 hours (86400 seconds)
      this.cache.set(cacheKey, result, 86400);

      return result;
    } catch (error) {
      console.error(`Error fetching related concepts: ${error.message}`);
      return this.formatErrorResponse(`Error fetching related concepts: ${error.message}`);
    }
  }

  /**
   * Get the parent concepts for a given CUI
   * @params {string} cui - The Concept Unique Identifier
   * @params {string} version - The UMLS version to search against
   * @params {string} source - The source vocabulary abbreviation (SAB), eg 'SNOMEDCT_US'
   * @params {number} maxResults - The maximum number of results to return (1-1000)
   * @params {number} pageNumber - The page number for pagination
   */
  async getParentConcepts(cui, version = "current", source = "", maxResults = 25, pageNumber = 1) {
    if (!cui) {
      return this.formatErrorResponse('CUI is required');
    }
        // Validate max_results
    let validMaxResults;
    try {
      validMaxResults = parseInt(maxResults);
      if (validMaxResults < 1) {
        validMaxResults = 10;
      } else if (validMaxResults > 1000) {
        validMaxResults = 1000; // Increased limit for comprehensive search
      }
    } catch (error) {
      validMaxResults = 10;
    }

    // Create cache key
    const cacheKey = this.getCacheKey('parent_concepts', cui, version, sources.join(','), validMaxResults, pageNumber);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for Parent Concepts search: ${cui}`);
      return cachedResult;
    }

    try {
      if (!SABS.includes(source.toUpperCase())) {
        console.error(`Invalid source: ${source}`);
        return this.formatErrorResponse(`Invalid source: ${source}`);
      }
      let allResults = [];
      let totalCount = 0;
      let pageNumber = 1;
      const pageSize = Math.min(validMaxResults, 100); // UMLS API typical max page size
      let hasMoreResults = true;

      // Continue fetching until we hit the end record or reach max results
      while (hasMoreResults && allResults.length < validMaxResults) {
        // Build query parameters for this page
        const params = {
          'string': concept,
          'pageNumber': pageNumber,
          'pageSize': pageSize,
          'apiKey': process.env.UMLS_API_KEY || ''
        };

        if (['exact', 'words', 'leftTruncation', 'rightTruncation', 'normalizedString', 'normalizedWords'].includes(searchType)) {
          params['searchType'] = searchType;
        }
        if (sources && Array.isArray(sources) && sources.length > 0) {
          // Validate and filter sources
          const validSources = sources.map(s => s.toUpperCase()).filter(s => SABS.includes(s));
          if (validSources.length > 0) {
            params['sabs'] = validSources.join(',');
          }
        }

      // build the URL
      const url = this.buildUrl(`${this.baseUrl}/content/${version}/source/${source}/${cui}/parents`, params);
              // Make the request
        const data = await this.makeRequest(url);

        // Process the response
        if (data && data.result && data.result.results) {
          let pageResults = [];
          let foundEndRecord = false;

          // Update total count from API on first page
          if (pageNumber === 1 && data.result.recCount) {
            totalCount = data.result.recCount;
          }

          // Process each result in this page
          for (const result of data.result.results) {
            // Check for end record
            if (result.ui === 'NONE' || result.ui === '' || !result.ui) {
              foundEndRecord = true;
              break;
            }

            const processedResult = {
              ui: result.ui || '',
              rootSource: result.rootSource || '',
              uri: result.uri || '',
              name: result.name || ''
            };

            pageResults.push(processedResult);

            // Stop if we've reached our max results limit
            if (allResults.length + pageResults.length >= validMaxResults) {
              pageResults = pageResults.slice(0, validMaxResults - allResults.length);
              break;
            }
          }

          // Add this page's results to our total
          allResults = allResults.concat(pageResults);

          // Check if we should continue
          if (foundEndRecord || pageResults.length === 0 || pageResults.length < pageSize) {
            hasMoreResults = false;
          } else {
            pageNumber++;
          }
        } else {
          // No results or error in response
          hasMoreResults = false;
        }
      }
    } catch (error) {
      console.error(`Error fetching parent concepts: ${error.message}`);
      return this.formatErrorResponse(`Error fetching parent concepts: ${error.message}`);
    }
  }

  /**
   * Search for a clinical concept in the UMLS Metathesaurus
   * @see https://documentation.uts.nlm.nih.gov/rest/search/index.html
   * @params {string} concept - The search string for the clinical concept
   * @params {string} version - The UMLS version to search against
   * @params {string} searchType - The type of search (words, exact, leftTruncation, rightTruncation, normalizedString, normalizedWords, approximate)
   * @params {number} maxResults - The maximum number of results to return (1-1000)
   * @params {array} sources - Optional array of source abbreviations (SABs) to restrict the search (sabs)
   * @params {string} returnIdType - The type of identifier to return (aui, concept, code, sourceConcept, sourceDescriptor, sourceUi). Defaults to "concept" (CUIs)
   * @params {string} inputType - The data type of the search string (atom, code, sourceConcept, sourceDescriptor, sourceUi, tty)
   * @params {boolean} partialSearch - Whether to include partial matches
   */
  async searchConcept(concept, version = "current", searchType = "words", maxResults = 10, sources = [], returnIdType = "concept", inputType = "", partialSearch = false) {
    // Input validation
    if (!concept) {
      return this.formatErrorResponse('Concept is required');
    }

    // Validate max_results
    let validMaxResults;
    try {
      validMaxResults = parseInt(maxResults);
      if (validMaxResults < 1) {
        validMaxResults = 10;
      } else if (validMaxResults > 1000) {
        validMaxResults = 1000; // Increased limit for comprehensive search
      }
    } catch (error) {
      validMaxResults = 10;
    }

    // Validate and normalise the source abbreviations (sabs) filter
    const validSources = (Array.isArray(sources) ? sources : [])
      .map(s => String(s).toUpperCase())
      .filter(s => SABS.includes(s));

    // Validate optional search parameters, falling back to defaults when invalid
    const validReturnIdType = RETURN_ID_TYPES.includes(returnIdType) ? returnIdType : 'concept';
    const validInputType = INPUT_TYPES.includes(inputType) ? inputType : '';
    const validPartialSearch = partialSearch === true || partialSearch === 'true';

    // Create cache key (includes every parameter that affects the result set)
    const cacheKey = this.getCacheKey(
      'clinical_concepts',
      concept,
      version,
      searchType,
      validMaxResults,
      validSources.join(','),
      validReturnIdType,
      validInputType,
      validPartialSearch
    );

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for Clinical Concepts search: ${concept}`);
      return cachedResult;
    }

    try {
      console.error(`Searching Clinical Concepts for: ${concept}, max_results: ${validMaxResults}`);

      let allResults = [];
      let totalCount = 0;
      let pageNumber = 1;
      const pageSize = Math.min(validMaxResults, 100); // UMLS API typical max page size
      let hasMoreResults = true;

      // Continue fetching until we hit the end record or reach max results
      while (hasMoreResults && allResults.length < validMaxResults) {
        // Build query parameters for this page
        const params = {
          'string': concept,
          'pageNumber': pageNumber,
          'pageSize': pageSize,
          'apiKey': process.env.UMLS_API_KEY || ''
        };

        if (SEARCH_TYPES.includes(searchType)) {
          params['searchType'] = searchType;
        }
        // Restrict the search to specific source vocabularies (SABs)
        if (validSources.length > 0) {
          params['sabs'] = validSources.join(',');
        }
        // returnIdType defaults to "concept" (CUIs); only send when non-default
        if (validReturnIdType && validReturnIdType !== 'concept') {
          params['returnIdType'] = validReturnIdType;
        }
        if (validInputType) {
          params['inputType'] = validInputType;
        }
        if (validPartialSearch) {
          params['partialSearch'] = true;
        }
        const url = this.buildUrl(`${this.baseUrl}/search/${version}`, params);

        console.error(`Fetching page ${pageNumber} for Clinical Concepts search`);

        // Make the request
        const data = await this.makeRequest(url);

        // Process the response
        if (data && data.result && data.result.results) {
          let pageResults = [];
          let foundEndRecord = false;

          // Update total count from API on first page
          if (pageNumber === 1 && data.result.recCount) {
            totalCount = data.result.recCount;
          }

          // Process each result in this page
          for (const result of data.result.results) {
            // Check for end record
            if (result.ui === 'NONE' || result.ui === '' || !result.ui) {
              foundEndRecord = true;
              break;
            }

            const processedResult = {
              ui: result.ui || '',
              rootSource: result.rootSource || '',
              uri: result.uri || '',
              name: result.name || ''
            };

            pageResults.push(processedResult);

            // Stop if we've reached our max results limit
            if (allResults.length + pageResults.length >= validMaxResults) {
              pageResults = pageResults.slice(0, validMaxResults - allResults.length);
              break;
            }
          }

          // Add this page's results to our total
          allResults = allResults.concat(pageResults);

          // Check if we should continue
          if (foundEndRecord || pageResults.length === 0 || pageResults.length < pageSize) {
            hasMoreResults = false;
          } else {
            pageNumber++;
          }
        } else {
          // No results or error in response
          hasMoreResults = false;
        }

        // Add small delay to be respectful to the API
        if (hasMoreResults) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.error(`Clinical Concepts search completed: found ${totalCount} total results, returning ${allResults.length}`);

      // Create result object
      const result = this.formatSuccessResponse({
        concept: concept,
        version: version,
        searchType: searchType,
        returnIdType: validReturnIdType,
        sources: validSources,
        partialSearch: validPartialSearch,
        totalCount: totalCount,
        returnedCount: allResults.length,
        maxRequested: validMaxResults,
        results: allResults
      });

      // Cache for 24 hours (86400 seconds)
      this.cache.set(cacheKey, result, 86400);

      return result;

    } catch (error) {
      console.error(`Error searching Clinical Concepts: ${error.message}`);
      return this.formatErrorResponse(`Error searching clinical concepts: ${error.message}`);
    }
  }
}

export default ClinicalConceptsTool;
