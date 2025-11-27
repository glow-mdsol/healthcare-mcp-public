# Clinical Trial Concept Extraction - Usage Examples

## Example 1: Basic Concept Extraction

Extract concepts from a diabetes clinical trial:

```javascript
// MCP Tool Call
{
  "name": "extract_clinical_trial_concepts",
  "arguments": {
    "nct_id": "NCT04793126"
  }
}
```

### Response Summary

```json
{
  "success": true,
  "data": {
    "nct_id": "NCT04793126",
    "trial_title": "Efficacy of GLP-1 Receptor Agonist in Type 2 Diabetes",
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
    }
  }
}
```

## Example 2: Analyzing Specific Concepts

### Extracted Condition Concepts

```json
{
  "original_concept": "Type 2 Diabetes Mellitus",
  "category": "Conditions/Diseases",
  "context": "inclusion",
  "specifics": "HbA1c ≥ 7.0% and ≤ 10.0%",
  "umls_mapping": {
    "found": true,
    "cui": "C0011860",
    "preferred_term": "Diabetes Mellitus, Non-Insulin-Dependent",
    "semantic_types": ["Disease or Syndrome"],
    "definitions": [
      {
        "source": "NCI",
        "text": "A type of diabetes mellitus characterized by insulin resistance or desensitization..."
      }
    ]
  }
}
```

### Extracted Biomarker Concepts

```json
{
  "original_concept": "HbA1c",
  "category": "Biomarkers",
  "context": "inclusion",
  "specifics": "7.0% - 10.0% range required",
  "umls_mapping": {
    "found": true,
    "cui": "C0019018",
    "preferred_term": "Hemoglobin A, Glycosylated",
    "semantic_types": ["Laboratory Procedure", "Amino Acid, Peptide, or Protein"]
  }
}
```

### Extracted Medication Concepts

```json
{
  "original_concept": "GLP-1 receptor agonist",
  "category": "Medications",
  "context": "exclusion",
  "specifics": "prior use within 3 months",
  "umls_mapping": {
    "found": true,
    "cui": "C1562104",
    "preferred_term": "Glucagon-Like Peptide 1 Receptor Agonist",
    "semantic_types": ["Pharmacologic Substance"]
  }
}
```

## Example 3: Multi-Trial Comparison Workflow

Compare eligibility criteria across similar trials:

```javascript
// Step 1: Extract concepts from Trial A
extract_clinical_trial_concepts("NCT04793126")

// Step 2: Extract concepts from Trial B  
extract_clinical_trial_concepts("NCT05123456")

// Step 3: Compare common CUIs
// Both trials require:
// - C0011860 (Type 2 Diabetes)
// - C0019018 (HbA1c testing)
// 
// Trial A excludes:
// - C1562104 (GLP-1 agonist use)
//
// Trial B excludes:
// - C0021641 (Insulin use)
```

## Example 4: Patient Matching Use Case

Determine if patient meets trial eligibility:

```javascript
// Extract trial requirements
const trialConcepts = await extract_clinical_trial_concepts("NCT04793126");

// Filter inclusion criteria conditions
const requiredConditions = trialConcepts.data.extracted_concepts
  .filter(c => c.context === "inclusion" && c.category === "Conditions/Diseases")
  .map(c => ({
    concept: c.original_concept,
    cui: c.umls_mapping.cui,
    specifics: c.specifics
  }));

// Patient has:
// - Type 2 Diabetes (C0011860) ✓ matches
// - HbA1c 8.2% ✓ within range (7.0-10.0%)
// - No GLP-1 use ✓ meets exclusion
// 
// Result: Patient may be eligible
```

## Example 5: Research Literature Connection

Connect trial concepts to research:

```javascript
// Step 1: Extract biomarker concepts from trial
const concepts = await extract_clinical_trial_concepts("NCT04793126");

// Step 2: Get HbA1c concept details
const hba1cConcept = concepts.data.extracted_concepts
  .find(c => c.original_concept.includes("HbA1c"));

// Step 3: Search PubMed using the CUI or preferred term
await pubmed_search(hba1cConcept.umls_mapping.preferred_term + " AND diabetes", 10);

// Returns recent research on HbA1c in diabetes management
```

## Example 6: Temporal Constraint Analysis

