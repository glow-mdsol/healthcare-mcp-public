# Healthcare MCP Server API Documentation

This document provides detailed documentation for all tools available in the Healthcare MCP Server.

## Overview

**Total Tools Available:** 18

**Categories:**
- **Research & Literature** (6): FDA Drug Lookup, PubMed Search, medRxiv Search, NCBI Bookshelf Search, Clinical Trials Search, Get Clinical Trial by NCT ID
- **Clinical Terminology** (6): Search Clinical Concepts, Get Clinical Concept by CUI, Get Concept Definitions by CUI, Get Related Clinical Concepts by CUI, Get Source Abbreviations, Medical Terminology/ICD-10 Lookup
- **AI-Powered Analysis** (1): Extract Clinical Trial Concepts (requires MCP sampling)
- **Health Information** (1): Health Topics
- **Medical Utilities** (2): Calculate BMI, Extract DICOM Metadata
- **Monitoring** (2): Get Usage Stats, Get All Usage Stats

## Current Tools

### 1. FDA Drug Lookup

```
fda_drug_lookup(drug_name: str, search_type: str = "general")
```

**Description:**  
Look up drug information from the FDA database.

**Parameters:**
- `drug_name`: Name of the drug to search for (required)
- `search_type`: Type of information to retrieve (optional, default: "general")
  - `general`: Basic drug information
  - `label`: Drug labeling information
  - `adverse_events`: Reported adverse events

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/fda?drug_name=aspirin&search_type=label');
const result = await response.json();

// Or using the MCP tool directly
const result = await callTool('fda_drug_lookup', { drug_name: "aspirin", search_type: "label" });
```

**Example Response:**
```json
{
  "status": "success",
  "drug_name": "aspirin",
  "results": [
    {
      "generic_name": "ASPIRIN",
      "brand_name": "BAYER ASPIRIN",
      "manufacturer": "Bayer Healthcare",
      "product_type": "HUMAN OTC DRUG",
      "route": ["ORAL"],
      "dosage_form": "TABLET",
      "warnings": "...",
      "indications_and_usage": "...",
      "contraindications": "..."
    }
  ],
  "total_results": 3
}
```

**Error Response:**
```json
{
  "status": "error",
  "error_message": "Error fetching drug information: 404 Client Error: Not Found"
}
```

**Rate Limits:**
- Free tier: 100 calls/month
- Basic tier: 1,000 calls/month
- Professional tier: 10,000 calls/month

**Testing:**
Use the test file to test this tool:
```bash
npm test
# Or test the HTTP endpoint directly:
curl "http://localhost:3000/api/fda?drug_name=aspirin&search_type=label"
```

**Change Log (April 28, 2025):**

- Fixed an issue where the FDA Drug Lookup endpoint would return a 500 Internal Server Error due to incorrect query formatting for the FDA API. The query now uses spaces around `OR` (e.g., `openfda.generic_name:aspirin OR openfda.brand_name:aspirin`), matching the FDA API's requirements.
- Integration tests confirm the endpoint now returns the correct drug label information for valid requests.

### 2. PubMed Search

```
pubmed_search(query: str, max_results: int = 5, date_range: str = "")
```

**Description:**  
Search for medical literature in the PubMed database.

**Parameters:**
- `query`: Search query for medical literature (required)
- `max_results`: Maximum number of results to return (optional, default: 5)
- `date_range`: Limit to articles published within years (optional, e.g. '5' for last 5 years)

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/pubmed?query=diabetes%20treatment&max_results=3&date_range=2');
const result = await response.json();

// Or using the MCP tool directly
const result = await callTool('pubmed_search', { query: "diabetes treatment", max_results: 3, date_range: "2" });
```

