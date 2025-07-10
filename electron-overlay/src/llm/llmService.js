const { Configuration, OpenAIApi } = require('openai');
const { buildPrompt } = require('./promptTemplates');
require('dotenv').config();

class LLMService {
  constructor() {
    this.openai = null;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 500;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
    this.apiKey = process.env.OPENAI_API_KEY;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. LLM features will be limited.');
      return;
    }

    this.initializeOpenAI();
  }

  initializeOpenAI() {
    try {
      const configuration = new Configuration({
        apiKey: this.apiKey,
      });
      this.openai = new OpenAIApi(configuration);
      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.openai = null;
    }
  }

  async generateSuggestions(contextData) {
    if (!this.openai) {
      return this.getFallbackSuggestions(contextData);
    }

    try {
      const prompt = buildPrompt('suggestions', contextData);
      
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.data.choices[0].message.content;
      const suggestions = JSON.parse(content);
      
      return {
        suggestions: Array.isArray(suggestions) ? suggestions : suggestions.suggestions || [],
        confidence: this.calculateConfidence(response.data.usage),
        source: 'openai'
      };

    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions(contextData);
    }
  }

  async generateObjectionHandling(contextData) {
    if (!this.openai) {
      return this.getFallbackObjections(contextData);
    }

    try {
      const prompt = buildPrompt('objections', contextData);
      
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.data.choices[0].message.content;
      const objections = JSON.parse(content);
      
      return {
        objections: Array.isArray(objections) ? objections : objections.objections || [],
        confidence: this.calculateConfidence(response.data.usage),
        source: 'openai'
      };

    } catch (error) {
      console.error('Error generating objection handling:', error);
      return this.getFallbackObjections(contextData);
    }
  }

  async generateQualificationQuestions(contextData) {
    if (!this.openai) {
      return this.getFallbackQualification(contextData);
    }

    try {
      const prompt = buildPrompt('qualification', contextData);
      
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.data.choices[0].message.content;
      const questions = JSON.parse(content);
      
      return {
        questions: Array.isArray(questions) ? questions : questions.questions || [],
        confidence: this.calculateConfidence(response.data.usage),
        source: 'openai'
      };

    } catch (error) {
      console.error('Error generating qualification questions:', error);
      return this.getFallbackQualification(contextData);
    }
  }

  async generateCallSummary(contextData) {
    if (!this.openai) {
      return this.getFallbackSummary(contextData);
    }

    try {
      const prompt = buildPrompt('summary', contextData);
      
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: this.maxTokens * 2, // Allow more tokens for summaries
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.data.choices[0].message.content;
      const summary = JSON.parse(content);
      
      return {
        ...summary,
        confidence: this.calculateConfidence(response.data.usage),
        source: 'openai'
      };

    } catch (error) {
      console.error('Error generating call summary:', error);
      return this.getFallbackSummary(contextData);
    }
  }

  calculateConfidence(usage) {
    // Simple confidence calculation based on token usage
    if (!usage) return 'medium';
    
    const ratio = usage.completion_tokens / usage.prompt_tokens;
    if (ratio > 0.5) return 'high';
    if (ratio > 0.2) return 'medium';
    return 'low';
  }

  // Fallback methods when OpenAI is not available
  getFallbackSuggestions(contextData) {
    const suggestions = [
      "Thank you for your time today. I'd love to learn more about your current challenges.",
      "That's interesting. Can you tell me more about how you're currently handling that?",
      "I understand your concern. Let me share how we've helped similar businesses.",
      "What would be the ideal outcome for you in this situation?",
      "Based on what you've shared, I think we can definitely help. Would you like to see how?"
    ];

    // Customize based on context
    const contact = contextData.lead?.full_name || contextData.call?.contact_name;
    if (contact && contact !== 'Unknown') {
      suggestions[0] = `Thank you for your time today, ${contact}. I'd love to learn more about your current challenges.`;
    }

    return {
      suggestions: suggestions.slice(0, 3),
      confidence: 'medium',
      source: 'fallback'
    };
  }

  getFallbackObjections(contextData) {
    return {
      objections: [
        "Price: Focus on ROI and long-term value rather than upfront cost",
        "Timing: Emphasize the cost of waiting and competitive advantages",
        "Authority: Identify who else is involved in the decision-making process",
        "Need: Dig deeper into their pain points and current situation",
        "Trust: Provide references and case studies from similar businesses"
      ],
      confidence: 'medium',
      source: 'fallback'
    };
  }

  getFallbackQualification(contextData) {
    return {
      questions: [
        "What's your biggest challenge in this area right now?",
        "How are you currently handling this process?",
        "What would need to happen for this to be a priority?",
        "Who else would be involved in making this decision?",
        "What's your timeline for implementing a solution?"
      ],
      confidence: 'medium',
      source: 'fallback'
    };
  }

  getFallbackSummary(contextData) {
    return {
      summary: "Call completed. Please review transcript for detailed notes.",
      pain_points: ["No specific pain points identified"],
      next_steps: ["Follow up within 24-48 hours", "Send relevant information"],
      concerns: ["No major concerns identified"],
      follow_up: "Schedule follow-up call within one week",
      confidence: 'low',
      source: 'fallback'
    };
  }

  // Health check method
  async healthCheck() {
    if (!this.openai) {
      return { status: 'unavailable', message: 'OpenAI not configured' };
    }

    try {
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      return { 
        status: 'healthy', 
        message: 'OpenAI API responding',
        model: this.model
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }
}

module.exports = LLMService;