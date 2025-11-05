#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from 'crypto';

// Import our tools and services
import { CacheService } from './cache-service.js';
import { FDATool } from './fda-tool.js';
import { PubMedTool } from './pubmed-tool.js';
import { HealthTopicsTool } from './health-topics-tool.js';
import { ClinicalTrialsTool } from './clinical-trials-tool.js';
import { MedicalTerminologyTool } from './medical-terminology-tool.js';
import { MedRxivTool } from './medrxiv-tool.js';
import { MedicalCalculatorTool } from './medical-calculator-tool.js';
import { NcbiBookshelfTool } from './ncbi-bookshelf-tool.js';
import { DicomTool } from './dicom-tool.js';
import { UsageService } from './usage-service.js';
import { ClinicalConceptsTool } from './umls-catalog-search.js';
import { ClinicalTrialsConceptExtractorTool } from './clinical-trials-concept-extractor-tool.js';

// Initialize services
const cacheService = new CacheService(parseInt(process.env.CACHE_TTL) || 86400);
const usageService = new UsageService();

// Initialize tools
const fdaTool = new FDATool(cacheService);
const pubmedTool = new PubMedTool(cacheService);
const healthTopicsTool = new HealthTopicsTool(cacheService);
const clinicalTrialsTool = new ClinicalTrialsTool(cacheService);
const medicalTerminologyTool = new MedicalTerminologyTool(cacheService);
const medrxivTool = new MedRxivTool(cacheService);
const medicalCalculatorTool = new MedicalCalculatorTool(cacheService);
const ncbiBookshelfTool = new NcbiBookshelfTool(cacheService);
const dicomTool = new DicomTool(cacheService);
const clinicalConceptsTool = new ClinicalConceptsTool(cacheService);
const conceptExtractorTool = new ClinicalTrialsConceptExtractorTool(
  cacheService,
  clinicalTrialsTool,
  medicalTerminologyTool
);

// Generate a unique session ID for this connection
const sessionId = randomUUID();