**Example Response:**
```json
{
  "status": "success",
  "query": "diabetes treatment",
  "total_results": 234567,
  "articles": [
    {
      "id": "36251234",
      "title": "New Advances in Type 2 Diabetes Treatment",
      "authors": ["Smith, John A.", "Johnson, Emily B."],
      "journal": "Journal of Diabetes Research",
      "publication_date": "2023 Mar",
      "abstract_url": "https://pubmed.ncbi.nlm.nih.gov/36251234/"
    },
    {
      "id": "36249876",
      "title": "Comparative Efficacy of GLP-1 Receptor Agonists",
      "authors": ["Patel, Anish", "Williams, Sarah"],
      "journal": "Diabetes Care",
      "publication_date": "2023 Feb",
      "abstract_url": "https://pubmed.ncbi.nlm.nih.gov/36249876/"
    },
    {
      "id": "36245678",
      "title": "Long-term Outcomes of Early Insulin Therapy",
      "authors": ["Garcia, Maria", "Chen, David"],
      "journal": "Annals of Internal Medicine",
      "publication_date": "2023 Jan",
      "abstract_url": "https://pubmed.ncbi.nlm.nih.gov/36245678/"
    }
  ]
}
```

**Error Response:**
```json
{
  "status": "error",
  "error_message": "Error searching PubMed: 429 Client Error: Too Many Requests"
}
```

**Rate Limits:**
- Free tier: 100 calls/month
- Basic tier: 1,000 calls/month
- Professional tier: 10,000 calls/month

**Testing:**
Use the test file to test this tool:
```bash
npm test
# Or test the HTTP endpoint directly:
curl "http://localhost:3000/api/pubmed?query=diabetes%20treatment&max_results=3"
```

### 3. Health Topics

```
health_topics(topic: str, language: str = "en")
```

**Description:**  
Get evidence-based health information on various topics from Health.gov.

**Parameters:**
- `topic`: Health topic to search for information (required)
- `language`: Language for content (optional, default: "en")
  - Supported values: "en" (English), "es" (Spanish)

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/health_finder?topic=nutrition&language=en');
const result = await response.json();

// Or using the MCP tool directly
const result = await callTool('health_topics', { topic: "nutrition", language: "en" });
```

**Example Response:**
```json
{
  "status": "success",
  "search_term": "nutrition",
  "language": "en",
  "total_results": 15,
  "topics": [
    {
      "title": "Healthy Eating Plan",
      "url": "https://health.gov/myhealthfinder/topics/health-conditions/diabetes/healthy-eating-plan",
      "last_updated": "2023-01-12",
      "section": "Prevention and Wellness",
      "description": "Nutrition and healthy eating guidelines"
    },
    {
      "title": "Nutrition in Pregnancy",
      "url": "https://health.gov/myhealthfinder/topics/pregnancy/nutrition-during-pregnancy",
      "last_updated": "2023-02-10",
      "section": "Pregnancy",
      "description": "Nutrition guidelines during pregnancy"
    }
  ]
}
```

**Error Response:**
```json
{
  "status": "error",
  "error_message": "Error fetching health information: 500 Server Error: Internal Server Error"
}
```

**Rate Limits:**
- Free tier: 100 calls/month
- Basic tier: 1,000 calls/month
- Professional tier: 10,000 calls/month

**Testing:**
Use the test file to test this tool:
```bash
npm test
# Or test the HTTP endpoint directly:
curl "http://localhost:3000/api/health_finder?topic=nutrition"
```

## Additional Current Tools

### 4. Clinical Trials Search

```
clinical_trials_search(condition: str, status: str = "recruiting", max_results: int = 10)
```

**Description:**  
Search for clinical trials by condition, status, and other parameters.

**Parameters:**
- `condition`: Medical condition or disease to search for (required)
- `status`: Trial status (optional, default: "recruiting")
  - Options: "recruiting", "completed", "active", "not_recruiting", "terminated", "withdrawn", "all"
- `max_results`: Maximum number of results to return (optional, default: 10)

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/clinical_trials?condition=breast%20cancer&status=recruiting&max_results=5');
const result = await response.json();

// Or using the MCP tool directly
const result = await callTool('clinical_trials_search', { condition: "breast cancer", status: "recruiting", max_results: 5 });
```

