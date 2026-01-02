import { GoogleGenerativeAI } from '@google/generative-ai'
import { TECH_TREE, JOB_TYPE_LABELS, type TechTreePath } from './leveling-system'

/**
 * Use Gemini AI to intelligently match a custom job description
 * to either a single predefined path OR a custom collection of relevant nodes
 */
export async function matchJobDescriptionToTechTree(
  jobDescription: string,
  apiKey: string
): Promise<{
  selectedPath?: TechTreePath
  customNodes?: string[]
  isCustomPath: boolean
  confidence: number
  reasoning: string
}> {
  if (!apiKey) {
    throw new Error('Gemini API key is required')
  }

  if (!jobDescription.trim()) {
    throw new Error('Job description cannot be empty')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  // Build comprehensive list of ALL available nodes across all paths
  const allNodes: Array<{
    nodeId: string
    title: string
    description: string
    path: string
    icon: string
    isBase: boolean
  }> = []
  
  Object.entries(TECH_TREE).forEach(([pathKey, nodes]) => {
    nodes.forEach(node => {
      allNodes.push({
        nodeId: node.id,
        title: node.title,
        description: node.description,
        path: pathKey,
        icon: node.icon,
        isBase: !node.parentId
      })
    })
  })
  
  // Also keep the base path info for fallback
  const availablePaths = Object.entries(JOB_TYPE_LABELS).map(([key, label]) => {
    const pathNodes = TECH_TREE[key as TechTreePath]
    const baseNode = pathNodes[0]
    const specializations = pathNodes.filter(n => n.parentId).map(n => n.title).join(', ')
    
    return {
      id: key,
      label,
      description: baseNode.description,
      specializations: specializations || 'General'
    }
  })

  const prompt = `You are an AI assistant helping small business owners find the best category setup for their work within a bookkeeping app.

USER'S JOB DESCRIPTION:
"${jobDescription}"

AVAILABLE SPECIALIZATION NODES:
${allNodes.map((node, idx) => 
  `${idx + 1}. ${node.title} (${node.nodeId}) ${node.icon}
   Path: ${node.path}
   Description: ${node.description}
   ${node.isBase ? '[BASE NODE]' : '[SPECIALIZATION]'}`
).join('\n\n')}

TASK:
Analyze the user's job description and determine the BEST match:

OPTION 1: If ONE base path covers 80%+ of their work, select that single path
OPTION 2: If their work spans multiple areas, create a CUSTOM path by selecting 2-5 relevant nodes

Consider:
- Primary activities and services  
- Target customers/clients
- Revenue streams
- Expense patterns
- Industry specializations

Respond with ONLY a JSON object in ONE of these formats:

**For a single base path:**
{
  "isCustomPath": false,
  "selectedPath": "path_id_here",
  "confidence": 0.9,
  "reasoning": "This single category covers most of their work"
}

**For a custom multi-node path:**
{
  "isCustomPath": true,
  "customNodes": ["node_id_1", "node_id_2", "node_id_3"],
  "confidence": 0.85,
  "reasoning": "Their work combines X and Y, requiring a custom path"
}

RULES:
- selectedPath must be a base path ID (e.g., "gig_driver", "creative_services")
- customNodes must be exact node IDs from the list above
- Include 2-5 nodes for custom paths (prioritize most relevant)
- Always include at least one base node in custom paths
- Confidence between 0.0 and 1.0
- Keep reasoning to 1-2 sentences

JSON Response:`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim()
    }
    
    const parsed = JSON.parse(jsonText)
    
    // Validate the response
    if (!parsed.confidence || !parsed.reasoning || parsed.isCustomPath === undefined) {
      throw new Error('Invalid AI response format')
    }
    
    if (parsed.isCustomPath) {
      // Custom path: validate node IDs
      if (!parsed.customNodes || !Array.isArray(parsed.customNodes) || parsed.customNodes.length === 0) {
        throw new Error('Custom path requires customNodes array')
      }
      
      // Verify all node IDs exist
      const validNodes = parsed.customNodes.filter((nodeId: string) => 
        allNodes.some(n => n.nodeId === nodeId)
      )
      
      if (validNodes.length === 0) {
        throw new Error('No valid node IDs in custom path')
      }
      
      return {
        isCustomPath: true,
        customNodes: validNodes,
        confidence: Math.min(Math.max(parsed.confidence, 0), 1),
        reasoning: parsed.reasoning
      }
    } else {
      // Single path: validate path exists
      if (!JOB_TYPE_LABELS[parsed.selectedPath as TechTreePath]) {
        throw new Error(`Invalid tech tree path returned: ${parsed.selectedPath}`)
      }
      
      return {
        isCustomPath: false,
        selectedPath: parsed.selectedPath as TechTreePath,
        confidence: Math.min(Math.max(parsed.confidence, 0), 1),
        reasoning: parsed.reasoning
      }
    }
  } catch (error) {
    console.error('AI tech tree matching error:', error)
    
    // Fallback: Try to find keywords in job description
    const desc = jobDescription.toLowerCase()
    
    // Simple keyword matching as fallback
    if (desc.includes('uber') || desc.includes('lyft') || desc.includes('doordash') || desc.includes('delivery')) {
      return {
        isCustomPath: false,
        selectedPath: 'gig_driver',
        confidence: 0.7,
        reasoning: 'Detected delivery/rideshare keywords (fallback match)'
      }
    }
    if (desc.includes('contractor') || desc.includes('construction') || desc.includes('remodel')) {
      return {
        isCustomPath: false,
        selectedPath: 'general_contractor',
        confidence: 0.7,
        reasoning: 'Detected construction keywords (fallback match)'
      }
    }
    if (desc.includes('design') || desc.includes('photo') || desc.includes('creative')) {
      return {
        isCustomPath: false,
        selectedPath: 'creative_services',
        confidence: 0.7,
        reasoning: 'Detected creative services keywords (fallback match)'
      }
    }
    
    // Ultimate fallback
    return {
      isCustomPath: false,
      selectedPath: 'multi_stream',
      confidence: 0.5,
      reasoning: 'Could not determine specific category. Multi-stream income selected as default.'
    }
  }
}

/**
 * Get a human-readable description of the matched path or custom nodes
 */
export function getPathDescription(path?: TechTreePath, customNodes?: string[]): string {
  if (customNodes && customNodes.length > 0) {
    // Custom path: describe selected nodes
    const selectedNodes = customNodes.map(nodeId => {
      // Find the node across all trees
      for (const [pathKey, nodes] of Object.entries(TECH_TREE)) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) return node
      }
      return null
    }).filter(Boolean)
    
    if (selectedNodes.length === 0) return 'Custom path'
    
    let desc = 'Custom Path - Your work combines:\n\n'
    desc += selectedNodes.map(node => `${node!.icon} ${node!.title}: ${node!.description}`).join('\n')
    
    return desc
  }
  
  if (path) {
    // Single path description
    const nodes = TECH_TREE[path]
    if (!nodes || nodes.length === 0) return ''
    
    const baseNode = nodes[0]
    const specializations = nodes.filter(n => n.parentId).map(n => n.title)
    
    let desc = `${baseNode.title}: ${baseNode.description}`
    if (specializations.length > 0) {
      desc += `\n\nSpecializations available:\n${specializations.map(s => `• ${s}`).join('\n')}`
    }
    
    return desc
  }
  
  return ''
}
