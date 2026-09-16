/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * CENTRALIZED GEMINI MODEL CONFIGURATION
 * ============================================================================
 * Production Gemini model identifiers supported across all Google AI Studio API key tiers.
 * 
 * - Standard / Multimodal Vision Supervisor: 'gemini-3.7-flash'
 * - Complex Reasoning / Deep Vision Preview: 'gemini-3.1-pro-preview'
 */
export const GEMINI_MODEL = 'gemini-3.7-flash';
export const GEMINI_PRO_MODEL = 'gemini-3.1-pro-preview';

export interface ModelConfig {
  modelId: string;
  displayName: string;
  provider: string;
  visionEnabled: boolean;
  structuredOutputsEnabled: boolean;
}

export const CURRENT_MODEL_CONFIG: ModelConfig = {
  modelId: GEMINI_MODEL,
  displayName: 'Gemini 3.7 Flash',
  provider: 'Google GenAI SDK (@google/genai)',
  visionEnabled: true,
  structuredOutputsEnabled: true,
};