**Example Response:**
```json
{
  "status": "success",
  "condition": "breast cancer",
  "search_status": "recruiting",
  "total_results": 482,
  "trials": [
    {
      "nct_id": "NCT05123456",
      "title": "Novel Immunotherapy for Metastatic Breast Cancer",
      "status": "Recruiting",
      "phase": "Phase 2",
      "study_type": "Interventional",
      "conditions": ["Breast Cancer", "Metastatic Breast Cancer"],
      "locations": [
        {
          "facility": "Memorial Sloan Kettering Cancer Center",
          "city": "New York",
          "state": "NY",
          "country": "United States"
        }
      ],
      "url": "https://clinicaltrials.gov/study/NCT05123456"
    }
  ]
}
```

**Testing:**
Use the test file to test this tool:
```bash
npm test
# Or test the HTTP endpoint directly:
curl "http://localhost:3000/api/clinical_trials?condition=breast%20cancer&status=recruiting"
```

### 5. Medical Terminology/ICD-10 Lookup

```
lookup_icd_code(code: str = None, description: str = None, max_results: int = 10)
```

**Description:**  
Look up ICD-10 codes by code or description.

**Parameters:**
- `code`: ICD-10 code to look up (optional if description is provided)
- `description`: Medical condition description to search for (optional if code is provided)
- `max_results`: Maximum number of results to return (optional, default: 10)

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/medical_terminology?code=E11.9');
const result = await response.json();
// OR
const response = await fetch('http://localhost:3000/api/medical_terminology?description=type%202%20diabetes');
const result = await response.json();

