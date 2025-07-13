import OpenAI from 'openai';

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  async generateNFTImage(prompt: string): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: `Create a unique digital art piece: ${prompt}. Style should be suitable for an NFT collection.`,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      return response.data[0].url || '';
    } catch (error) {
      console.error('Error generating NFT image:', error);
      throw error;
    }
  }

  async generateNFTMetadata(imageDescription: string): Promise<{
    name: string;
    description: string;
    attributes: Array<{ trait_type: string; value: string }>;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an NFT metadata expert. Generate compelling NFT metadata based on image descriptions.'
          },
          {
            role: 'user',
            content: `Generate NFT metadata for: ${imageDescription}. Return JSON with name, description, and attributes array.`
          }
        ]
      });

      const content = response.choices[0].message.content || '{}';
      
      // Extract JSON from markdown code block if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error generating NFT metadata:', error);
      throw error;
    }
  }

  async getInvestmentAdvice(amount: number, riskTolerance: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a DeFi investment advisor specializing in Solana ecosystem. Provide clear, actionable advice.'
          },
          {
            role: 'user',
            content: `I want to invest ${amount} SOL with ${riskTolerance} risk tolerance. What are the best Solana DeFi opportunities?`
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error getting investment advice:', error);
      throw error;
    }
  }

  async getChatResponse(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0].message.content || 'I apologize, but I cannot process your request right now.';
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();