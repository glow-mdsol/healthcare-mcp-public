import { BaseTool } from './base-tool.js';

/**
 * Tool for extracting medical concepts from clinical trial eligibility criteria
 * and mapping them to UMLS standardized vocabularies
 */
export class ClinicalTrialsConceptExtractorTool extends BaseTool {
  constructor(cacheService, clinicalTrialsTool, medicalTerminologyTool) {
    super(cacheService);
    this.clinicalTrialsTool = clinicalTrialsTool;
    this.medicalTerminologyTool = medicalTerminologyTool;
  }

  /**
   * Extract and map medical concepts from clinical trial eligibility criteria
   * This method coordinates the LLM sampling and UMLS mapping
   */
  async extractConcepts(nctId, samplingCallback) {
    // Input validation
    if (!nctId) {
      return this.formatErrorResponse('NCT ID is required');
    }

    // Validate NCT ID format
    const nctPattern = /^NCT\d{8}$/i;
    if (!nctPattern.test(nctId)) {
      return this.formatErrorResponse('Invalid NCT ID format. Expected format: NCT########');
    }

    const normalizedNctId = nctId.toUpperCase();

    // Create cache key
    const cacheKey = this.getCacheKey('concept_extraction', normalizedNctId);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for concept extraction: ${normalizedNctId}`);
      return cachedResult;
    }

    try {
      console.error(`Extracting concepts from clinical trial: ${normalizedNctId}`);

      // Step 1: Get trial data using existing ClinicalTrialsTool
      const trialResult = await this.clinicalTrialsTool.getTrialByNctId(normalizedNctId);
      
      if (!trialResult.success) {
        return this.formatErrorResponse(`Failed to retrieve trial data: ${trialResult.error}`);
      }

      const trial = trialResult.data.trial;
      const eligibility = trial.eligibility;

      // Step 2: Prepare data for LLM extraction
      const criteriaText = this.formatCriteriaForExtraction(eligibility);

      // Step 3: Use MCP sampling to extract concepts via LLM
      if (!samplingCallback) {
        return this.formatErrorResponse('Sampling capability is required for concept extraction');
      }

      const extractedConcepts = await this.extractConceptsWithLLM(
        criteriaText,
        trial.conditions,
        samplingCallback
      );

      if (!extractedConcepts || !extractedConcepts.concepts) {
        return this.formatErrorResponse('Failed to extract concepts from criteria');
      }

      // Step 4: Map extracted concepts to UMLS
      const mappedConcepts = await this.mapConceptsToUMLS(extractedConcepts.concepts);

      // Step 5: Compile results
      const result = this.formatSuccessResponse({
        nct_id: normalizedNctId,
        trial_title: trial.title,
        study_conditions: trial.conditions,
        extraction_summary: {
          total_concepts: mappedConcepts.length,
          by_category: this.categorizeConceptCounts(mappedConcepts),
          mapped_to_umls: mappedConcepts.filter(c => c.umls_mapping.found).length
        },
        extracted_concepts: mappedConcepts,
        eligibility_criteria: {
          inclusion: eligibility.inclusion_criteria,
          exclusion: eligibility.exclusion_criteria
        }
      });

      // Cache for 24 hours
      this.cache.set(cacheKey, result, 86400);

      return result;

    } catch (error) {
      console.error(`Error extracting concepts from trial ${normalizedNctId}: ${error.message}`);
      return this.formatErrorResponse(`Error extracting concepts: ${error.message}`);
    }
  }

  /**
   * Format eligibility criteria for LLM processing
   */
  formatCriteriaForExtraction(eligibility) {
    let formatted = 'CLINICAL TRIAL ELIGIBILITY CRITERIA\n\n';
    
    formatted += 'Basic Demographics:\n';
    formatted += `- Gender: ${eligibility.gender}\n`;
    formatted += `- Age Range: ${eligibility.min_age} to ${eligibility.max_age}\n`;
    formatted += `- Healthy Volunteers: ${eligibility.healthy_volunteers}\n\n`;

    if (eligibility.inclusion_criteria && eligibility.inclusion_criteria.length > 0) {
      formatted += 'INCLUSION CRITERIA:\n';
      eligibility.inclusion_criteria.forEach((criterion, idx) => {
        formatted += `${idx + 1}. ${criterion}\n`;
      });
      formatted += '\n';
    }

    if (eligibility.exclusion_criteria && eligibility.exclusion_criteria.length > 0) {
      formatted += 'EXCLUSION CRITERIA:\n';
      eligibility.exclusion_criteria.forEach((criterion, idx) => {
        formatted += `${idx + 1}. ${criterion}\n`;
      });
    }

    return formatted;
  }

  /**
   * Use MCP sampling to extract concepts via LLM
   */
  async extractConceptsWithLLM(criteriaText, studyConditions, samplingCallback) {
    const systemPrompt = `You are a medical terminology expert specializing in clinical trial eligibility criteria analysis. Extract medical concepts from the provided eligibility criteria and categorize them.`;

    const userPrompt = `Analyze the following clinical trial eligibility criteria and extract ALL medical concepts. This study is investigating: ${studyConditions.join(', ')}.

${criteriaText}

Extract and categorize medical concepts into:
1. **Conditions/Diseases**: Medical conditions, diseases, symptoms, disorders
2. **Procedures/Tests**: Lab tests, imaging, diagnostic procedures, surgeries
3. **Medications**: Drugs, therapies, treatments, drug classes
4. **Biomarkers**: Lab values, genetic markers, physiological measurements
5. **Demographics**: Age constraints, gender, pregnancy status, population characteristics
6. **Temporal**: Time periods, durations, timing constraints

For each concept provide:
- concept: The medical term or phrase
- category: One of the categories above
- context: Whether from inclusion or exclusion criteria
- specifics: Any quantitative values, ranges, or qualifiers

Return ONLY a valid JSON object with this structure:
{
  "concepts": [
    {
      "concept": "string",
      "category": "string",
      "context": "inclusion|exclusion",
      "specifics": "string or null"
    }
  ]
}

Be thorough and extract all medical concepts, including implicit ones (e.g., "uncontrolled hypertension" includes both "hypertension" and "uncontrolled" as a qualifier).`;

    try {
      // Call the sampling callback provided by MCP
      const response = await samplingCallback({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        maxTokens: 4000,
        temperature: 0.1, // Low temperature for more deterministic extraction
      });

      // Parse the LLM response
      const content = response.content;
      
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON object directly
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonText = objectMatch[0];
        }
      }

      const parsed = JSON.parse(jsonText);
      
      if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
        throw new Error('Invalid response format: missing concepts array');
      }

      return parsed;

    } catch (error) {
      console.error(`Error in LLM concept extraction: ${error.message}`);
      throw new Error(`Failed to extract concepts with LLM: ${error.message}`);
    }
  }

  /**
   * Map extracted concepts to UMLS standardized vocabularies
   */
  async mapConceptsToUMLS(concepts) {
    const mappedConcepts = [];

    for (const concept of concepts) {
      try {
        // Search UMLS for this concept
        const searchResult = await this.medicalTerminologyTool.searchConcepts(
          concept.concept,
          'exact', // Use exact search for better precision
          5 // Get top 5 matches
        );

        let umlsMapping = {
          found: false,
          cui: null,
          preferred_term: null,
          semantic_types: [],
          definitions: []
        };

        if (searchResult.success && searchResult.data.concepts && searchResult.data.concepts.length > 0) {
          // Take the best match (first result)
          const bestMatch = searchResult.data.concepts[0];
          
          umlsMapping = {
            found: true,
            cui: bestMatch.cui,
            preferred_term: bestMatch.name,
            semantic_types: bestMatch.semanticTypes || [],
            score: bestMatch.score || null
          };

          // Try to get definitions for this CUI
          try {
            const definitionsResult = await this.medicalTerminologyTool.getConceptDefinitions(
              bestMatch.cui,
              null, // No specific source filter
              5 // Limit to 5 definitions
            );

            if (definitionsResult.success && definitionsResult.data.definitions) {
              umlsMapping.definitions = definitionsResult.data.definitions.map(def => ({
                source: def.rootSource,
                text: def.value
              }));
            }
          } catch (defError) {
            console.error(`Could not fetch definitions for ${bestMatch.cui}: ${defError.message}`);
          }
        }

        mappedConcepts.push({
          original_concept: concept.concept,
          category: concept.category,
          context: concept.context,
          specifics: concept.specifics,
          umls_mapping: umlsMapping
        });

      } catch (error) {
        console.error(`Error mapping concept "${concept.concept}" to UMLS: ${error.message}`);
        
        // Add concept without UMLS mapping
        mappedConcepts.push({
          original_concept: concept.concept,
          category: concept.category,
          context: concept.context,
          specifics: concept.specifics,
          umls_mapping: {
            found: false,
            error: error.message
          }
        });
      }
    }

    return mappedConcepts;
  }

  /**
   * Count concepts by category
   */
  categorizeConceptCounts(mappedConcepts) {
    const counts = {};
    
    for (const concept of mappedConcepts) {
      const category = concept.category || 'unknown';
      counts[category] = (counts[category] || 0) + 1;
    }

    return counts;
  }
}

export default ClinicalTrialsConceptExtractorTool;