// Or using the MCP tool directly
const result = await callTool('lookup_icd_code', { code: "E11.9" });
// OR
const result = await callTool('lookup_icd_code', { description: "type 2 diabetes" });
```

**Example Response:**
```json
{
  "status": "success",
  "search_term": "E11.9",
  "total_results": 1,
  "results": [
    {
      "code": "E11.9",
      "description": "Type 2 diabetes mellitus without complications",
      "category": "E11",
      "category_description": "Type 2 diabetes mellitus",
      "chapter": "IV",
      "chapter_description": "Endocrine, nutritional and metabolic diseases"
    }
  ]
}
```

**Testing:**
Use the test file to test this tool:
```bash
npm test
# Or test the HTTP endpoint directly:
curl "http://localhost:3000/api/medical_terminology?code=E11.9"
```

### 6. medRxiv Search

```
medrxiv_search(query: str, max_results: int = 10)
```

**Description:**  
Search for pre-print articles on medRxiv.

**Parameters:**
- `query`: Search query for medRxiv articles (required)
- `max_results`: Maximum number of results to return (optional, default: 10)

### 7. Calculate BMI

```
calculate_bmi(height_meters: float, weight_kg: float)
```

**Description:**  
Calculate Body Mass Index (BMI).

**Parameters:**
- `height_meters`: Height in meters (required)
- `weight_kg`: Weight in kilograms (required)

### 8. NCBI Bookshelf Search

```
ncbi_bookshelf_search(query: str, max_results: int = 10)
```

**Description:**  
Search the NCBI Bookshelf for biomedical books and documents.

**Parameters:**
- `query`: Search query for NCBI Bookshelf (required)
- `max_results`: Maximum number of results to return (optional, default: 10)

### 9. Extract DICOM Metadata

```
extract_dicom_metadata(file_path: str)
```

**Description:**  
Extract metadata from a DICOM file.

**Parameters:**
- `file_path`: Path to the DICOM file (required)

### 10. Search Clinical Concepts (UMLS)

```
search_clinical_concepts(concept: str, max_results?: number, search_type?: string, version?: string)
```

**Description:**  
Search for clinical concepts in the UMLS Metathesaurus, the world's largest collection of biomedical terminology.

**Parameters:**
- `concept`: Clinical concept to search for (required)
- `max_results`: Maximum number of results to return (optional, default: 10, max: 1000)
- `search_type`: Type of search to perform (optional, default: "exact")
  - `exact`: Exact match
  - `words`: Word-based search
  - `leftTruncation`: Left truncation search
  - `rightTruncation`: Right truncation search  
  - `normalizedString`: Normalized string search
  - `normalizedWords`: Normalized word search
- `version`: UMLS version to search (optional, default: "current")

**Example Request:**
```javascript
// Using the MCP tool
const result = await callTool('search_clinical_concepts', { 
  concept: "diabetes", 
  max_results: 5,
  search_type: "words" 
});
```

**Example Response:**
```json
{
  "status": "success",
  "concept": "diabetes",
  "searchType": "words",
  "totalCount": 3792,
  "returnedCount": 5,
  "maxRequested": 5,
  "results": [
    {
      "ui": "C0011849",
      "rootSource": "MTH",
      "uri": "https://uts-ws.nlm.nih.gov/rest/content/2025AA/CUI/C0011849",
      "name": "Diabetes Mellitus"
    },
    {
      "ui": "C0011860", 
      "rootSource": "MTH",
      "uri": "https://uts-ws.nlm.nih.gov/rest/content/2025AA/CUI/C0011860",
      "name": "Diabetes Mellitus, Non-Insulin-Dependent"
    }
  ]
}
```

### 11. Get Clinical Concept by CUI (UMLS)

```
get_clinical_concept_by_cui(cui: str, version?: string)
```

**Description:**  
Fetch detailed information about a clinical concept using its CUI (Concept Unique Identifier) from UMLS.

**Parameters:**
- `cui`: Concept Unique Identifier (required)
- `version`: UMLS version to search (optional, default: "current")

**Example Request:**
```javascript
// Using the MCP tool
const result = await callTool('get_clinical_concept_by_cui', { 
  cui: "C0011847" 
});
```

**Example Response:**
```json
{
  "status": "R",
  "ui": "C0011847",
  "name": "Diabetes",
  "dateAdded": "09-30-1990",
  "majorRevisionDate": "04-29-2021",
  "classType": "Concept",
  "suppressible": false,
  "semanticTypes": [
    {
      "name": "Disease or Syndrome",
      "uri": "https://uts-ws.nlm.nih.gov/rest/semantic-network/2025AA/TUI/T047"
    }
  ],
  "atoms": "https://uts-ws.nlm.nih.gov/rest/content/2025AA/CUI/C0011847/atoms",
  "definitions": "NONE",
  "relations": "https://uts-ws.nlm.nih.gov/rest/content/2025AA/CUI/C0011847/relations",
  "defaultPreferredAtom": "https://uts-ws.nlm.nih.gov/rest/content/2025AA/CUI/C0011847/atoms/preferred",
  "atomCount": 9,
  "cvMemberCount": 0,
  "attributeCount": 0,
  "relationCount": 17
}
```

### 12. Get Clinical Trial by NCT ID

```
get_clinical_trial_by_nct_id(nct_id: str)
```

**Description:**  
Get comprehensive detailed information for a specific clinical trial by its NCT identifier.

**Parameters:**
- `nct_id`: NCT identifier for the clinical trial (required, format: NCT########)

**Example Request:**
```javascript
// Using the HTTP API
const response = await fetch('http://localhost:3000/api/clinical_trial?nct_id=NCT04793126');
const result = await response.json();

