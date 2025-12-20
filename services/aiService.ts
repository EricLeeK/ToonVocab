// AI Service with Multi-Provider Support
// Supports: Gemini, DeepSeek, SiliconFlow

import { AIProvider, AISettings, WordFactoryItem } from '../types';

// Provider configurations
const PROVIDER_CONFIG = {
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-2.0-flash',
        // Gemini uses a different endpoint structure
    },
    deepseek: {
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
    },
    siliconflow: {
        baseUrl: 'https://api.siliconflow.cn/v1',
        model: 'Pro/deepseek-ai/DeepSeek-V3',
    },
};

// Default settings
export const DEFAULT_AI_SETTINGS: AISettings = {
    selectedProvider: 'deepseek',
    geminiApiKey: '',
    deepseekApiKey: '',
    siliconflowApiKey: '',
};

// LocalStorage key
const SETTINGS_KEY = 'word_factory_ai_settings';

// Load settings from localStorage
export const loadAISettings = (): AISettings => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load AI settings:', e);
    }
    return DEFAULT_AI_SETTINGS;
};

// Save settings to localStorage
export const saveAISettings = (settings: AISettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save AI settings:', e);
    }
};

// Get the API key for the selected provider
export const getApiKey = (settings: AISettings): string => {
    switch (settings.selectedProvider) {
        case 'gemini':
            return settings.geminiApiKey;
        case 'deepseek':
            return settings.deepseekApiKey;
        case 'siliconflow':
            return settings.siliconflowApiKey;
        default:
            return '';
    }
};

// Build the prompt for word processing
const buildWordProcessingPrompt = (words: string[], groupIndex: number, fillerCount: number): string => {
    return `You are a vocabulary processing assistant.

I will give you a list of words. Your task:
1. Analyze the provided words.
2. If the list has fewer than 10 words, you MUST generate ${fillerCount} additional RANDOM "IELTS" vocabulary words to reach exactly 10 words total.
3. For EACH word (both provided and generated), provide:
   - term: the English word
   - meaningCn: Chinese meaning
   - meaningEn: English definition  
   - meaningJp: Japanese meaning (kanji if applicable)
   - meaningJpReading: Japanese reading in Hiragana

The current group number is ${groupIndex + 1}. Set the title to "Group ${groupIndex + 1}".

IMPORTANT: Return ONLY valid JSON in this exact format, nothing else:
{
  "title": "Group ${groupIndex + 1}",
  "words": [
    {
      "term": "example",
      "meaningCn": "例子",
      "meaningEn": "a representative instance",
      "meaningJp": "例",
      "meaningJpReading": "れい"
    }
  ]
}

Input Words: ${JSON.stringify(words)}`;
};

// Process words using OpenAI-compatible API (DeepSeek, SiliconFlow)
const processWithOpenAICompatible = async (
    words: string[],
    groupIndex: number,
    fillerCount: number,
    apiKey: string,
    baseUrl: string,
    model: string
): Promise<{ title: string; words: WordFactoryItem[] }> => {
    const prompt = buildWordProcessingPrompt(words, groupIndex, fillerCount);

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a vocabulary assistant. Always respond with valid JSON only, no markdown or extra text.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No content in API response');
    }

    // Parse the JSON response
    try {
        return JSON.parse(content);
    } catch (e) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse API response as JSON');
    }
};

// Process words using Gemini API
const processWithGemini = async (
    words: string[],
    groupIndex: number,
    fillerCount: number,
    apiKey: string
): Promise<{ title: string; words: WordFactoryItem[] }> => {
    const prompt = buildWordProcessingPrompt(words, groupIndex, fillerCount);
    const config = PROVIDER_CONFIG.gemini;

    const response = await fetch(
        `${config.baseUrl}/${config.model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error('No content in Gemini response');
    }

    return JSON.parse(content);
};

// Main function to process a group of words
export const processGroupWords = async (
    rawWords: string[],
    groupIndex: number,
    settings: AISettings
): Promise<{ title: string; words: WordFactoryItem[] }> => {
    const apiKey = getApiKey(settings);

    if (!apiKey) {
        throw new Error(`Please configure your ${settings.selectedProvider} API key in settings`);
    }

    // Calculate filler needed (target is 10 words per group)
    const fillerCount = Math.max(0, 10 - rawWords.length);

    switch (settings.selectedProvider) {
        case 'gemini':
            return processWithGemini(rawWords, groupIndex, fillerCount, apiKey);

        case 'deepseek': {
            const config = PROVIDER_CONFIG.deepseek;
            return processWithOpenAICompatible(
                rawWords,
                groupIndex,
                fillerCount,
                apiKey,
                config.baseUrl,
                config.model
            );
        }

        case 'siliconflow': {
            const config = PROVIDER_CONFIG.siliconflow;
            return processWithOpenAICompatible(
                rawWords,
                groupIndex,
                fillerCount,
                apiKey,
                config.baseUrl,
                config.model
            );
        }

        default:
            throw new Error(`Unknown provider: ${settings.selectedProvider}`);
    }
};

// Placeholder for image generation - to be implemented later
export const generateVocabImage = async (
    _words: WordFactoryItem[],
    _provider: string,
    _style?: string
): Promise<string> => {
    // TODO: Implement image generation when model is decided
    console.log('Image generation not yet implemented');
    throw new Error('Image generation is not yet available. Please check back later.');
};

// Provider display names for UI
export const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
    siliconflow: '硅基流动 (SiliconFlow)',
};
