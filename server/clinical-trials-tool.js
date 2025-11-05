import { BaseTool } from './base-tool.js';

/**
 * Tool for searching clinical trials from ClinicalTrials.gov
 */
export class ClinicalTrialsTool extends BaseTool {
  constructor(cacheService) {
    super(cacheService);
    this.baseUrl = 'https://clinicaltrials.gov/api/v2/studies';
  }

  /**
   * Get detailed information for a specific clinical trial by NCT ID
   */
  async getTrialByNctId(nctId) {
    // Input validation
    if (!nctId) {
      return this.formatErrorResponse('NCT ID is required');
    }

    // Validate NCT ID format (should be NCT followed by 8 digits)
    const nctPattern = /^NCT\d{8}$/i;
    if (!nctPattern.test(nctId)) {
      return this.formatErrorResponse('Invalid NCT ID format. Expected format: NCT########');
    }

    // Normalize NCT ID to uppercase
    const normalizedNctId = nctId.toUpperCase();

    // Create cache key
    const cacheKey = this.getCacheKey('clinical_trial_detail', normalizedNctId);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for Clinical Trial detail: ${normalizedNctId}`);
      return cachedResult;
    }

    try {
      console.error(`Fetching Clinical Trial details for: ${normalizedNctId}`);

      // Build URL for specific study
      const url = `${this.baseUrl}/${normalizedNctId}`;

      // Make the request
      const data = await this.makeRequest(url);

      // Process the response
      if (!data || !data.protocolSection) {
        return this.formatErrorResponse(`Clinical trial ${normalizedNctId} not found`);
      }

      const protocolSection = data.protocolSection || {};
      const identification = protocolSection.identificationModule || {};
      const status = protocolSection.statusModule || {};
      const design = protocolSection.designModule || {};
      const eligibility = protocolSection.eligibilityModule || {};
      const contacts = protocolSection.contactsLocationsModule || {};
      const description = protocolSection.descriptionModule || {};
      const outcomes = protocolSection.outcomesModule || {};
      const arms = protocolSection.armsInterventionsModule || {};

      // Parse eligibility criteria into inclusion and exclusion
      let inclusionCriteria = [];
      let exclusionCriteria = [];

      if (eligibility.eligibilityCriteria) {
        const criteriaText = eligibility.eligibilityCriteria;

        // Split by "Inclusion Criteria:" and "Exclusion Criteria:" headers
        const inclusionMatch = criteriaText.match(/Inclusion Criteria:\s*([\s\S]*?)(?=Exclusion Criteria:|$)/i);
        const exclusionMatch = criteriaText.match(/Exclusion Criteria:\s*([\s\S]*?)$/i);

        // Parse inclusion criteria
        if (inclusionMatch && inclusionMatch[1]) {
          const inclusionText = inclusionMatch[1].trim();
          inclusionCriteria = inclusionText
            .split(/\n/)
            .map(line => line.replace(/^[\s*\-•]+/, '').trim())
            .filter(line => line.length > 0 && !line.match(/^inclusion criteria:?$/i));
        }

        // Parse exclusion criteria
        if (exclusionMatch && exclusionMatch[1]) {
          const exclusionText = exclusionMatch[1].trim();
          exclusionCriteria = exclusionText
            .split(/\n/)
            .map(line => line.replace(/^[\s*\-•]+/, '').trim())
            .filter(line => line.length > 0 && !line.match(/^exclusion criteria:?$/i));
        }
      }

      // Extract all locations
      const locations = [];
      if (contacts.locations) {
        for (const location of contacts.locations) {
          const facility = location.facility || {};
          const geoPoint = location.geoPoint || {};
          locations.push({
            facility: facility.name || '',
            city: facility.city || '',
            state: facility.state || '',
            country: facility.country || '',
            zip: facility.zip || '',
            latitude: geoPoint.lat || null,
            longitude: geoPoint.lon || null,
            status: location.status || ''
          });
        }
      }

      // Extract primary and secondary outcomes
      const primaryOutcomes = (outcomes.primaryOutcomes || []).map(outcome => ({
        measure: outcome.measure || '',
        description: outcome.description || '',
        time_frame: outcome.timeFrame || ''
      }));

      const secondaryOutcomes = (outcomes.secondaryOutcomes || []).map(outcome => ({
        measure: outcome.measure || '',
        description: outcome.description || '',
        time_frame: outcome.timeFrame || ''
      }));

      // Extract interventions
      const interventions = (arms.interventions || []).map(intervention => ({
        type: intervention.type || '',
        name: intervention.name || '',
        description: intervention.description || ''
      }));

      const trial = {
        nct_id: identification.nctId || '',
        title: identification.briefTitle || '',
        official_title: identification.officialTitle || '',
        status: status.overallStatus || '',
        phase: design.phases || [],
        study_type: design.studyType || '',
        enrollment: design.enrollmentInfo?.count || 0,
        conditions: protocolSection.conditionsModule?.conditions || [],
        keywords: protocolSection.conditionsModule?.keywords || [],
        sponsor: protocolSection.sponsorCollaboratorsModule?.leadSponsor?.name || '',
        collaborators: (protocolSection.sponsorCollaboratorsModule?.collaborators || []).map(c => c.name),
        brief_summary: description.briefSummary || '',
        detailed_description: description.detailedDescription || '',
        primary_outcomes: primaryOutcomes,
        secondary_outcomes: secondaryOutcomes,
        interventions: interventions,
        locations: locations,
        start_date: status.startDateStruct?.date || '',
        completion_date: status.completionDateStruct?.date || '',
        last_update: status.lastUpdatePostDateStruct?.date || '',
        url: identification.nctId ? `https://clinicaltrials.gov/study/${identification.nctId}` : '',
        eligibility: {
          gender: eligibility.sex || '',
          min_age: eligibility.minimumAge || '',
          max_age: eligibility.maximumAge || '',
          healthy_volunteers: eligibility.healthyVolunteers ? 'Yes' : 'No',
          inclusion_criteria: inclusionCriteria,
          exclusion_criteria: exclusionCriteria
        }
      };

