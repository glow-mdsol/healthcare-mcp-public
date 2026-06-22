// Canonical MCP tool definitions for the Healthcare MCP server.
//
// This is the single source of truth for tool name, description, inputSchema
// and outputSchema. Both the stdio server (index.js) and the HTTP server
// (http-server.js) import this list so the two transports never drift apart.
//
// Every tool returns a structured object of the shape { status, ... }:
//   - success: { status: "success", ...tool specific fields }
//   - error:   { status: "error", error_message: "..." }
// The same object is returned as `structuredContent` (validated against
// outputSchema) and as a pretty-printed JSON `text` content block.

// Wrap a set of success-shape properties in the common response envelope.
function result(properties = {}) {
  return {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["success", "error"],
        description: "Whether the call succeeded",
      },
      error_message: {
        type: "string",
        description: 'Human-readable error detail; present only when status is "error"',
      },
      ...properties,
    },
    required: ["status"],
  };
}

// Reusable schema for a clinical trial record (search results carry a subset,
// get_clinical_trial_by_nct_id carries the full record).
const trialSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    nct_id: { type: "string" },
    title: { type: "string" },
    official_title: { type: "string" },
    status: { type: "string", description: "Overall recruitment status" },
    phase: { type: "array", items: { type: "string" } },
    study_type: { type: "string" },
    enrollment: { type: "number" },
    conditions: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    sponsor: { type: "string" },
    collaborators: { type: "array", items: { type: "string" } },
    brief_summary: { type: "string" },
    detailed_description: { type: "string" },
    primary_outcomes: { type: "array", items: { type: "object", additionalProperties: true } },
    secondary_outcomes: { type: "array", items: { type: "object", additionalProperties: true } },
    interventions: { type: "array", items: { type: "object", additionalProperties: true } },
    locations: { type: "array", items: { type: "object", additionalProperties: true } },
    start_date: { type: "string" },
    completion_date: { type: "string" },
    last_update: { type: "string" },
    url: { type: "string" },
    eligibility: {
      type: "object",
      additionalProperties: true,
      properties: {
        gender: { type: "string" },
        min_age: { type: "string" },
        max_age: { type: "string" },
        healthy_volunteers: { type: "string" },
        inclusion_criteria: { type: "array", items: { type: "string" } },
        exclusion_criteria: { type: "array", items: { type: "string" } },
      },
    },
  },
};

