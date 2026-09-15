/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * CENTRALIZED GEMINI MODEL CONFIGURATION
 * ============================================================================
 * Verified Gemini 3.8 model identifier supported by @google/genai SDK.
 * 
 * - Standard / Multimodal Vision Supervisor: 'gemini-3.8-flash'
 * - Complex Reasoning / Deep Vision Preview: 'gemini-3.1-pro-preview'
 * 
 * Obsolete / Deprecated models (DO NOT USE):
 * - gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-flash
 */
export const GEMINI_MODEL = 'gemini-3.8-flash';
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
  displayName: 'Gemini 3.8 Flash',
  provider: 'Google GenAI SDK (@google/genai)',
  visionEnabled: true,
  structuredOutputsEnabled: true,
};