// Or using the MCP tool
const result = await callTool('get_clinical_trial_by_nct_id', { 
  nct_id: "NCT04793126" 
});
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "nct_id": "NCT04793126",
    "trial": {
      "nct_id": "NCT04793126",
      "title": "Efficacy of GLP-1 Receptor Agonist in Type 2 Diabetes",
      "official_title": "A Phase 3 Randomized Study...",
      "status": "RECRUITING",
      "phase": ["PHASE3"],
      "study_type": "INTERVENTIONAL",
      "enrollment": 500,
      "conditions": ["Type 2 Diabetes Mellitus"],
      "keywords": ["diabetes", "GLP-1"],
      "sponsor": "National Institute of Health",
      "collaborators": ["University Hospital"],
      "brief_summary": "This study aims to evaluate...",
      "detailed_description": "Detailed study protocol...",
      "primary_outcomes": [{
        "measure": "HbA1c reduction",
        "description": "Change from baseline",
        "time_frame": "12 weeks"
      }],
      "secondary_outcomes": [],
      "interventions": [{
        "type": "DRUG",
        "name": "GLP-1 Agonist",
        "description": "Once weekly injection"
      }],
      "locations": [{
        "facility": "University Medical Center",
        "city": "Boston",
        "state": "MA",
        "country": "United States",
        "zip": "02115",
        "latitude": 42.3601,
        "longitude": -71.0589,
        "status": "RECRUITING"
      }],
      "start_date": "2024-01-15",
      "completion_date": "2025-12-31",
      "last_update": "2024-10-20",
      "url": "https://clinicaltrials.gov/study/NCT04793126",
      "eligibility": {
        "gender": "ALL",
        "min_age": "18 Years",
        "max_age": "75 Years",
        "healthy_volunteers": "No",
        "inclusion_criteria": [
          "Diagnosed with Type 2 Diabetes Mellitus",
          "HbA1c between 7.0% and 10.0%",
          "Age 18-75 years"
        ],
        "exclusion_criteria": [
          "Type 1 Diabetes",
          "Severe renal impairment",
          "Pregnancy or breastfeeding"
        ]
      }
    }
  }
}
```

### 13. Extract Clinical Trial Concepts

```
extract_clinical_trial_concepts(nct_id: str)
```

**Description:**  
Extract and map medical concepts from clinical trial eligibility criteria using AI-powered analysis and UMLS standardized vocabularies. This tool uses MCP sampling to leverage the client's LLM for intelligent concept extraction.

**Parameters:**
- `nct_id`: NCT identifier for the clinical trial (required, format: NCT########)

**Requirements:**
- MCP protocol with sampling capability
- **Not available via HTTP API** (requires bidirectional MCP communication)

**Example Request:**
```javascript
// Only available via MCP client with sampling support
const result = await callTool('extract_clinical_trial_concepts', { 
  nct_id: "NCT04793126" 
});
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "nct_id": "NCT04793126",
    "trial_title": "Efficacy of GLP-1 Receptor Agonist in Type 2 Diabetes",
    "study_conditions": ["Type 2 Diabetes Mellitus"],
    "extraction_summary": {
      "total_concepts": 18,
      "by_category": {
        "Conditions/Diseases": 5,
        "Procedures/Tests": 4,
        "Medications": 3,
        "Biomarkers": 4,
        "Demographics": 2
      },
      "mapped_to_umls": 16
    },
    "extracted_concepts": [
      {
        "original_concept": "Type 2 Diabetes Mellitus",
        "category": "Conditions/Diseases",
        "context": "inclusion",
        "specifics": "HbA1c between 7.0% and 10.0%",
        "umls_mapping": {
          "found": true,
          "cui": "C0011860",
          "preferred_term": "Diabetes Mellitus, Non-Insulin-Dependent",
          "semantic_types": ["Disease or Syndrome"],
          "score": 0.98,
          "definitions": [
            {
              "source": "NCI",
              "text": "A type of diabetes mellitus characterized by..."
            }
          ]
        }
      },
      {
        "original_concept": "HbA1c",
        "category": "Biomarkers",
        "context": "inclusion",
        "specifics": "7.0% - 10.0% range",
        "umls_mapping": {
          "found": true,
          "cui": "C0019018",
          "preferred_term": "Hemoglobin A, Glycosylated",
          "semantic_types": ["Laboratory Procedure"]
        }
      }
    ],
    "eligibility_criteria": {
      "inclusion": ["Diagnosed with Type 2 Diabetes Mellitus", "..."],
      "exclusion": ["Type 1 Diabetes", "..."]
    }
  }
}
```

**Concept Categories:**
- Conditions/Diseases: Diagnoses, symptoms, disorders
- Procedures/Tests: Lab tests, imaging, diagnostic procedures
- Medications: Drugs, therapies, treatments
- Biomarkers: Lab values, genetic markers
- Demographics: Age, gender, population characteristics
- Temporal: Time periods, durations, constraints

**See Also:** [Concept Extraction Tool Documentation](docs/concept-extraction-tool.md)

### 14. Get Concept Definitions by CUI

```
get_concept_definitions_by_cui(cui: str, version?: str, sources?: array, max_results?: int, page_number?: int)
```

**Description:**  
Get detailed definitions for a clinical concept from multiple UMLS source vocabularies.

**Parameters:**
- `cui`: Concept Unique Identifier (required)
- `version`: UMLS version (optional, default: "current")
- `sources`: Filter by specific source vocabularies (optional, e.g., ["SNOMEDCT_US", "ICD10CM"])
- `max_results`: Results per page (optional, default: 25, max: 1000)
- `page_number`: Page number for pagination (optional, default: 1)

**Example Request:**
```javascript
// Using the MCP tool
const result = await callTool('get_concept_definitions_by_cui', { 
  cui: "C0011860",
  sources: ["NCI", "SNOMEDCT_US"],
  max_results: 10
});
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "cui": "C0011860",
    "concept_name": "Diabetes Mellitus, Non-Insulin-Dependent",
    "total_definitions": 5,
    "page": 1,
    "page_size": 10,
    "definitions": [
      {
        "rootSource": "NCI",
        "value": "A type of diabetes mellitus that is characterized by insulin resistance or desensitization and increased blood glucose levels.",
        "sourceOriginated": true
      },
      {
        "rootSource": "SNOMEDCT_US",
        "value": "Diabetes mellitus without complication",
        "sourceOriginated": false
      }
    ]
  }
}
```

### 15. Get Related Clinical Concepts by CUI

```
get_related_clinical_concept_by_cui(cui: str, version?: str, sources?: array, max_results?: int, page_number?: int)
```

**Description:**  
Get related clinical concepts and their relationships from UMLS.

**Parameters:**
- `cui`: Concept Unique Identifier (required)
- `version`: UMLS version (optional, default: "current")
- `sources`: Filter by specific source vocabularies (optional)
- `max_results`: Results per page (optional, default: 25, max: 1000)
- `page_number`: Page number for pagination (optional, default: 1)

**Example Request:**
```javascript
// Using the MCP tool
const result = await callTool('get_related_clinical_concept_by_cui', { 
  cui: "C0011860",
  max_results: 5
});
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "cui": "C0011860",
    "concept_name": "Diabetes Mellitus, Non-Insulin-Dependent",
    "total_relations": 127,
    "page": 1,
    "page_size": 5,
    "relations": [
      {
        "relationLabel": "RB",
        "relatedId": "C0011854",
        "relatedIdName": "Diabetes Mellitus, Type 1",
        "additionalRelationLabel": "broader_than",
        "rootSource": "SNOMEDCT_US"
      },
      {
        "relationLabel": "RN",
        "relatedId": "C0342276",
        "relatedIdName": "Maturity-Onset Diabetes of Young",
        "additionalRelationLabel": "narrower_than",
        "rootSource": "SNOMEDCT_US"
      }
    ]
  }
}
```

### 16. Get Source Abbreviations

```
get_source_abbreviations()
```

**Description:**  
Get a list of all available UMLS source vocabulary abbreviations and their full names.

**Parameters:** None

**Example Request:**
```javascript
// Using the MCP tool
const result = await callTool('get_source_abbreviations', {});
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total_sources": 215,
    "sources": [
      {
        "abbreviation": "SNOMEDCT_US",
        "name": "SNOMED Clinical Terms, US Edition",
        "family": "SNOMEDCT"
      },
      {
        "abbreviation": "ICD10CM",
        "name": "International Classification of Diseases, 10th Edition, Clinical Modification",
        "family": "ICD10"
      },
      {
        "abbreviation": "NCI",
        "name": "NCI Thesaurus",
        "family": "NCI"
      }
    ]
  }
}
```

### 17. Get Usage Stats

```
get_usage_stats()
```

**Description:**  
Get usage statistics for the current session.

**Parameters:** None

**Example Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "abc-123-def",
    "tools_called": {
      "fda_drug_lookup": 5,
      "pubmed_search": 3,
      "search_clinical_concepts": 10
    },
    "total_calls": 18,
    "session_start": "2024-11-05T10:00:00Z"
  }
}
```

