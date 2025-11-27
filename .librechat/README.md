# Healthcare MCP Server with LibreChat

This directory contains example configurations for using the Healthcare MCP Server with LibreChat.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .librechat/librechat.yaml.example librechat.yaml
   ```

2. **Update API keys in `librechat.yaml`:**
   - Replace `your_umls_api_key_here` with your UMLS API key
   - Replace `your_fda_api_key_here` with your FDA API key (optional)
   - Replace `your_pubmed_api_key_here` with your PubMed API key (optional)

3. **Build the Healthcare MCP Docker image:**
   ```bash
   docker build -t healthcare-mcp-public-healthcare-mcp:latest .
   ```

4. **Start LibreChat with MCP support:**
   ```bash
   docker-compose up -d
   ```

## Configuration Options

### Docker Deployment (Recommended)

The example configuration uses Docker to run the Healthcare MCP server:

```yaml
mcpServers:
  healthcare-mcp:
    command: docker
    args:
      - run
      - -i
      - --rm
      - --network
      - host
      - -e
      - UMLS_API_KEY=your_api_key
      - healthcare-mcp-public-healthcare-mcp:latest
```

**Benefits:**
- Isolated environment
- Easy deployment
- No Node.js installation required
- Consistent behavior across systems

### Direct Node.js Deployment

Alternative configuration without Docker:

```yaml
mcpServers:
  healthcare-mcp:
    command: node
    args:
      - /path/to/healthcare-mcp-public/server/index.js
    env:
      UMLS_API_KEY: your_api_key
      CACHE_TTL: "86400"
```

## Available Tools

The Healthcare MCP server provides 18 tools across 6 categories:

### Research & Literature (6 tools)
- `search_pubmed` - Search PubMed for medical literature
- `search_medrxiv` - Search medRxiv for preprints
- `search_health_topics` - Search health topics
- `search_ncbi_bookshelf` - Search NCBI Bookshelf
- `search_clinical_trials` - Search ClinicalTrials.gov
- `get_clinical_trial_by_nct_id` - Get detailed trial information

### Medical Terminology (6 tools)
- `search_umls_concepts` - Search UMLS medical concepts
- `get_concept_by_cui` - Get concept details by CUI
- `get_concept_definitions` - Get comprehensive definitions
- `get_concept_relations` - Get concept relationships
- `get_semantic_types` - Get semantic type information
- `search_icd10` - Search ICD-10 codes

### Drug Information (3 tools)
- `search_fda_drugs` - Search FDA approved drugs
- `get_fda_drug_by_id` - Get detailed drug information
- `search_drug_labels` - Search drug labels

### AI-Powered Analysis (1 tool)
- `extract_clinical_trial_concepts` - Extract medical concepts from eligibility criteria

### Medical Imaging (1 tool)
- `parse_dicom` - Parse DICOM medical images

### Utilities (1 tool)
- `get_usage_stats` - Get API usage statistics

## Model Configuration

### OpenAI Models

```yaml
endpoints:
  custom:
    - name: "Healthcare Assistant"
      apiKey: "${OPENAI_API_KEY}"
      baseURL: "https://api.openai.com/v1"
      models:
        default:
          - "gpt-4"
          - "gpt-3.5-turbo"
      mcpServers:
        - healthcare-mcp
```

### Ollama (Local LLMs)

```yaml
endpoints:
  ollama:
    baseURL: "http://localhost:11434/v1"
    models:
      default:
        - "llama3.1"
        - "mistral"
    mcpServers:
      - healthcare-mcp
```

## API Keys

### Required
- **UMLS_API_KEY**: Required for medical terminology tools
  - Get your key at: https://uts.nlm.nih.gov/uts/signup-login

### Optional
- **FDA_API_KEY**: Increases rate limits for FDA tools
  - Get your key at: https://open.fda.gov/apis/authentication/
- **PUBMED_API_KEY**: Increases rate limits for PubMed searches
  - Get your key at: https://www.ncbi.nlm.nih.gov/account/

## Example Usage

Once configured, you can use the healthcare tools in LibreChat conversations:

**Search for medical literature:**
```
Search PubMed for recent studies on diabetes treatment
```

**Find clinical trials:**
```
Find active clinical trials for lung cancer
```

**Look up medical terminology:**
```
What is the UMLS concept for Type 2 Diabetes?
```

**Extract concepts from trial criteria:**
```
Extract medical concepts from clinical trial NCT03421379
```

**Search drug information:**
```
Tell me about the FDA-approved drug aspirin
```

## Troubleshooting

### Connection Issues

If LibreChat can't connect to the MCP server:

1. Ensure the Docker image is built:
   ```bash
   docker images | grep healthcare-mcp
   ```

2. Test the container manually:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
   docker run -i --rm --network host healthcare-mcp-public-healthcare-mcp:latest
   ```

3. Check LibreChat logs:
   ```bash
   docker-compose logs -f librechat
   ```

### API Key Issues

If you get authentication errors:
- Verify your API keys are correctly set in `librechat.yaml`
- Ensure UMLS API key is active (may need activation after signup)
- Check API key format (no extra spaces or quotes)

### Docker Network Issues

If the container can't access external APIs:
- Ensure `--network host` is in the Docker args
- Check your firewall settings
- Verify internet connectivity from Docker containers

## Resources

- Healthcare MCP Documentation: See main README.md
- LibreChat Documentation: https://docs.librechat.ai/
- MCP Protocol: https://modelcontextprotocol.io/
