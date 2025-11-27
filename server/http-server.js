#!/usr/bin/env node

import http from 'http';
import { randomUUID } from 'crypto';
import { URL } from 'url';

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

const PORT = parseInt(process.env.PORT || '3000', 10);
const sessionId = randomUUID();

const cacheService = new CacheService(parseInt(process.env.CACHE_TTL) || 86400);
const usageService = new UsageService();

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

// Define tool schemas - matches the stdio server definitions
const TOOL_SCHEMAS = [
  {
    name: "fda_drug_lookup",
    description: "Look up drug information from the FDA database",
    inputSchema: {
      type: "object",
      properties: {
        drug_name: { type: "string", description: "Name of the drug to search for" },
        search_type: {
          type: "string",
          description: "Type of information to retrieve",
          enum: ["general", "label", "adverse_events"],
          default: "general"
        }
      },
      required: ["drug_name"]
    }
  },
  {
    name: "pubmed_search",
    description: "Search for medical literature in PubMed database",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for PubMed" },
        max_results: { type: "number", description: "Maximum number of results", default: 5 },
        date_range: { type: "string", description: "Date range filter (e.g., '1 year')" },
        open_access: { type: "boolean", description: "Filter for open access articles only", default: false }
      },
      required: ["query"]
    }
  },
  {
    name: "clinical_trials_search",
    description: "Search for clinical trials on ClinicalTrials.gov",
    inputSchema: {
      type: "object",
      properties: {
        condition: { type: "string", description: "Medical condition or disease" },
        status: { type: "string", description: "Trial status", enum: ["recruiting", "active", "completed"], default: "recruiting" },
        max_results: { type: "number", description: "Maximum number of results", default: 10 }
      },
      required: ["condition"]
    }
  },
  {
    name: "get_clinical_trial_by_nct_id",
    description: "Get detailed information about a clinical trial by its NCT ID",
    inputSchema: {
      type: "object",
      properties: {
        nct_id: { type: "string", description: "NCT identifier (e.g., NCT12345678)" }
      },
      required: ["nct_id"]
    }
  },
  {
    name: "search_clinical_concepts",
    description: "Search UMLS for clinical concepts",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", description: "Concept to search for" },
        version: { type: "string", description: "UMLS version", default: "current" },
        search_type: { type: "string", description: "Search type", enum: ["exact", "words", "leftTruncation", "rightTruncation", "approximate"], default: "words" },
        max_results: { type: "number", description: "Maximum results", default: 10 },
        sources: { type: "array", items: { type: "string" }, description: "Restrict to specific sources" }
      },
      required: ["concept"]
    }
  },
  {
    name: "get_clinical_concept_by_cui",
    description: "Get UMLS concept by CUI identifier",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier" },
        version: { type: "string", description: "UMLS version", default: "current" }
      },
      required: ["cui"]
    }
  },
  {
    name: "get_concept_definitions_by_cui",
    description: "Get definitions for a UMLS concept",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier" },
        version: { type: "string", description: "UMLS version", default: "current" },
        sources: { type: "array", items: { type: "string" }, description: "Filter by sources" },
        max_results: { type: "number", description: "Maximum results", default: 10 },
        page_number: { type: "number", description: "Page number for pagination", default: 1 }
      },
      required: ["cui"]
    }
  },
  {
    name: "get_related_clinical_concept_by_cui",
    description: "Get related concepts for a UMLS concept",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier" },
        version: { type: "string", description: "UMLS version", default: "current" },
        sources: { type: "array", items: { type: "string" }, description: "Filter by sources" },
        max_results: { type: "number", description: "Maximum results", default: 10 },
        page_number: { type: "number", description: "Page number for pagination", default: 1 }
      },
      required: ["cui"]
    }
  },
  {
    name: "lookup_icd_code",
    description: "Look up ICD-10 codes",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "ICD-10 code" },
        description: { type: "string", description: "Description to search for" },
        max_results: { type: "number", description: "Maximum results", default: 10 }
      }
    }
  },
  {
    name: "health_topics",
    description: "Get health topic information from MedlinePlus",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Health topic to search for" },
        language: { type: "string", description: "Language code", default: "en" }
      },
      required: ["topic"]
    }
  },
  {
    name: "medrxiv_search",
    description: "Search medRxiv for medical preprints",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "number", description: "Maximum results", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_bmi",
    description: "Calculate Body Mass Index",
    inputSchema: {
      type: "object",
      properties: {
        height_meters: { type: "number", description: "Height in meters" },
        weight_kg: { type: "number", description: "Weight in kilograms" }
      },
      required: ["height_meters", "weight_kg"]
    }
  },
  {
    name: "ncbi_bookshelf_search",
    description: "Search NCBI Bookshelf for biomedical books",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "number", description: "Maximum results", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "extract_dicom_metadata",
    description: "Extract metadata from DICOM medical images",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Path to DICOM file" }
      },
      required: ["file_path"]
    }
  },
  {
    name: "get_usage_stats",
    description: "Get usage statistics for the current session",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

function writeJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  // Basic CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(body));
}

