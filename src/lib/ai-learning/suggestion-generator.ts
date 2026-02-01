/**
 * Suggestion Generator - Uses Gemini to generate personalized bookkeeping
 * suggestions based on user habits and correction patterns
 */

import type { HabitAnalysis } from './habit-analyzer'
import { getGeminiApiKey } from '../ocr/gemini-vision'
import { logger } from '../logger'

export interface PersonalizedSuggestion {
  category: 'consistency' | 'efficiency' | 'audit_risk' | 'best_practice' | 'learning'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: string[]
  rationale: string
}

export interface SuggestionResponse {
  suggestions: PersonalizedSuggestion[]
  overallAssessment: string
  consistencyGrade: 'A' | 'B' | 'C' | 'D' | 'F'
}

/**
 * Generate personalized suggestions using Gemini based on habit analysis
 */
export async function generatePersonalizedSuggestions(
  analysis: HabitAnalysis
): Promise<SuggestionResponse | null> {
  const apiKey = getGeminiApiKey()
  
  if (!apiKey) {
    console.warn('[SUGGESTIONS] No Gemini API key, cannot generate suggestions')
    return null
  }

  if (analysis.totalCorrections < 3) {
    // Not enough data to generate meaningful suggestions
    return {
      suggestions: [{
        category: 'learning',
        priority: 'low',
        title: 'Keep Building Your Correction History',
        description: 'You\'re just getting started! The AI needs more corrections to learn your patterns and provide personalized suggestions.',
        actionItems: [
          'Continue reviewing and correcting transactions as you work',
          'The AI will start identifying patterns after 5+ corrections',
          'Your first insights will appear as you build your correction history'
        ],
        rationale: 'AI learning requires sufficient data to identify meaningful patterns and inconsistencies.'
      }],
      overallAssessment: 'You\'re building your correction history. Keep going!',
      consistencyGrade: 'A'
    }
  }

  try {
    const prompt = buildSuggestionPrompt(analysis)
    
    logger.debug('[SUGGESTIONS] Generating personalized suggestions via Gemini')
    logger.debug('[SUGGESTIONS] Analysis summary:', {
      totalCorrections: analysis.totalCorrections,
      consistencyScore: analysis.consistencyScore,
      paymentInconsistencies: analysis.paymentInconsistencies.length,
      categoryInconsistencies: analysis.categoryInconsistencies.length,
      frequentCorrections: analysis.frequentCorrections.length
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      console.error('[SUGGESTIONS] Gemini API error:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      console.warn('[SUGGESTIONS] No text in Gemini response')
      return null
    }

    const result = JSON.parse(text) as SuggestionResponse
    logger.debug('[SUGGESTIONS] Generated', result.suggestions.length, 'personalized suggestions')
    
    return result

  } catch (error) {
    console.error('[SUGGESTIONS] Error generating suggestions:', error)
    return null
  }
}

/**
 * Build the Gemini prompt for suggestion generation
 */
function buildSuggestionPrompt(analysis: HabitAnalysis): string {
  let prompt = `You are a professional bookkeeping advisor and CPA consultant. Analyze this user's bookkeeping habits and provide personalized, actionable suggestions to improve their record-keeping practices.

**USER'S BOOKKEEPING PROFILE:**
- Total corrections made: ${analysis.totalCorrections}
- Consistency score: ${analysis.consistencyScore}/100
- Overall insights: ${analysis.insights.join('; ')}

`

  if (analysis.paymentInconsistencies.length > 0) {
    prompt += `**PAYMENT METHOD INCONSISTENCIES (${analysis.paymentInconsistencies.length} detected):**
This is CRITICAL for both AI learning and audit compliance. Using different payment methods for the same vendor/category creates confusion and red flags.

`
    analysis.paymentInconsistencies.slice(0, 5).forEach(inc => {
      prompt += `- ${inc.vendor} (${inc.category}): Uses ${inc.paymentMethods.join(', ')} across ${inc.occurrences} transactions
`
    })
    prompt += `
**Why this matters:**
1. Accountants need consistent patterns to track business expenses properly
2. Mixing payment methods makes reconciliation harder and increases audit risk
3. IRS auditors look for inconsistent payment patterns as potential red flags
4. The AI cannot learn reliable patterns when payment methods vary unpredictably
5. Cash vs Credit/Debit has different tax implications and reporting requirements

`
  }

  if (analysis.categoryInconsistencies.length > 0) {
    prompt += `**CATEGORY INCONSISTENCIES (${analysis.categoryInconsistencies.length} detected):**

`
    analysis.categoryInconsistencies.slice(0, 5).forEach(inc => {
      prompt += `- ${inc.vendor}: Categorized as ${inc.categories.join(', ')} (${inc.occurrences} times)
`
    })
    prompt += `
This suggests the user either:
1. Buys different types of items from the same vendor (tools vs materials)
2. Hasn't established clear categorization rules
3. May benefit from splitting vendor names by purchase type

`
  }

  if (analysis.frequentCorrections.length > 0) {
    prompt += `**FREQUENTLY CORRECTED FIELDS:**

`
    analysis.frequentCorrections.slice(0, 5).forEach(pattern => {
      if (pattern.vendor) {
        prompt += `- ${pattern.field} for ${pattern.vendor}: ${pattern.correctionCount} corrections
`
      } else {
        prompt += `- ${pattern.field}: ${pattern.correctionCount} corrections
`
      }
    })
    prompt += `
Frequent corrections indicate either:
1. The AI hasn't learned the pattern yet (needs more data)
2. The user lacks a consistent rule
3. The OCR is struggling with certain receipt types

`
  }

  // Note quality section (positive framing)
  prompt += `**NOTE QUALITY ANALYSIS:**
- Note usage: ${Math.round(analysis.noteQuality.noteUsageRate)}% of transactions have notes (${analysis.noteQuality.totalTransactionsWithNotes}/${analysis.noteQuality.totalTransactions})
- Diversity score: ${analysis.noteQuality.diversityScore}/100
- Unique notes: ${analysis.noteQuality.uniqueNoteCount}
- Generic notes detected: ${analysis.noteQuality.genericNoteCount}
`

  if (analysis.noteQuality.exampleDiverseNotes.length > 0) {
    prompt += `- Example of good notes: "${analysis.noteQuality.exampleDiverseNotes.slice(0, 3).join('", "')}"
`
  }
  if (analysis.noteQuality.exampleGenericNotes.length > 0) {
    prompt += `- Generic notes that could be improved: "${analysis.noteQuality.exampleGenericNotes.join('", "')}"
`
  }

  prompt += `
**IMPORTANT ABOUT NOTES:**
Notes are NOT corrections - they are POSITIVE AI learning aids! Adding specific context (e.g., "Supplies for Project A", "Materials for Bathroom Renovation") helps the AI:
1. Learn contextual patterns faster and more accurately
2. Understand the PURPOSE behind purchases, not just categories
3. Differentiate between similar purchases for different projects/clients
4. Provide better auto-categorization in the future

Diverse, specific notes = EXCELLENT bookkeeping practice. Generic notes ("supplies", "misc") = missed learning opportunity.

`

  prompt += `
**YOUR TASK:**
Generate 3-6 personalized, actionable suggestions tailored to THIS user's specific habits. Focus on:
1. Payment method consistency (highest priority if inconsistencies detected)
2. Category standardization
3. Audit risk reduction
4. Note quality and specificity (POSITIVE: encourage adding detailed notes)
5. Helping the AI learn faster
6. Best practices this user isn't following

**RESPONSE FORMAT (JSON):**
{
  "suggestions": [
    {
      "category": "consistency" | "efficiency" | "audit_risk" | "best_practice" | "learning",
      "priority": "high" | "medium" | "low",
      "title": "Clear, action-oriented title",
      "description": "2-3 sentence explanation of the issue and why it matters",
      "actionItems": ["Specific action 1", "Specific action 2", "Specific action 3"],
      "rationale": "The professional accounting/tax reason why this matters (reference audit risk, IRS compliance, or bookkeeping standards)"
    }
  ],
  "overallAssessment": "A warm, encouraging 2-3 sentence summary of the user's bookkeeping quality and main area for improvement",
  "consistencyGrade": "A" | "B" | "C" | "D" | "F"
}

**IMPORTANT GUIDELINES:**
- Be specific to THIS user's data (mention actual vendors, categories, patterns you see)
- Prioritize suggestions by impact (consistency and audit risk are highest priority)
- Use professional but friendly language
- Each actionItem should be concrete and immediately actionable
- For payment inconsistencies, suggest the MOST COMMON payment method for that vendor
- Explain WHY consistency matters (audit risk, reconciliation, AI learning)
- The consistencyGrade should reflect: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)
- Don't be overly harsh, but be honest about serious issues
- Keep suggestions practical for a self-employed business owner

Generate the suggestions now:`

  return prompt
}
