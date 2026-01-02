'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { TECH_TREE, TechTreePath } from '@/lib/gamification/leveling-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Sparkles } from 'lucide-react'
import { CustomJobDescriptionDialog } from './CustomJobDescriptionDialog'

export function TechTreeSelector() {
  const { userProgress, selectTechPath, selectCustomPath } = useStore()
  const [hoveredPath, setHoveredPath] = useState<TechTreePath | null>(null)
  const [showCustomDialog, setShowCustomDialog] = useState(false)

  // Display custom path if user has one
  if (userProgress.isCustomPath && userProgress.customSelectedNodes) {
    const selectedNodes = userProgress.customSelectedNodes.map(nodeId => {
      for (const nodes of Object.values(TECH_TREE)) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) return node
      }
      return null
    }).filter(Boolean)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span>Your Custom Path</span>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
            AI-curated specializations for your unique business
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedNodes.map(node => (
              <div
                key={node!.id}
                className="p-3 border dark:border-gray-700 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{node!.icon}</span>
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {node!.title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {node!.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (userProgress.selectedTechPath) {
    const selectedTree = TECH_TREE[userProgress.selectedTechPath]
    const baseNode = selectedTree[0]
    const level1Nodes = selectedTree.filter(node => node.parentId && node.recommendedLevel <= 1)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{baseNode.icon}</span>
            <span>Your Specialization: {baseNode.title}</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {baseNode.description}
          </p>
          
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">
              ✓ Unlocked Features
            </h4>
            <div className="flex flex-wrap gap-2">
              {baseNode.unlocksFeatures.map((feature, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded">
                  {feature.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {level1Nodes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {level1Nodes.map(node => (
                <div
                  key={node.id}
                  className="p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{node.icon}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {node.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {node.description}
                  </p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                    Unlocked at Level 1
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const pathCategories = [
    {
      category: 'Construction & Trades',
      paths: [
        { key: 'general_contractor' as TechTreePath, label: 'General Contractor', icon: '🔨', description: 'Construction, remodeling' },
        { key: 'specialized_trades' as TechTreePath, label: 'Specialized Trades', icon: '⚡', description: 'Plumbing, electrical, HVAC' },
        { key: 'landscaping' as TechTreePath, label: 'Landscaping', icon: '🌳', description: 'Lawn care, outdoor services' }
      ]
    },
    {
      category: 'Gig & Service Workers',
      paths: [
        { key: 'gig_driver' as TechTreePath, label: 'Gig Driver', icon: '🚗', description: 'Rideshare, delivery' },
        { key: 'gig_services' as TechTreePath, label: 'Gig Services', icon: '🛠️', description: 'TaskRabbit, Instacart' },
        { key: 'freelance_labor' as TechTreePath, label: 'Freelance Labor', icon: '💪', description: 'Moving, cleaning' }
      ]
    },
    {
      category: 'Creative & Digital',
      paths: [
        { key: 'creative_services' as TechTreePath, label: 'Creative Services', icon: '🎨', description: 'Design, photography' },
        { key: 'content_creator' as TechTreePath, label: 'Content Creator', icon: '🎬', description: 'YouTube, social media' },
        { key: 'web_tech' as TechTreePath, label: 'Web & Tech', icon: '💻', description: 'Development, IT' }
      ]
    },
    {
      category: 'Professional Services',
      paths: [
        { key: 'professional_services' as TechTreePath, label: 'Consulting', icon: '💼', description: 'Coaching, advisory' },
        { key: 'health_wellness' as TechTreePath, label: 'Health & Wellness', icon: '💪', description: 'Training, therapy' },
        { key: 'education' as TechTreePath, label: 'Education', icon: '📚', description: 'Tutoring, teaching' }
      ]
    },
    {
      category: 'Sales & Retail',
      paths: [
        { key: 'retail_ecommerce' as TechTreePath, label: 'E-commerce', icon: '🛒', description: 'Online sales' },
        { key: 'direct_sales' as TechTreePath, label: 'Direct Sales', icon: '💼', description: 'MLM, sales rep' },
        { key: 'real_estate' as TechTreePath, label: 'Real Estate', icon: '🏠', description: 'Agent, property mgmt' }
      ]
    },
    {
      category: 'Other Services',
      paths: [
        { key: 'hospitality' as TechTreePath, label: 'Hospitality', icon: '🍽️', description: 'Catering, events' },
        { key: 'pet_services' as TechTreePath, label: 'Pet Services', icon: '🐕', description: 'Walking, grooming' },
        { key: 'multi_stream' as TechTreePath, label: 'Multiple Streams', icon: '💰', description: 'Diversified income' }
      ]
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Specialization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Select the path that best matches your business. You&apos;ll unlock specialized features immediately!
        </p>
        <div className="space-y-6">
          {pathCategories.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {category.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.paths.map((path) => {
                  const baseNode = TECH_TREE[path.key][0]
                  const level1Features = baseNode.unlocksFeatures.slice(0, 2)
                  
                  return (
                    <button
                      key={path.key}
                      onMouseEnter={() => setHoveredPath(path.key)}
                      onMouseLeave={() => setHoveredPath(null)}
                      onClick={() => selectTechPath(path.key)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        hoveredPath === path.key
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 transform scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{path.icon}</div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {path.label}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {path.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {level1Features.map((feature, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                            ✓ {feature.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Don't see your business type?
            </p>
            <Button
              variant="outline"
              onClick={() => setShowCustomDialog(true)}
              className="border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Describe Your Job & Let AI Match
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          💡 Don't worry - you can change this later in settings
        </p>
      </CardContent>
      
      {showCustomDialog && (
        <CustomJobDescriptionDialog
          onPathSelected={(path) => {
            selectTechPath(path)
            setShowCustomDialog(false)
          }}
          onCustomPathSelected={(nodes) => {
            selectCustomPath(nodes)
            setShowCustomDialog(false)
          }}
          onCancel={() => setShowCustomDialog(false)}
        />
      )}
    </Card>
  )
}