// Store active SSE connections
const sseConnections = new Map();

function setupSSE(req, res, connectionId) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });
  
  // Keep connection alive with periodic comments
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);
  
  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
    sseConnections.delete(connectionId);
    console.error(`SSE client ${connectionId} disconnected`);
  });
  
  const connection = {
    sendMessage: (message) => {
      // MCP SSE transport sends JSON-RPC messages as "message" events
      console.error(`[SSE ${connectionId}] Sending message:`, JSON.stringify(message));
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    },
    end: () => {
      clearInterval(heartbeat);
      sseConnections.delete(connectionId);
      res.end();
    }
  };
  
  return connection;
}

async function handleCallTool(name, args) {
  usageService.recordUsage(sessionId, name);

  switch (name) {
    case 'fda_drug_lookup':
      return fdaTool.lookupDrug(args.drug_name, args.search_type);
    case 'pubmed_search':
      return pubmedTool.searchLiterature(args.query, args.max_results, args.date_range, args.open_access);
    case 'medrxiv_search':
      return medrxivTool.search(args.query, args.max_results);
    case 'calculate_bmi':
      return medicalCalculatorTool.calculateBmi(args.height_meters, args.weight_kg);
    case 'ncbi_bookshelf_search':
      return ncbiBookshelfTool.search(args.query, args.max_results);
    case 'extract_dicom_metadata':
      return dicomTool.extractMetadata(args.file_path);
    case 'health_topics':
      return healthTopicsTool.getHealthTopics(args.topic, args.language);
    case 'clinical_trials_search':
      return clinicalTrialsTool.searchTrials(args.condition, args.status, args.max_results);
    case 'get_clinical_trial_by_nct_id':
      return clinicalTrialsTool.getTrialByNctId(args.nct_id);
    case 'extract_clinical_trial_concepts':
      // Note: LLM sampling is not available via HTTP API
      // This tool requires MCP protocol with sampling capability
      return {
        success: false,
        error: 'extract_clinical_trial_concepts requires MCP protocol with sampling capability. Please use the MCP client (stdio) to access this tool.'
      };
    case 'lookup_icd_code':
      return medicalTerminologyTool.lookupICDCode(args.code, args.description, args.max_results);
    case 'search_clinical_concepts':
      return clinicalConceptsTool.searchConcept(args.concept, args.version, args.search_type, args.max_results, args.sources);
    case 'get_clinical_concept_by_cui':
      return clinicalConceptsTool.getConceptById(args.cui, args.version);
    case 'get_concept_definitions_by_cui':
      return clinicalConceptsTool.getConceptDefinitions(args.cui, args.version, args.sources, args.max_results, args.page_number);
    case 'get_related_clinical_concept_by_cui':
      return clinicalConceptsTool.getRelatedConcepts(args.cui, args.version, args.sources, args.max_results, args.page_number);
    case 'get_source_abbreviations':
      return clinicalConceptsTool.getSourceAbbreviations();
    case 'get_usage_stats':
      return usageService.getSessionUsage(sessionId);
    case 'get_all_usage_stats':
      return usageService.getAllUsageStats();
    default:
      return { status: 'error', error_message: `Unknown tool: ${name}` };
  }
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // MCP SSE Transport endpoint - follows JSON-RPC 2.0 over SSE
    if (req.method === 'GET' && pathname === '/sse') {
      const connectionId = randomUUID();
      const sse = setupSSE(req, res, connectionId);
      
      // Store the SSE connection for handling incoming POST messages
      sseConnections.set(connectionId, sse);
      
      // Send endpoint info - the URI where clients should POST messages
      res.write(`event: endpoint\n`);
      res.write(`data: /sse/${connectionId}\n\n`);
      
      return; // Keep connection open
    }

    // Handle incoming JSON-RPC messages via POST (companion to SSE GET)
    if (req.method === 'POST' && pathname.startsWith('/sse/')) {
      // Extract connection ID from path: /sse/{connectionId}
      const connectionId = pathname.substring(5); // Remove '/sse/'
      
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        console.error(`[POST ${connectionId}] Received body:`, body);
        try {
          const message = JSON.parse(body);
          console.error(`[POST ${connectionId}] Parsed message:`, JSON.stringify(message));
          
          // Validate JSON-RPC 2.0 format
          if (message.jsonrpc !== '2.0') {
            const errorResponse = {
              jsonrpc: '2.0',
              id: message.id || null,
              error: {
                code: -32600,
                message: 'Invalid Request: jsonrpc must be "2.0"'
              }
            };
            
            // Try to send via SSE if connection exists, otherwise HTTP
            const sse = sseConnections.get(connectionId);
            if (sse) {
              sse.sendMessage(errorResponse);
              // Simple HTTP acknowledgment (not JSON-RPC)
              res.writeHead(204);
              return res.end();
            }
            return writeJson(res, 400, errorResponse);
          }
          
          let response;
          
          // Handle JSON-RPC notifications (no id field, no response needed)
          if (!message.id && message.id !== 0) {
            console.error(`[POST ${connectionId}] Received notification (no response needed):`, message.method);
            // Notifications don't get responses, just acknowledge the POST
            res.writeHead(204);
            return res.end();
          }
          
          // Handle different JSON-RPC methods
          if (message.method === 'initialize') {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: {},
                  sampling: {}
                },
                serverInfo: {
                  name: 'healthcare-mcp',
                  version: '2.1.1'
                }
              }
            };
          }
          else if (message.method === 'ping') {
            // Handle ping method - simple echo response
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {}
            };
          }
          else if (message.method === 'tools/list') {
            // Return list of available tools with full schemas
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: { tools: TOOL_SCHEMAS }
            };
          }
          else if (message.method === 'tools/call') {
            const { name, arguments: args } = message.params;
            const result = await handleCallTool(name, args || {});
            
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }
                ]
              }
            };
          }
          else {
            // Method not found
            response = {
              jsonrpc: '2.0',
              id: message.id || null,
              error: {
                code: -32601,
                message: `Method not found: ${message.method}`
              }
            };
          }
          
          // Send response via SSE connection
          const sse = sseConnections.get(connectionId);
          console.error(`[POST ${connectionId}] Looking up SSE connection, found:`, !!sse);
          if (sse) {
            console.error(`[POST ${connectionId}] Sending response via SSE:`, JSON.stringify(response));
            sse.sendMessage(response);
            // Simple HTTP acknowledgment (not JSON-RPC)
            res.writeHead(204);
            return res.end();
          } else {
            // Connection not found, send response via HTTP
            console.error(`SSE connection ${connectionId} not found, falling back to HTTP`);
            return writeJson(res, 200, response);
          }
          
        } catch (err) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error: ' + err.message
            }
          };
          
          // Try to send via SSE if connection exists
          const sse = sseConnections.get(connectionId);
          if (sse) {
            sse.sendMessage(errorResponse);
            // Simple HTTP acknowledgment (not JSON-RPC)
            res.writeHead(204);
            return res.end();
          }
          return writeJson(res, 400, errorResponse);
        }
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      return writeJson(res, 200, {
        status: 'ok',
        session_id: sessionId,
        cache_ttl_seconds: cacheService.cache.options.stdTTL,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'GET' && pathname === '/api/fda') {
      const drugName = url.searchParams.get('drug_name') || '';
      const searchType = url.searchParams.get('search_type') || 'general';
      const result = await fdaTool.lookupDrug(drugName, searchType);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/pubmed') {
      const query = url.searchParams.get('query') || '';
      const maxResults = url.searchParams.get('max_results') || 5;
      const dateRange = url.searchParams.get('date_range') || '';
      const openAccess = (url.searchParams.get('open_access') || 'false') === 'true';
      const result = await pubmedTool.searchLiterature(query, maxResults, dateRange, openAccess);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/health_finder') {
      const topic = url.searchParams.get('topic') || '';
      const language = url.searchParams.get('language') || 'en';
      const result = await healthTopicsTool.getHealthTopics(topic, language);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/clinical_trials') {
      const condition = url.searchParams.get('condition') || '';
      const status = url.searchParams.get('status') || 'recruiting';
      const maxResults = url.searchParams.get('max_results') || 10;
      const result = await clinicalTrialsTool.searchTrials(condition, status, maxResults);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/medical_terminology') {
      const code = url.searchParams.get('code') || '';
      const description = url.searchParams.get('description') || '';
      const maxResults = url.searchParams.get('max_results') || 10;
      const result = await medicalTerminologyTool.lookupICDCode(code, description, maxResults);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/clinical_concepts') {
      const concept = url.searchParams.get('concept') || '';
      const version = url.searchParams.get('version') || 'current';
      const searchType = url.searchParams.get('search_type') || 'exact';
      const maxResults = url.searchParams.get('max_results') || 10;
      const sourcesParam = url.searchParams.get('sources') || '';
      const sources = sourcesParam ? sourcesParam.split(',').map(s => s.trim()) : [];
      const result = await clinicalConceptsTool.searchConcept(concept, version, searchType, maxResults, sources);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/clinical_concept') {
      const cui = url.searchParams.get('cui') || '';
      const version = url.searchParams.get('version') || 'current';
      const result = await clinicalConceptsTool.getConceptById(cui, version);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/clinical_concept_relations') {
      const cui = url.searchParams.get('cui') || '';
      const version = url.searchParams.get('version') || 'current';
      const result = await clinicalConceptsTool.getConceptRelations(cui, version);
      return writeJson(res, 200, result);
    }

    if (req.method === 'GET' && pathname === '/api/source_abbreviations') {
      const result = await clinicalConceptsTool.getSourceAbbreviations();
      return writeJson(res, 200, result);
    }

    if (req.method === 'POST' && pathname === '/mcp/call-tool') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const name = parsed.name;
          const args = parsed.arguments || {};
          const result = await handleCallTool(name, args);
          return writeJson(res, 200, result);
        } catch (err) {
          return writeJson(res, 400, { status: 'error', error_message: `Invalid JSON body: ${err.message}` });
        }
      });
      return;
    }

    writeJson(res, 404, { status: 'error', error_message: 'Not Found' });
  } catch (error) {
    console.error('HTTP handler error:', error);
    writeJson(res, 500, { status: 'error', error_message: error.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.error(`Healthcare MCP HTTP server listening on http://0.0.0.0:${PORT}`);
  console.error(`Session ID: ${sessionId}`);
  console.error(`Cache TTL: ${cacheService.cache.options.stdTTL} seconds`);
});