export const TOOL_DEFINITIONS = [
  {
    name: "fda_drug_lookup",
    description: "Look up drug information from the FDA database (openFDA). Returns labeling, NDC/general product data, or adverse-event summaries depending on search_type.",
    inputSchema: {
      type: "object",
      properties: {
        drug_name: { type: "string", description: "Name of the drug to search for (generic or brand)" },
        search_type: {
          type: "string",
          description: "Type of information to retrieve: 'general' (product/NDC), 'label' (drug labeling), or 'adverse_events'",
          enum: ["general", "label", "adverse_events"],
          default: "general",
        },
      },
      required: ["drug_name"],
    },
    outputSchema: result({
      drug_name: { type: "string", description: "Echo of the requested drug name" },
      search_type: { type: "string", enum: ["general", "label", "adverse_events"] },
      total_results: { type: "number", description: "Total matches reported by openFDA" },
      drugs: {
        type: "array",
        description: "Matching drug products",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            product_number: { type: "string", description: "Product NDC / code" },
            generic_name: { type: "string" },
            brand_name: { type: "string" },
            labeler_name: { type: "string", description: "Manufacturer / labeler" },
            product_type: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "pubmed_search",
    description: "Search peer-reviewed medical literature in the PubMed database. Returns article metadata and links.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for medical literature" },
        max_results: { type: "number", description: "Maximum number of results to return", default: 5, minimum: 1, maximum: 100 },
        date_range: { type: "string", description: "Limit to articles published within N years (e.g. '5' for last 5 years)", default: "" },
        open_access: { type: "boolean", description: "Filter for open access articles", default: false },
      },
      required: ["query"],
    },
    outputSchema: result({
      query: { type: "string" },
      total_results: { type: "number", description: "Total matches in PubMed" },
      date_range: { type: "string" },
      open_access: { type: "boolean" },
      articles: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            id: { type: "string", description: "PubMed ID (PMID)" },
            title: { type: "string" },
            authors: { type: "array", items: { type: "string" } },
            journal: { type: "string" },
            publication_date: { type: "string" },
            abstract_url: { type: "string", description: "Link to the article on pubmed.ncbi.nlm.nih.gov" },
            doi: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "medrxiv_search",
    description: "Search medRxiv for pre-print (not yet peer-reviewed) medical articles from the last ~180 days.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for medRxiv articles" },
        max_results: { type: "number", description: "Maximum number of results to return", default: 10, minimum: 1, maximum: 100 },
      },
      required: ["query"],
    },
    outputSchema: result({
      query: { type: "string" },
      total_results: { type: "number" },
      articles: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            title: { type: "string" },
            authors: { type: "string", description: "Author list (raw string from medRxiv)" },
            doi: { type: "string" },
            abstract_url: { type: "string" },
            publication_date: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "calculate_bmi",
    description: "Calculate Body Mass Index (BMI) from height in meters and weight in kilograms.",
    inputSchema: {
      type: "object",
      properties: {
        height_meters: { type: "number", description: "Height in meters" },
        weight_kg: { type: "number", description: "Weight in kilograms" },
      },
      required: ["height_meters", "weight_kg"],
    },
    outputSchema: result({
      bmi: { type: "string", description: "Body Mass Index, formatted to 2 decimal places" },
    }),
  },
  {
    name: "ncbi_bookshelf_search",
    description: "Search the NCBI Bookshelf for biomedical books and documents.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for NCBI Bookshelf" },
        max_results: { type: "number", description: "Maximum number of results to return", default: 10, minimum: 1, maximum: 100 },
      },
      required: ["query"],
    },
    outputSchema: result({
      query: { type: "string" },
      total_results: { type: "number" },
      books: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            authors: { type: "array", items: { type: "string" } },
            publication_date: { type: "string" },
            url: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "extract_dicom_metadata",
    description: "Extract metadata (patient, study and series description) from a local DICOM medical-imaging file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the DICOM file on the server" },
      },
      required: ["file_path"],
    },
    outputSchema: result({
      patientName: { type: "string" },
      patientId: { type: "string" },
      studyDescription: { type: "string" },
      seriesDescription: { type: "string" },
    }),
  },
  {
    name: "health_topics",
    description: "Get evidence-based consumer health information from MedlinePlus / Health.gov for a given topic.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Health topic to search for information" },
        language: { type: "string", description: "Language for content (en or es)", enum: ["en", "es"], default: "en" },
      },
      required: ["topic"],
    },
    outputSchema: result({
      search_term: { type: "string" },
      language: { type: "string", enum: ["en", "es"] },
      total_results: { type: "number" },
      health_topics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            last_updated: { type: "string" },
            section: { type: "string" },
            description: { type: "string" },
            content: { type: "array", items: { type: "string" }, description: "Cleaned content snippets" },
          },
        },
      },
    }),
  },
  {
    name: "clinical_trials_search",
    description: "Search ClinicalTrials.gov for trials by condition and status. Returns a list of trial summaries.",
    inputSchema: {
      type: "object",
      properties: {
        condition: { type: "string", description: "Medical condition or disease to search for" },
        status: {
          type: "string",
          description: "Trial recruitment status filter",
          enum: ["recruiting", "completed", "active", "not_recruiting", "all"],
          default: "recruiting",
        },
        max_results: { type: "number", description: "Maximum number of results to return", default: 10, minimum: 1, maximum: 100 },
      },
      required: ["condition"],
    },
    outputSchema: result({
      condition: { type: "string" },
      search_status: { type: "string", description: "Status filter that was applied" },
      total_results: { type: "number" },
      trials: { type: "array", items: trialSchema },
    }),
  },
  {
    name: "get_clinical_trial_by_nct_id",
    description: "Get the full record for a single clinical trial by its NCT identifier.",
    inputSchema: {
      type: "object",
      properties: {
        nct_id: { type: "string", description: "NCT identifier for the clinical trial (e.g., NCT12345678)" },
      },
      required: ["nct_id"],
    },
    outputSchema: result({
      nct_id: { type: "string" },
      trial: trialSchema,
    }),
  },
  {
    name: "extract_clinical_trial_concepts",
    description: "Extract and map medical concepts from a clinical trial's eligibility criteria to UMLS standardized vocabularies. Identifies conditions, procedures, medications, biomarkers, etc. via an LLM, then maps them to UMLS CUIs. NOTE: requires MCP sampling capability; only works over the stdio transport, not HTTP.",
    inputSchema: {
      type: "object",
      properties: {
        nct_id: { type: "string", description: "NCT identifier for the clinical trial (e.g., NCT12345678)" },
      },
      required: ["nct_id"],
    },
    outputSchema: result({
      nct_id: { type: "string" },
      summary: {
        type: "object",
        additionalProperties: true,
        properties: {
          total_concepts: { type: "number" },
          by_category: { type: "object", additionalProperties: true, description: "Concept counts keyed by category" },
          mapped_to_umls: { type: "number", description: "How many concepts were mapped to a UMLS CUI" },
        },
      },
      extracted_concepts: {
        type: "array",
        items: { type: "object", additionalProperties: true },
        description: "Extracted concepts, each with its UMLS mapping",
      },
      eligibility_criteria: {
        type: "object",
        additionalProperties: true,
        properties: {
          inclusion: { type: "array", items: { type: "string" } },
          exclusion: { type: "array", items: { type: "string" } },
        },
      },
    }),
  },
  {
    name: "lookup_icd_code",
    description: "Look up ICD-10-CM codes by code or by description (via the NLM Clinical Tables API).",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "ICD-10 code to look up (optional if description is provided)" },
        description: { type: "string", description: "Condition description to search for (optional if code is provided)" },
        max_results: { type: "number", description: "Maximum number of results to return", default: 10, minimum: 1, maximum: 50 },
      },
    },
    outputSchema: result({
      search_type: { type: "string", enum: ["code", "description"], description: "Which input drove the lookup" },
      search_term: { type: "string" },
      total_results: { type: "number" },
      codes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            code: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "search_clinical_concepts",
    description: "Search the UMLS Metathesaurus for clinical concepts. Supports restricting to specific source vocabularies (SABs) and choosing the returned identifier type. See https://documentation.uts.nlm.nih.gov/rest/search/index.html",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", description: "Clinical concept / term to search for" },
        version: { type: "string", description: "UMLS version to search", default: "current" },
        search_type: {
          type: "string",
          description: "Type of search to perform",
          enum: ["words", "exact", "leftTruncation", "rightTruncation", "normalizedString", "normalizedWords", "approximate"],
          default: "words",
        },
        max_results: { type: "number", description: "Maximum number of results to return", default: 10, minimum: 1, maximum: 1000 },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Restrict the search to specific source vocabularies / SABs (e.g., ['ICD10CM', 'SNOMEDCT_US'])",
          default: [],
        },
        return_id_type: {
          type: "string",
          description: "Type of identifier to return. Defaults to 'concept' (UMLS CUIs); use 'code' to get source-asserted codes",
          enum: ["aui", "concept", "code", "sourceConcept", "sourceDescriptor", "sourceUi"],
          default: "concept",
        },
        input_type: {
          type: "string",
          description: "The data type of the search string",
          enum: ["atom", "code", "sourceConcept", "sourceDescriptor", "sourceUi", "tty"],
        },
        partial_search: { type: "boolean", description: "Whether to include partial matches", default: false },
      },
      required: ["concept"],
    },
    outputSchema: result({
      concept: { type: "string" },
      version: { type: "string" },
      searchType: { type: "string" },
      returnIdType: { type: "string" },
      sources: { type: "array", items: { type: "string" }, description: "Validated SABs that were applied" },
      partialSearch: { type: "boolean" },
      totalCount: { type: "number" },
      returnedCount: { type: "number" },
      maxRequested: { type: "number" },
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            ui: { type: "string", description: "Identifier (CUI or source code, per returnIdType)" },
            rootSource: { type: "string", description: "Source vocabulary (SAB)" },
            uri: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "get_clinical_concept_by_cui",
    description: "Fetch a single UMLS concept by its CUI (Concept Unique Identifier).",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier (CUI), e.g. C0011849" },
        version: { type: "string", description: "UMLS version to search", default: "current" },
      },
      required: ["cui"],
    },
    outputSchema: result({
      ui: { type: "string", description: "The CUI" },
      name: { type: "string", description: "Preferred concept name" },
      semanticTypes: { type: "array", items: { type: "object", additionalProperties: true } },
      definitions: { type: "string", description: "URI to definitions endpoint" },
      relations: { type: "string", description: "URI to relations endpoint" },
      atoms: { type: "string", description: "URI to atoms endpoint" },
    }),
  },
  {
    name: "get_concept_definitions_by_cui",
    description: "Fetch definitions for a UMLS concept by CUI, with pagination and optional source filtering.",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier (CUI)" },
        version: { type: "string", description: "UMLS version to search", default: "current" },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Filter by specific source vocabularies / SABs (e.g., ['MSH', 'NCI', 'SNOMEDCT_US'])",
          default: [],
        },
        max_results: { type: "number", description: "Maximum results per page", default: 25, minimum: 1, maximum: 1000 },
        page_number: { type: "number", description: "Page number to retrieve", default: 1, minimum: 1 },
      },
      required: ["cui"],
    },
    outputSchema: result({
      cui: { type: "string" },
      pageNumber: { type: "number" },
      pageSize: { type: "number" },
      totalCount: { type: "number" },
      returnedCount: { type: "number" },
      maxRequested: { type: "number" },
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            definition: { type: "string" },
            source: { type: "string", description: "Source vocabulary (SAB)" },
            sourceOriginated: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "get_related_clinical_concept_by_cui",
    description: "Fetch concepts related to a UMLS concept by CUI, with pagination and optional source filtering.",
    inputSchema: {
      type: "object",
      properties: {
        cui: { type: "string", description: "Concept Unique Identifier (CUI)" },
        version: { type: "string", description: "UMLS version to search", default: "current" },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Filter by specific source vocabularies / SABs (e.g., ['ICD10CM', 'SNOMEDCT_US'])",
          default: [],
        },
        max_results: { type: "number", description: "Maximum results per page", default: 25, minimum: 1, maximum: 1000 },
        page_number: { type: "number", description: "Page number to retrieve", default: 1, minimum: 1 },
      },
      required: ["cui"],
    },
    outputSchema: result({
      cui: { type: "string" },
      pageNumber: { type: "number" },
      pageSize: { type: "number" },
      totalCount: { type: "number" },
      returnedCount: { type: "number" },
      maxRequested: { type: "number" },
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            ui: { type: "string", description: "Relation identifier" },
            relatedId: { type: "string", description: "CUI of the related concept" },
            relatedIdName: { type: "string", description: "Name of the related concept" },
            relationLabel: { type: "string", description: "Relationship type (e.g. RB, RN, PAR, CHD)" },
            additionalRelationLabel: { type: "string" },
            rootSource: { type: "string", description: "Source vocabulary (SAB)" },
            classType: { type: "string" },
          },
        },
      },
    }),
  },
  {
    name: "get_source_abbreviations",
    description: "List the UMLS source vocabulary abbreviations (SABs) and their full names. Useful for choosing the 'sources' filter on the other UMLS tools.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: result({
      count: { type: "number" },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            name: { type: "string", description: "Full source vocabulary name" },
            abbreviation: { type: "string", description: "SAB abbreviation" },
          },
        },
      },
    }),
  },
  {
    name: "get_usage_stats",
    description: "Get tool-usage statistics for the current server session.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: result({
      session_id: { type: "string" },
      session_start: { type: "string", description: "ISO timestamp" },
      total_calls: { type: "number" },
      tool_usage: { type: "object", additionalProperties: { type: "number" }, description: "Call count keyed by tool name" },
    }),
  },
  {
    name: "get_all_usage_stats",
    description: "Get overall tool-usage statistics aggregated across sessions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: result({
      overall_stats: {
        type: "object",
        additionalProperties: true,
        properties: {
          session_start: { type: "string", description: "ISO timestamp" },
          total_calls: { type: "number" },
          tool_usage: { type: "object", additionalProperties: { type: "number" } },
        },
      },
    }),
  },
];

export default TOOL_DEFINITIONS;