      // Create result object
      const result = this.formatSuccessResponse({
        nct_id: normalizedNctId,
        trial: trial
      });

      // Cache for 24 hours (86400 seconds)
      this.cache.set(cacheKey, result, 86400);

      return result;

    } catch (error) {
      console.error(`Error fetching Clinical Trial ${normalizedNctId}: ${error.message}`);
      return this.formatErrorResponse(`Error fetching clinical trial: ${error.message}`);
    }
  }

  /**
   * Search for clinical trials by condition, status, and other parameters
   */
  async searchTrials(condition, status = 'recruiting', maxResults = 10) {
    // Input validation
    if (!condition) {
      return this.formatErrorResponse('Condition is required');
    }
    
    // Validate max_results
    let validMaxResults;
    try {
      validMaxResults = parseInt(maxResults);
      if (validMaxResults < 1) {
        validMaxResults = 10;
      } else if (validMaxResults > 100) {
        validMaxResults = 100; // Limit to reasonable number
      }
    } catch (error) {
      validMaxResults = 10;
    }
    
    // Validate status
    const validStatuses = ['recruiting', 'completed', 'active', 'not_recruiting', 'all'];
    if (!validStatuses.includes(status.toLowerCase())) {
      status = 'recruiting';
    }
    
    // Create cache key
    const cacheKey = this.getCacheKey('clinical_trials', condition, status, validMaxResults);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.error(`Cache hit for Clinical Trials search: ${condition}`);
      return cachedResult;
    }
    
    try {
      console.error(`Searching Clinical Trials for: ${condition}, status: ${status}, max_results: ${validMaxResults}`);
      
      // Build query parameters
      const params = {
        'query.cond': condition,
        'pageSize': validMaxResults,
        'format': 'json'
      };
      
      // Add status filter if not 'all'
      if (status !== 'all') {
        // Map our status names to ClinicalTrials.gov API values
        const statusMap = {
          'recruiting': 'RECRUITING',
          'completed': 'COMPLETED',
          'active': 'ACTIVE_NOT_RECRUITING',
          'not_recruiting': 'ACTIVE_NOT_RECRUITING'
        };
        params['filter.overallStatus'] = statusMap[status] || 'RECRUITING';
      }
      
      const url = this.buildUrl(this.baseUrl, params);
      
      // Make the request
      const data = await this.makeRequest(url);
      
      // Process the response
      let trials = [];
      let totalResults = 0;
      
      if (data && data.studies) {
        totalResults = data.totalCount || data.studies.length;
        
        // Process each trial
        for (const study of data.studies) {
          const protocolSection = study.protocolSection || {};
          const identification = protocolSection.identificationModule || {};
          const status = protocolSection.statusModule || {};
          const design = protocolSection.designModule || {};
          const eligibility = protocolSection.eligibilityModule || {};
          const contacts = protocolSection.contactsLocationsModule || {};
          
          // Parse eligibility criteria into inclusion and exclusion
          let inclusionCriteria = [];
          let exclusionCriteria = [];
          
          if (eligibility.eligibilityCriteria) {
            const criteriaText = eligibility.eligibilityCriteria;
            
            // Split by "Inclusion Criteria:" and "Exclusion Criteria:" headers
            const inclusionMatch = criteriaText.match(/Inclusion Criteria:\s*([\s\S]*?)(?=Exclusion Criteria:|$)/i);
            const exclusionMatch = criteriaText.match(/Exclusion Criteria:\s*([\s\S]*?)$/i);
            
            // Parse inclusion criteria
            if (inclusionMatch && inclusionMatch[1]) {
              const inclusionText = inclusionMatch[1].trim();
              // Split by bullet points or newlines, filter out empty lines
              inclusionCriteria = inclusionText
                .split(/\n/)
                .map(line => line.replace(/^[\s*\-•]+/, '').trim())
                .filter(line => line.length > 0 && !line.match(/^inclusion criteria:?$/i));
            }
            
            // Parse exclusion criteria
            if (exclusionMatch && exclusionMatch[1]) {
              const exclusionText = exclusionMatch[1].trim();
              // Split by bullet points or newlines, filter out empty lines
              exclusionCriteria = exclusionText
                .split(/\n/)
                .map(line => line.replace(/^[\s*\-•]+/, '').trim())
                .filter(line => line.length > 0 && !line.match(/^exclusion criteria:?$/i));
            }
          }
          
          const processedTrial = {
            nct_id: identification.nctId || '',
            title: identification.briefTitle || '',
            status: status.overallStatus || '',
            phase: design.phases || [],
            study_type: design.studyType || '',
            conditions: protocolSection.conditionsModule?.conditions || [],
            locations: [],
            sponsor: protocolSection.sponsorCollaboratorsModule?.leadSponsor?.name || '',
            url: identification.nctId ? `https://clinicaltrials.gov/study/${identification.nctId}` : '',
            eligibility: {
              gender: eligibility.sex || '',
              min_age: eligibility.minimumAge || '',
              max_age: eligibility.maximumAge || '',
              healthy_volunteers: eligibility.healthyVolunteers ? 'Yes' : 'No',
              inclusion_criteria: inclusionCriteria,
              exclusion_criteria: exclusionCriteria
            }
          };
          
          // Extract locations
          if (contacts.locations) {
            for (const location of contacts.locations.slice(0, 3)) { // Limit to 3 locations
              const facility = location.facility || {};
              const locationData = {
                facility: facility.name || '',
                city: facility.city || '',
                state: facility.state || '',
                country: facility.country || ''
              };
              processedTrial.locations.push(locationData);
            }
          }
          
          trials.push(processedTrial);
        }
      }
      
      // Create result object
      const result = this.formatSuccessResponse({
        condition: condition,
        search_status: status,
        total_results: totalResults,
        trials: trials
      });
      
      // Cache for 24 hours (86400 seconds)
      this.cache.set(cacheKey, result, 86400);
      
      return result;
      
    } catch (error) {
      console.error(`Error searching Clinical Trials: ${error.message}`);
      return this.formatErrorResponse(`Error searching clinical trials: ${error.message}`);
    }
  }
}

export default ClinicalTrialsTool;