Extract time-based eligibility requirements:

```json
{
  "original_concept": "3-month washout period",
  "category": "Temporal",
  "context": "exclusion",
  "specifics": "No GLP-1 agonist use within 3 months prior to enrollment",
  "umls_mapping": {
    "found": false,
    "note": "Temporal constraints typically don't map to UMLS"
  }
}
```

## Example 7: Comprehensive Analysis Workflow

Full analysis pipeline:

```javascript
// 1. Get detailed trial information
const trialDetails = await get_clinical_trial_by_nct_id("NCT04793126");

// 2. Extract and map concepts
const concepts = await extract_clinical_trial_concepts("NCT04793126");

// 3. Analyze key condition
const primaryCondition = concepts.data.extracted_concepts
  .find(c => c.category === "Conditions/Diseases");

// 4. Get related concepts for the condition
const relatedConcepts = await get_related_clinical_concept_by_cui(
  primaryCondition.umls_mapping.cui
);

// 5. Search for additional definitions
const definitions = await get_concept_definitions_by_cui(
  primaryCondition.umls_mapping.cui,
  null,  // all sources
  10     // max results
);

// 6. Search relevant literature
const literature = await pubmed_search(
  primaryCondition.umls_mapping.preferred_term,
  5,
  "5"  // last 5 years
);

// Result: Comprehensive understanding of trial eligibility and context
```

## Example 8: Category-Specific Filtering

Filter extracted concepts by category:

```javascript
const result = await extract_clinical_trial_concepts("NCT04793126");

// Get all medication-related concepts
const medications = result.data.extracted_concepts
  .filter(c => c.category === "Medications");

// Get all exclusion criteria
const exclusions = result.data.extracted_concepts
  .filter(c => c.context === "exclusion");

// Get all successfully mapped concepts
const mappedConcepts = result.data.extracted_concepts
  .filter(c => c.umls_mapping.found);

// Get concepts with definitions
const withDefinitions = result.data.extracted_concepts
  .filter(c => c.umls_mapping.definitions?.length > 0);
```

## Example 9: Error Handling

Handle common errors gracefully:

```javascript
try {
  const result = await extract_clinical_trial_concepts("NCT99999999");
  
  if (!result.success) {
    console.error("Extraction failed:", result.error);
    // Error: "Clinical trial NCT99999999 not found"
  }
} catch (error) {
  console.error("Request failed:", error.message);
}

// Handle invalid NCT ID format
try {
  const result = await extract_clinical_trial_concepts("INVALID123");
  // Error: "Invalid NCT ID format. Expected format: NCT########"
} catch (error) {
  console.error("Validation error:", error.message);
}
```

## Example 10: Caching Behavior

Understand caching for repeated queries:

```javascript
// First call - full extraction (~20 seconds)
const result1 = await extract_clinical_trial_concepts("NCT04793126");
// Executes: Trial fetch → LLM extraction → UMLS mapping

// Second call within 24 hours - cached (~100ms)
const result2 = await extract_clinical_trial_concepts("NCT04793126");
// Returns: Cached result immediately

// Both results are identical
console.log(result1 === result2); // true (same cached object)
```

## Integration Patterns

### Pattern 1: Trial Screening Pipeline

```javascript
async function screenPatientForTrials(patientProfile, trialIds) {
  const eligibleTrials = [];
  
  for (const nctId of trialIds) {
    // Extract concepts from trial
    const concepts = await extract_clinical_trial_concepts(nctId);
    
    // Check patient conditions against inclusion criteria
    const inclusionConcepts = concepts.data.extracted_concepts
      .filter(c => c.context === "inclusion" && c.category === "Conditions/Diseases");
    
    // Match patient diagnoses (by CUI)
    const matches = inclusionConcepts.filter(c => 
      patientProfile.diagnoses.some(d => d.cui === c.umls_mapping.cui)
    );
    
    if (matches.length > 0) {
      eligibleTrials.push({
        nctId,
        title: concepts.data.trial_title,
        matchedCriteria: matches
      });
    }
  }
  
  return eligibleTrials;
}
```

### Pattern 2: Concept Vocabulary Builder

