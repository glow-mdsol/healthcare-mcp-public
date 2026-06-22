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
import { TOOL_DEFINITIONS } from './tool-definitions.js';

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
  return { tools: TOOL_DEFINITIONS };
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
        result = await clinicalConceptsTool.searchConcept(args.concept, args.version, args.search_type, args.max_results, args.sources, args.return_id_type, args.input_type, args.partial_search);
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
      // Machine-readable result, validated against the tool's outputSchema
      structuredContent: result,
      isError: result?.status === "error",
    };
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    const errorResult = {
      status: "error",
      error_message: error.message,
    };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(errorResult, null, 2),
        },
      ],
      structuredContent: errorResult,
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