### 18. Get All Usage Stats

```
get_all_usage_stats()
```

**Description:**  
Get overall usage statistics across all sessions.

**Parameters:** None

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total_sessions": 42,
    "total_calls": 1250,
    "most_used_tools": [
      {
        "tool": "search_clinical_concepts",
        "count": 450
      },
      {
        "tool": "pubmed_search",
        "count": 320
      }
    ],
    "sessions": [
      {
        "session_id": "session-1",
        "total_calls": 25,
        "last_active": "2024-11-05T15:30:00Z"
      }
    ]
  }
}
```

## Usage Limits and Tiers

The Healthcare MCP Server implements usage limits based on subscription tiers:

### Free Tier
- API calls: 100 per month
- Caching: 24 hours
- Response size: Limited to basic data

### Basic Tier ($9.99/month)
- API calls: 1,000 per month
- Caching: 12 hours
- Response size: Full data
- Access to all tools

### Professional Tier ($29.99/month)
- API calls: 10,000 per month
- Caching: Optional (configurable)
- Response size: Full data with additional details
- Access to all tools
- Priority support

### Enterprise Tier (Custom pricing)
- API calls: Unlimited
- Dedicated support
- Custom integration options
- SLA guarantees

## Error Handling

All tools follow a consistent error handling pattern:

### Common Error Codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid or missing API key
- `403`: Forbidden - Rate limit exceeded
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - API rate limit exceeded
- `500`: Internal Server Error - Server-side error

### Error Response Format:
```json
{
  "status": "error",
  "error_message": "Detailed error description",
  "error_code": 429  // Optional HTTP status code
}
```

## Authentication

### Server API Keys

For HTTP/SSE transport, include your API key in the request headers:

```
X-API-Key: your_api_key_here
```

For direct MCP client connections, the API key is optional as the server will create a session-based ID.

### External API Keys (Environment Variables)

Some tools require external API keys configured as environment variables:

#### Required
- **UMLS_API_KEY**: Required for all UMLS/clinical terminology tools
  - Tools requiring this: `search_clinical_concepts`, `get_clinical_concept_by_cui`, `get_concept_definitions_by_cui`, `get_related_clinical_concept_by_cui`, `get_source_abbreviations`, `extract_clinical_trial_concepts`
  - Get your key at: [UMLS User Authentication](https://uts.nlm.nih.gov/uts/signup-login)

#### Optional (Enhances Rate Limits)
- **FDA_API_KEY**: Improves FDA drug lookup rate limits
  - Get your key at: [FDA API Key Request](https://open.fda.gov/apis/authentication/)
  
- **PUBMED_API_KEY**: Enhances PubMed search performance
  - Get your key at: [NCBI API Keys](https://www.ncbi.nlm.nih.gov/account/settings/)