```javascript
async function buildTrialVocabulary(nctIds) {
  const vocabulary = new Map();
  
  for (const nctId of nctIds) {
    const concepts = await extract_clinical_trial_concepts(nctId);
    
    concepts.data.extracted_concepts.forEach(concept => {
      if (concept.umls_mapping.found) {
        const cui = concept.umls_mapping.cui;
        
        if (!vocabulary.has(cui)) {
          vocabulary.set(cui, {
            cui,
            preferredTerm: concept.umls_mapping.preferred_term,
            semanticTypes: concept.umls_mapping.semantic_types,
            trials: []
          });
        }
        
        vocabulary.get(cui).trials.push({
          nctId,
          context: concept.context,
          category: concept.category
        });
      }
    });
  }
  
  return Array.from(vocabulary.values());
}
```

### Pattern 3: Eligibility Complexity Analysis

```javascript
async function analyzeEligibilityComplexity(nctId) {
  const concepts = await extract_clinical_trial_concepts(nctId);
  
  const analysis = {
    totalConcepts: concepts.data.extraction_summary.total_concepts,
    inclusionCount: concepts.data.extracted_concepts
      .filter(c => c.context === "inclusion").length,
    exclusionCount: concepts.data.extracted_concepts
      .filter(c => c.context === "exclusion").length,
    quantitativeConstraints: concepts.data.extracted_concepts
      .filter(c => c.specifics && /\d/.test(c.specifics)).length,
    complexityScore: 0
  };
  
  // Calculate complexity score
  analysis.complexityScore = 
    (analysis.inclusionCount * 1.5) +
    (analysis.exclusionCount * 2.0) +
    (analysis.quantitativeConstraints * 2.5);
  
  return analysis;
}
```

## Best Practices

### 1. Always Validate NCT IDs

```javascript
function validateNCTId(nctId) {
  const pattern = /^NCT\d{8}$/i;
  return pattern.test(nctId);
}

if (validateNCTId(userInput)) {
  const result = await extract_clinical_trial_concepts(userInput);
}
```

### 2. Check Mapping Success

```javascript
const concepts = await extract_clinical_trial_concepts(nctId);

// Identify unmapped concepts
const unmapped = concepts.data.extracted_concepts
  .filter(c => !c.umls_mapping.found);

if (unmapped.length > 0) {
  console.warn(`${unmapped.length} concepts could not be mapped to UMLS`);
  // Consider manual review
}
```

### 3. Leverage Caching

```javascript
// Batch process trials efficiently
async function processManyTrials(nctIds) {
  // First pass - populates cache
  const results = await Promise.all(
    nctIds.map(id => extract_clinical_trial_concepts(id))
  );
  
  // Subsequent access is instant from cache
  return results;
}
```

### 4. Use Semantic Types for Filtering

```javascript
const concepts = await extract_clinical_trial_concepts(nctId);

// Find only laboratory tests
const labTests = concepts.data.extracted_concepts
  .filter(c => 
    c.umls_mapping.semantic_types?.includes("Laboratory Procedure")
  );

// Find only diseases
const diseases = concepts.data.extracted_concepts
  .filter(c => 
    c.umls_mapping.semantic_types?.includes("Disease or Syndrome")
  );
```

## Performance Tips

1. **Batch Processing**: Extract concepts from multiple trials in parallel
2. **Cache Awareness**: Results cached for 24 hours - plan queries accordingly
3. **Filter Early**: Use category and context filters to reduce data processing
4. **Limit Definitions**: Definitions are limited to 5 per concept for performance

## Common Issues

### Issue: HTTP API Returns Error

**Problem**: Attempting to use tool via HTTP endpoint
```json
{
  "success": false,
  "error": "extract_clinical_trial_concepts requires MCP protocol with sampling capability"
}
```

**Solution**: Use MCP client (stdio) instead of HTTP API

### Issue: Slow Extraction

**Problem**: Extraction taking longer than expected

**Solutions**:
- Check network connectivity to ClinicalTrials.gov
- Verify UMLS API key is valid
- Consider trial has very long eligibility criteria (increases LLM processing time)
- Use cached results for repeated queries

### Issue: Poor Concept Mapping

**Problem**: Many concepts not mapped to UMLS

**Solutions**:
- Review original text for abbreviations or slang
- Check semantic types to verify correct mapping
- Use `get_related_clinical_concept_by_cui` to find alternatives
- Consider manual review for critical concepts