// Create MCP server
const server = new Server(
  {
    name: "healthcare-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      sampling: {},
    },
  },
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  return {
    tools: [
      {
        name: "fda_drug_lookup",
        description: "Look up drug information from the FDA database",
        inputSchema: {
          type: "object",
          properties: {
            drug_name: {
              type: "string",
              description: "Name of the drug to search for",
            },
            search_type: {
              type: "string",
              description: "Type of information to retrieve: 'label', 'adverse_events', or 'general'",
              enum: ["general", "label", "adverse_events"],
              default: "general",
            },
          },
          required: ["drug_name"],
        },
      },
      {
        name: "pubmed_search",
        description: "Search for medical literature in PubMed database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for medical literature",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 5,
              minimum: 1,
              maximum: 100,
            },
            date_range: {
              type: "string",
              description: "Limit to articles published within years (e.g. '5' for last 5 years)",
              default: "",
            },
            open_access: {
              type: "boolean",
              description: "Filter for open access articles",
              default: false,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "medrxiv_search",
        description: "Search for pre-print articles on medRxiv",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for medRxiv articles",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 100,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "calculate_bmi",
        description: "Calculate Body Mass Index (BMI)",
        inputSchema: {
          type: "object",
          properties: {
            height_meters: {
              type: "number",
              description: "Height in meters",
            },
            weight_kg: {
              type: "number",
              description: "Weight in kilograms",
            },
          },
          required: ["height_meters", "weight_kg"],
        },
      },
      {
        name: "ncbi_bookshelf_search",
        description: "Search the NCBI Bookshelf for biomedical books and documents",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for NCBI Bookshelf",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 100,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "extract_dicom_metadata",
        description: "Extract metadata from a DICOM file",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the DICOM file",
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "health_topics",
        description: "Get evidence-based health information on various topics",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Health topic to search for information",
            },
            language: {
              type: "string",
              description: "Language for content (en or es)",
              enum: ["en", "es"],
              default: "en",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "clinical_trials_search",
        description: "Search for clinical trials by condition, status, and other parameters",
        inputSchema: {
          type: "object",
          properties: {
            condition: {
              type: "string",
              description: "Medical condition or disease to search for",
            },
            status: {
              type: "string",
              description: "Trial status",
              enum: ["recruiting", "completed", "active", "not_recruiting", "all"],
              default: "recruiting",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 100,
            },
          },
          required: ["condition"],
        },
      },
      {
        name: "get_clinical_trial_by_nct_id",
        description: "Get detailed information for a specific clinical trial by its NCT ID",
        inputSchema: {
          type: "object",
          properties: {
            nct_id: {
              type: "string",
              description: "NCT identifier for the clinical trial (e.g., NCT12345678)",
            },
          },
          required: ["nct_id"],
        },
      },
      {
        name: "extract_clinical_trial_concepts",
        description: "Extract and map medical concepts from clinical trial eligibility criteria to UMLS standardized vocabularies. Uses LLM to identify conditions, procedures, medications, biomarkers, and other medical concepts, then maps them to UMLS CUIs with definitions.",
        inputSchema: {
          type: "object",
          properties: {
            nct_id: {
              type: "string",
              description: "NCT identifier for the clinical trial (e.g., NCT12345678)",
            },
          },
          required: ["nct_id"],
        },
      },
      {
        name: "lookup_icd_code",
        description: "Look up ICD-10 codes by code or description",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "ICD-10 code to look up (optional if description is provided)",
            },
            description: {
              type: "string",
              description: "Medical condition description to search for (optional if code is provided)",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 50,
            },
          },
        },
      },
      {
        name: "get_usage_stats",
        description: "Get usage statistics for the current session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_all_usage_stats",
        description: "Get overall usage statistics for all sessions",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_clinical_concepts",
        description: "Search for clinical concepts in the UMLS Metathesaurus",
        inputSchema: {
          type: "object",
          properties: {
            concept: {
              type: "string",
              description: "Clinical concept to search for",
            },
            version: {
              type: "string",
              description: "UMLS version to search (default: current)",
              default: "current",
            },
            search_type: {
              type: "string",
              description: "Type of search to perform",
              enum: ["exact", "words", "leftTruncation", "rightTruncation", "normalizedString", "normalizedWords"],
              default: "exact",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 1000,
            },
            sources: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Filter by specific source vocabularies (e.g., ['ICD10CM', 'SNOMEDCT_US'])",
              default: []
            }
          },
          required: ["concept"],
        },
      },
      {
        name: "get_clinical_concept_by_cui",
        description: "Fetch clinical concepts by their CUI (Concept Unique Identifier) from UMLS",
        inputSchema: {
          type: "object",
          properties: {
            cui: {
              type: "string",
              description: "Concept Unique Identifier (CUI)",
            },
            version: {
              type: "string",
              description: "UMLS version to search (default: current)",
              default: "current",
            },
          },
          required: ["cui"],
        },
      },
      {
        name: "get_concept_definitions_by_cui",
        description: "Fetch concept definitions for a given CUI (Concept Unique Identifier) from UMLS with pagination support",
        inputSchema: {
          type: "object",
          properties: {
            cui: {
              type: "string",
              description: "Concept Unique Identifier (CUI)",
            },
            version: {
              type: "string",
              description: "UMLS version to search (default: current)",
              default: "current",
            },
            sources: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Filter by specific source vocabularies (e.g., ['MSH', 'NCI', 'SNOMEDCT_US'])",
              default: []
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return per page (default: 25, max: 1000)",
              default: 25,
            },
            page_number: {
              type: "number", 
              description: "Page number to retrieve (default: 1)",
              default: 1,
            },
          },
          required: ["cui"],
        },
      },
      {
        name: "get_related_clinical_concept_by_cui",
        description: "Fetch related clinical concepts by their CUI (Concept Unique Identifier) from UMLS with pagination support",
        inputSchema: {
          type: "object",
          properties: {
            cui: {
              type: "string",
              description: "Concept Unique Identifier (CUI)",
            },
            version: {
              type: "string",
              description: "UMLS version to search (default: current)",
              default: "current",
            },
            sources: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Filter by specific source vocabularies (e.g., ['ICD10CM', 'SNOMEDCT_US'])",
              default: []
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return per page (default: 25, max: 1000)",
              default: 25,
            },
            page_number: {
              type: "number", 
              description: "Page number to retrieve (default: 1)",
              default: 1,
            },
          },
          required: ["cui"],
        },
      },
      {
        name: "get_source_abbreviations",
        description: "Fetch source abbreviations from UMLS",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },  
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Record usage
    usageService.recordUsage(sessionId, name);

    let result;

    switch (name) {
      case "fda_drug_lookup":
        result = await fdaTool.lookupDrug(args.drug_name, args.search_type);
        break;

      case "pubmed_search":
        result = await pubmedTool.searchLiterature(args.query, args.max_results, args.date_range, args.open_access);
        break;

      case "medrxiv_search":
        result = await medrxivTool.search(args.query, args.max_results);
        break;

      case "calculate_bmi":
        result = medicalCalculatorTool.calculateBmi(args.height_meters, args.weight_kg);
        break;

      case "ncbi_bookshelf_search":
        result = await ncbiBookshelfTool.search(args.query, args.max_results);
        break;

      case "extract_dicom_metadata":
        result = dicomTool.extractMetadata(args.file_path);
        break;

      case "health_topics":
        result = await healthTopicsTool.getHealthTopics(args.topic, args.language);
        break;

      case "clinical_trials_search":
        result = await clinicalTrialsTool.searchTrials(args.condition, args.status, args.max_results);
        break;

      case "get_clinical_trial_by_nct_id":
        result = await clinicalTrialsTool.getTrialByNctId(args.nct_id);
        break;

      case "extract_clinical_trial_concepts":
        // Create sampling callback that uses the server's sampling capability
        const samplingCallback = async (samplingParams) => {
          try {
            const samplingResult = await server.requestSampling(
              samplingParams,
              request.meta
            );
            return {
              content: samplingResult.content
            };
          } catch (error) {
            throw new Error(`Sampling failed: ${error.message}`);
          }
        };
        
        result = await conceptExtractorTool.extractConcepts(args.nct_id, samplingCallback);
        break;

      case "lookup_icd_code":
        result = await medicalTerminologyTool.lookupICDCode(args.code, args.description, args.max_results);
        break;

      case "get_usage_stats":
        result = usageService.getSessionUsage(sessionId);
        break;

      case "get_all_usage_stats":
        result = usageService.getAllUsageStats();
        break;

      case "search_clinical_concepts":
        result = await clinicalConceptsTool.searchConcept(args.concept, args.version, args.search_type, args.max_results);
        break;

      case "get_clinical_concept_by_cui":
        result = await clinicalConceptsTool.getConceptById(args.cui, args.version);
        break;

      case "get_concept_definitions_by_cui":
        result = await clinicalConceptsTool.getConceptDefinitions(args.cui, args.version, args.sources, args.max_results, args.page_number);
        break;

      case "get_related_clinical_concept_by_cui":
        result = await clinicalConceptsTool.getRelatedConcepts(args.cui, args.version, args.sources, args.max_results, args.page_number);
        break;

      case "get_source_abbreviations":
        result = await clinicalConceptsTool.getSourceAbbreviations();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            error_message: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error("Healthcare MCP Node.js server running...");
console.error(`Session ID: ${sessionId}`);
console.error(`Cache TTL: ${cacheService.cache.options.stdTTL} seconds`);
