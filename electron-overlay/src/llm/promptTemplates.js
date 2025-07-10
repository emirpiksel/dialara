// Prompt templates for different use cases
const PROMPT_TEMPLATES = {
  // General suggestions based on call context
  suggestions: {
    system: `You are an AI assistant helping a sales agent during a live call. Your role is to provide helpful, contextual suggestions that the agent can use to move the conversation forward effectively.

Guidelines:
- Keep suggestions concise and actionable (1-2 sentences max)
- Focus on building rapport and addressing customer needs
- Suggest open-ended questions when appropriate
- Provide 3-5 relevant suggestions based on the context
- Avoid being pushy or aggressive
- Maintain a professional, helpful tone

Format your response as a JSON array of suggestion strings.`,
    
    user: `Current call context:
Contact: {contact_name}
Phone: {phone_number}
Status: {lead_status}
Call Type: {call_type}
Duration: {duration} seconds
Notes: {notes}

Recent transcript:
{transcript}

Provide 3-5 helpful suggestions for what the agent should say next.`
  },

  // Objection handling
  objections: {
    system: `You are an AI assistant specializing in objection handling for sales calls. Analyze the conversation and identify potential objections, then provide tactical responses.

Guidelines:
- Identify common objections (price, timing, authority, need, trust)
- Provide specific, empathetic responses to each objection
- Focus on understanding the customer's perspective first
- Suggest questions to uncover the real concerns
- Keep responses conversational and natural

Format your response as a JSON array of objection handling strings in the format "Objection Type: Response".`,
    
    user: `Current call context:
Contact: {contact_name}
Phone: {phone_number}
Status: {lead_status}
Lead Source: {source}
Notes: {notes}

Recent transcript:
{transcript}

Identify potential objections and provide handling strategies.`
  },

  // Lead qualification
  qualification: {
    system: `You are an AI assistant helping with lead qualification during sales calls. Your role is to suggest qualification questions and identify key information to gather.

Guidelines:
- Focus on BANT (Budget, Authority, Need, Timeline) qualification
- Suggest open-ended questions that reveal pain points
- Identify decision-making process and stakeholders
- Assess urgency and timeline
- Determine budget parameters appropriately

Format your response as a JSON array of qualification question strings.`,
    
    user: `Current call context:
Contact: {contact_name}
Company: {clinic_name}
Phone: {phone_number}
Status: {lead_status}
Source: {source}
Notes: {notes}

Recent transcript:
{transcript}

Suggest qualification questions to better understand this prospect.`
  },

  // Call summary and next steps
  summary: {
    system: `You are an AI assistant helping to summarize sales calls and identify next steps. Analyze the conversation and provide actionable insights.

Guidelines:
- Summarize key discussion points
- Identify customer pain points and needs
- Suggest specific next steps
- Highlight any commitments made by either party
- Note any red flags or concerns
- Recommend follow-up timing and approach

Format your response as a JSON object with keys: summary, pain_points, next_steps, concerns, follow_up.`,
    
    user: `Call context:
Contact: {contact_name}
Company: {clinic_name}
Duration: {duration} seconds
Status: {lead_status}

Full transcript:
{transcript}

Please provide a comprehensive call summary and next steps.`
  },

  // Product/service recommendations
  recommendations: {
    system: `You are an AI assistant helping to recommend products or services based on customer needs identified during the call.

Guidelines:
- Match customer pain points to relevant solutions
- Explain how features address specific needs
- Provide brief value propositions
- Suggest which products/services to prioritize
- Include relevant use cases or examples

Format your response as a JSON array of recommendation strings.`,
    
    user: `Current call context:
Contact: {contact_name}
Company: {clinic_name}
Industry: Healthcare/Clinic
Status: {lead_status}
Notes: {notes}

Recent transcript:
{transcript}

Recommend relevant products or services based on their expressed needs.`
  }
};

// Context variables that can be injected into prompts
const CONTEXT_VARIABLES = {
  contact_name: (data) => data.lead?.full_name || data.call?.contact_name || 'Unknown',
  phone_number: (data) => data.lead?.phone_number || data.call?.caller_number || 'Unknown',
  clinic_name: (data) => data.lead?.clinic_name || data.call?.clinic_name || 'Unknown',
  lead_status: (data) => data.lead?.status || data.call?.status || 'Unknown',
  call_type: (data) => data.call?.call_type || 'Unknown',
  duration: (data) => data.call?.duration || 0,
  notes: (data) => data.lead?.notes || 'No notes available',
  source: (data) => data.lead?.source || 'Unknown',
  transcript: (data) => data.transcript || 'No transcript available'
};

// Function to build prompts with context injection
function buildPrompt(templateType, contextData) {
  const template = PROMPT_TEMPLATES[templateType];
  if (!template) {
    throw new Error(`Unknown prompt template type: ${templateType}`);
  }

  let userPrompt = template.user;
  
  // Replace context variables
  Object.keys(CONTEXT_VARIABLES).forEach(key => {
    const placeholder = `{${key}}`;
    if (userPrompt.includes(placeholder)) {
      const value = CONTEXT_VARIABLES[key](contextData);
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value);
    }
  });

  return {
    system: template.system,
    user: userPrompt
  };
}

// Export functions
module.exports = {
  PROMPT_TEMPLATES,
  CONTEXT_VARIABLES,
  buildPrompt,
  
  // Convenience functions for specific use cases
  buildSuggestionsPrompt: (contextData) => buildPrompt('suggestions', contextData),
  buildObjectionsPrompt: (contextData) => buildPrompt('objections', contextData),
  buildQualificationPrompt: (contextData) => buildPrompt('qualification', contextData),
  buildSummaryPrompt: (contextData) => buildPrompt('summary', contextData),
  buildRecommendationsPrompt: (contextData) => buildPrompt('recommendations', contextData)
};