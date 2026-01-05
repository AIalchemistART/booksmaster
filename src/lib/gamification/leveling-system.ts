/**
 * Gamification & Leveling System
 * Progressive feature unlocking to guide users through learning the system
 */

export type UserLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type TechTreePath = 
  // Construction & Trades
  | 'general_contractor'      // Construction, handyman, remodeling
  | 'specialized_trades'      // Plumbing, electrical, HVAC
  | 'landscaping'             // Lawn care, landscaping, tree service
  // Gig & Service Workers
  | 'gig_driver'              // Rideshare, delivery, transportation
  | 'gig_services'            // TaskRabbit, Instacart, DoorDash
  | 'freelance_labor'         // Moving, cleaning, handyman gigs
  // Creative & Digital
  | 'creative_services'       // Design, photography, videography
  | 'content_creator'         // YouTube, streaming, social media
  | 'web_tech'                // Web dev, IT consulting, SaaS
  // Professional Services
  | 'professional_services'   // Consulting, coaching, advisory
  | 'health_wellness'         // Personal training, massage, therapy
  | 'education'               // Tutoring, teaching, coaching
  // Sales & Retail
  | 'retail_ecommerce'        // Online sales, dropshipping, Amazon FBA
  | 'direct_sales'            // MLM, network marketing, sales rep
  | 'real_estate'             // Real estate agent, property management
  // Hospitality & Events
  | 'hospitality'             // Catering, event planning, bartending
  | 'pet_services'            // Dog walking, pet sitting, grooming
  // Other
  | 'multi_stream'            // Multiple income streams

export interface Level {
  level: UserLevel
  title: string
  description: string
  xpRequired: number
  badge: string
  unlocksFeatures: string[]
  requiredActions: {
    action: string
    description: string
    completed: boolean
  }[]
}

export interface TechTreeNode {
  id: string
  path: TechTreePath
  title: string
  description: string
  icon: string
  parentId?: string
  unlocksFeatures: string[]
  recommendedLevel: UserLevel
}

export interface UserProgress {
  currentLevel: UserLevel
  currentXP: number
  totalXP: number
  completedActions: string[]
  selectedTechPath?: TechTreePath
  customSelectedNodes?: string[] // Array of node IDs for custom paths
  isCustomPath?: boolean // True if using AI-generated custom path
  unlockedFeatures: string[]
  onboardingComplete: boolean
  lastAchievement?: string
  achievementDate?: string
}

/**
 * XP Awards for different actions - Tiered system
 * 
 * DAILY ACTIONS: Award XP for individual daily workflow (few receipts/day)
 * BATCH ACTIONS: Flat XP for batch operations (prevents artificial boosting)
 * ONE-TIME ACTIONS: Award XP only once (milestones, achievements)
 */

// Daily workflow actions - for users processing a few items at a time
export const DAILY_XP_REWARDS = {
  // === Individual Receipt/Transaction Actions ===
  parseReceipt: 8,              // OCR scan a single receipt (reduced - batch gives flat XP)
  uploadReceipt: 5,             // Upload single receipt image
  validateReceipt: 3,           // Validate a single receipt (low to prevent batch boosting)
  categorizeTransaction: 5,     // Categorize/convert single transaction (reduced)
  editTransaction: 3,           // Edit existing transaction
  linkReceiptToTransaction: 10, // Link receipt to transaction
  createInvoice: 15,            // Create client invoice
  detectDuplicate: 15,          // Catch and merge duplicate
}

// Batch operations - flat XP regardless of batch size (prevents boosting)
export const BATCH_XP_REWARDS = {
  // First batch of the day gets more XP
  batchParseFirst: 100,         // First batch parse of the day
  batchParseSubsequent: 50,     // Additional batch parses same day
  batchValidateFirst: 100,      // First batch validation of the day
  batchValidateSubsequent: 50,  // Additional batch validations same day
  bulkCategorize: 50,           // Bulk recategorization
}

// Legacy repeatable - kept for backward compatibility
export const REPEATABLE_XP_REWARDS = {
  ...DAILY_XP_REWARDS,
  deleteTransaction: 5,
}

// Actions that award XP only ONCE (milestones)
export const ONE_TIME_XP_REWARDS = {
  // === Setup (reduced - wizard should reach Level 1, not Level 2) ===
  completeProfile: 50,          // Was 100
  connectApiKey: 50,            // Was 150
  setFiscalYear: 25,            // Was 50
  completeOnboarding: 75,       // Was 150
  // Total wizard XP: ~200 (Level 1 = 0-299)
  
  // === First-time achievements ===
  uploadFirstReceipt: 75,       // First receipt bonus
  createTransaction: 50,        // First transaction
  firstExport: 75,              // First export
  addVendorDefault: 40,         // First vendor default setup
  
  // === Batch milestones (bonus XP at thresholds) ===
  process10Receipts: 100,
  process25Receipts: 150,
  process50Receipts: 200,
  process100Receipts: 300,
  categorize10Transactions: 100,
  categorize25Transactions: 150,
  categorize50Transactions: 200,
  validate10Receipts: 100,
  validate25Receipts: 150,
  validate50Receipts: 200,
  
  // === Monthly/Quarterly cycle ===
  completeMonth: 200,           // Finish a full month of tracking
  completeQuarter: 500,         // Finish full quarter tracking
  
  // === Major Achievements ===
  reviewQuarterlyTax: 300,      // Complete quarterly tax review
  exportScheduleC: 250,         // Export Schedule C
  perfectCategorization: 400,   // 95%+ confidence across all transactions
  yearEndReview: 600,           // Complete year-end review
  exportAllFormats: 250,        // Export in all available formats
  track100Transactions: 400,    // Reach 100 tracked transactions
  masterAccountant: 750,        // Reach level 12
}

// Combined for backward compatibility
export const XP_REWARDS = {
  ...REPEATABLE_XP_REWARDS,
  ...BATCH_XP_REWARDS,
  ...ONE_TIME_XP_REWARDS,
}

/**
 * 12 Levels matching 12 months of the year
 */
export const LEVELS: Level[] = [
  {
    level: 1,
    title: 'Welcome - Setup Complete',
    description: 'Your bookkeeping journey begins here',
    xpRequired: 50, // Wizard awards ~40 XP, capped at 90 XP (90% of Level 2)
    badge: '🌱',
    unlocksFeatures: ['dashboard', 'settings'],
    requiredActions: []
  },
  {
    level: 2,
    title: 'Explorer - Ready to Scan',
    description: 'Start capturing your receipts',
    xpRequired: 100, // Cosmetic - actual unlock via dashboard click
    badge: '📸',
    unlocksFeatures: ['receipts'],
    requiredActions: []
  },
  {
    level: 3,
    title: 'Validator - First Review',
    description: 'Review and validate your scanned receipts',
    xpRequired: 300, // Cosmetic - actual unlock via first receipt validation
    badge: '✅',
    unlocksFeatures: ['transactions'],
    requiredActions: []
  },
  {
    level: 4,
    title: 'Editor - Data Quality',
    description: 'Make corrections to improve accuracy',
    xpRequired: 600, // Cosmetic - actual unlock via first transaction edit
    badge: '✏️',
    unlocksFeatures: ['categorization_changes'],
    requiredActions: []
  },
  {
    level: 5,
    title: 'Professional - Client Ready',
    description: 'Create invoices for your clients',
    xpRequired: 1000, // Cosmetic - actual unlock via first transaction validation
    badge: '📋',
    unlocksFeatures: ['invoices'],
    requiredActions: []
  },
  {
    level: 6,
    title: 'Organizer - Complete Records',
    description: 'Manage all supporting documentation',
    xpRequired: 1500, // Cosmetic - actual unlock via first supplemental doc
    badge: '📁',
    unlocksFeatures: ['supporting_documents'],
    requiredActions: []
  },
  {
    level: 7,
    title: 'Master - Full Access',
    description: 'Complete insights and reporting unlocked',
    xpRequired: 2000, // Cosmetic - actual unlock via milestones
    badge: '🏆',
    unlocksFeatures: ['reports'],
    requiredActions: []
  }
]

/**
 * Job type labels for settings dropdown
 */
export const JOB_TYPE_LABELS: Record<TechTreePath, string> = {
  general_contractor: 'General Contractor / Construction',
  specialized_trades: 'Specialized Trade (Plumber, Electrician, HVAC)',
  landscaping: 'Landscaping & Lawn Care',
  gig_driver: 'Gig Driver (Uber, Lyft, DoorDash)',
  gig_services: 'Gig Services (TaskRabbit, Instacart)',
  freelance_labor: 'Freelance Labor (Moving, Cleaning)',
  creative_services: 'Creative Services (Design, Photography)',
  content_creator: 'Content Creator (YouTube, Social Media)',
  web_tech: 'Web Development / IT Consulting',
  professional_services: 'Professional Services (Consulting, Coaching)',
  health_wellness: 'Health & Wellness (Training, Therapy)',
  education: 'Education (Tutoring, Teaching)',
  retail_ecommerce: 'Retail & E-commerce',
  direct_sales: 'Direct Sales / Network Marketing',
  real_estate: 'Real Estate Agent / Property Manager',
  hospitality: 'Hospitality & Events (Catering, Planning)',
  pet_services: 'Pet Services (Walking, Sitting, Grooming)',
  multi_stream: 'Multiple Income Streams'
}

/**
 * Tech Tree Structure - Hierarchical progression from core → specialized
 */
export const TECH_TREE: Record<TechTreePath, TechTreeNode[]> = {
  general_contractor: [
    {
      id: 'gc_base',
      path: 'general_contractor',
      title: 'General Contractor',
      description: 'Construction and handyman services',
      icon: '🔨',
      unlocksFeatures: ['materials_tracking', 'subcontractor_management'],
      recommendedLevel: 1
    },
    {
      id: 'gc_residential',
      path: 'general_contractor',
      title: 'Residential Focus',
      description: 'Home repairs, remodeling, maintenance',
      icon: '🏠',
      parentId: 'gc_base',
      unlocksFeatures: ['residential_categories', 'homeowner_invoices'],
      recommendedLevel: 4
    },
    {
      id: 'gc_commercial',
      path: 'general_contractor',
      title: 'Commercial Projects',
      description: 'Business properties, large-scale work',
      icon: '🏢',
      parentId: 'gc_base',
      unlocksFeatures: ['commercial_categories', 'prevailing_wage'],
      recommendedLevel: 4
    }
  ],
  
  specialized_trades: [
    {
      id: 'st_base',
      path: 'specialized_trades',
      title: 'Specialized Trades',
      description: 'Plumbing, electrical, HVAC',
      icon: '⚡',
      unlocksFeatures: ['specialized_tools', 'permit_tracking'],
      recommendedLevel: 1
    },
    {
      id: 'st_plumbing',
      path: 'specialized_trades',
      title: 'Plumbing',
      description: 'Pipes, fixtures, water systems',
      icon: '🔧',
      parentId: 'st_base',
      unlocksFeatures: ['plumbing_categories', 'parts_inventory'],
      recommendedLevel: 3
    },
    {
      id: 'st_electrical',
      path: 'specialized_trades',
      title: 'Electrical',
      description: 'Wiring, panels, lighting',
      icon: '💡',
      parentId: 'st_base',
      unlocksFeatures: ['electrical_categories', 'code_compliance'],
      recommendedLevel: 3
    },
    {
      id: 'st_hvac',
      path: 'specialized_trades',
      title: 'HVAC',
      description: 'Heating, cooling, ventilation',
      icon: '❄️',
      parentId: 'st_base',
      unlocksFeatures: ['hvac_categories', 'seasonal_tracking'],
      recommendedLevel: 3
    }
  ],
  
  creative_services: [
    {
      id: 'cs_base',
      path: 'creative_services',
      title: 'Creative Services',
      description: 'Design, photography, media',
      icon: '🎨',
      unlocksFeatures: ['project_tracking', 'client_portal'],
      recommendedLevel: 1
    },
    {
      id: 'cs_design',
      path: 'creative_services',
      title: 'Design Services',
      description: 'Graphic, web, branding',
      icon: '✏️',
      parentId: 'cs_base',
      unlocksFeatures: ['design_categories', 'asset_tracking'],
      recommendedLevel: 3
    },
    {
      id: 'cs_photo',
      path: 'creative_services',
      title: 'Photography',
      description: 'Event, portrait, commercial',
      icon: '📸',
      parentId: 'cs_base',
      unlocksFeatures: ['photography_categories', 'equipment_depreciation'],
      recommendedLevel: 3
    }
  ],
  
  professional_services: [
    {
      id: 'ps_base',
      path: 'professional_services',
      title: 'Professional Services',
      description: 'Consulting, coaching, advisory',
      icon: '💼',
      unlocksFeatures: ['time_tracking', 'retainer_management'],
      recommendedLevel: 1
    },
    {
      id: 'ps_consulting',
      path: 'professional_services',
      title: 'Consulting',
      description: 'Business, IT, management',
      icon: '📈',
      parentId: 'ps_base',
      unlocksFeatures: ['consulting_categories', 'engagement_tracking'],
      recommendedLevel: 3
    }
  ],
  
  retail_ecommerce: [
    {
      id: 're_base',
      path: 'retail_ecommerce',
      title: 'Retail & E-commerce',
      description: 'Online sales, inventory',
      icon: '🛒',
      unlocksFeatures: ['inventory_tracking', 'cogs_calculation'],
      recommendedLevel: 1
    },
    {
      id: 're_online',
      path: 'retail_ecommerce',
      title: 'Online Sales',
      description: 'E-commerce platforms',
      icon: '💻',
      parentId: 're_base',
      unlocksFeatures: ['platform_integration', 'shipping_tracking'],
      recommendedLevel: 3
    },
    {
      id: 're_dropship',
      path: 'retail_ecommerce',
      title: 'Dropshipping',
      description: 'No inventory, supplier fulfillment',
      icon: '📦',
      parentId: 're_online',
      unlocksFeatures: ['supplier_management', 'margin_tracking'],
      recommendedLevel: 5
    }
  ],
  
  // NEW: Gig Driver (High mileage needs)
  gig_driver: [
    {
      id: 'gd_base',
      path: 'gig_driver',
      title: 'Gig Driver',
      description: 'Rideshare & delivery driving',
      icon: '🚗',
      unlocksFeatures: ['mileage_tracking', 'trip_logging', 'fuel_tracking'],
      recommendedLevel: 1
    },
    {
      id: 'gd_rideshare',
      path: 'gig_driver',
      title: 'Rideshare Driver',
      description: 'Uber, Lyft passenger transport',
      icon: '🚕',
      parentId: 'gd_base',
      unlocksFeatures: ['passenger_tracking', 'platform_tips'],
      recommendedLevel: 3
    },
    {
      id: 'gd_delivery',
      path: 'gig_driver',
      title: 'Delivery Driver',
      description: 'DoorDash, Uber Eats, Amazon Flex',
      icon: '🍔',
      parentId: 'gd_base',
      unlocksFeatures: ['delivery_zones', 'order_tracking'],
      recommendedLevel: 3
    },
    {
      id: 'gd_multi',
      path: 'gig_driver',
      title: 'Multi-App Driver',
      description: 'Multiple platforms simultaneously',
      icon: '📱',
      parentId: 'gd_base',
      unlocksFeatures: ['multi_platform_reconciliation'],
      recommendedLevel: 5
    }
  ],
  
  // NEW: Gig Services
  gig_services: [
    {
      id: 'gs_base',
      path: 'gig_services',
      title: 'Gig Services',
      description: 'Task-based service work',
      icon: '🛠️',
      unlocksFeatures: ['task_tracking', 'supply_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'gs_shopping',
      path: 'gig_services',
      title: 'Shopping Services',
      description: 'Instacart, Shipt grocery delivery',
      icon: '🛍️',
      parentId: 'gs_base',
      unlocksFeatures: ['batch_tracking', 'tip_reporting'],
      recommendedLevel: 3
    },
    {
      id: 'gs_tasks',
      path: 'gig_services',
      title: 'Task Services',
      description: 'TaskRabbit, Handy various tasks',
      icon: '🔧',
      parentId: 'gs_base',
      unlocksFeatures: ['hourly_rate_tracking', 'tool_expenses'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Freelance Labor
  freelance_labor: [
    {
      id: 'fl_base',
      path: 'freelance_labor',
      title: 'Freelance Labor',
      description: 'Physical labor services',
      icon: '💪',
      unlocksFeatures: ['hourly_tracking', 'labor_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'fl_moving',
      path: 'freelance_labor',
      title: 'Moving Services',
      description: 'Furniture moving, packing',
      icon: '📦',
      parentId: 'fl_base',
      unlocksFeatures: ['job_size_tracking', 'truck_rental'],
      recommendedLevel: 3
    },
    {
      id: 'fl_cleaning',
      path: 'freelance_labor',
      title: 'Cleaning Services',
      description: 'House, office, specialty cleaning',
      icon: '🧹',
      parentId: 'fl_base',
      unlocksFeatures: ['cleaning_supplies', 'recurring_clients'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Landscaping
  landscaping: [
    {
      id: 'ls_base',
      path: 'landscaping',
      title: 'Landscaping',
      description: 'Lawn care & outdoor services',
      icon: '🌳',
      unlocksFeatures: ['seasonal_tracking', 'equipment_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'ls_lawn',
      path: 'landscaping',
      title: 'Lawn Care',
      description: 'Mowing, edging, maintenance',
      icon: '🏡',
      parentId: 'ls_base',
      unlocksFeatures: ['route_optimization', 'subscription_billing'],
      recommendedLevel: 3
    },
    {
      id: 'ls_design',
      path: 'landscaping',
      title: 'Landscape Design',
      description: 'Hardscaping, garden design',
      icon: '🪴',
      parentId: 'ls_base',
      unlocksFeatures: ['project_based_billing', 'material_markup'],
      recommendedLevel: 5
    }
  ],
  
  // NEW: Content Creator
  content_creator: [
    {
      id: 'cc_base',
      path: 'content_creator',
      title: 'Content Creator',
      description: 'Digital content & social media',
      icon: '🎬',
      unlocksFeatures: ['revenue_stream_tracking', 'equipment_depreciation'],
      recommendedLevel: 1
    },
    {
      id: 'cc_youtube',
      path: 'content_creator',
      title: 'YouTube Creator',
      description: 'Video content, AdSense revenue',
      icon: '📹',
      parentId: 'cc_base',
      unlocksFeatures: ['adsense_tracking', 'sponsorship_revenue'],
      recommendedLevel: 3
    },
    {
      id: 'cc_social',
      path: 'content_creator',
      title: 'Social Media Influencer',
      description: 'Instagram, TikTok, brand deals',
      icon: '📱',
      parentId: 'cc_base',
      unlocksFeatures: ['brand_deal_tracking', 'gifted_product_value'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Web & Tech
  web_tech: [
    {
      id: 'wt_base',
      path: 'web_tech',
      title: 'Web & Tech Services',
      description: 'Development & IT consulting',
      icon: '💻',
      unlocksFeatures: ['project_milestones', 'software_subscriptions'],
      recommendedLevel: 1
    },
    {
      id: 'wt_dev',
      path: 'web_tech',
      title: 'Web Developer',
      description: 'Websites, apps, freelance coding',
      icon: '⌨️',
      parentId: 'wt_base',
      unlocksFeatures: ['hourly_project_toggle', 'hosting_expenses'],
      recommendedLevel: 3
    },
    {
      id: 'wt_saas',
      path: 'web_tech',
      title: 'SaaS Founder',
      description: 'Software as a service products',
      icon: '🚀',
      parentId: 'wt_base',
      unlocksFeatures: ['mrr_tracking', 'server_costs'],
      recommendedLevel: 5
    }
  ],
  
  // NEW: Health & Wellness
  health_wellness: [
    {
      id: 'hw_base',
      path: 'health_wellness',
      title: 'Health & Wellness',
      description: 'Fitness & therapy services',
      icon: '💪',
      unlocksFeatures: ['session_tracking', 'certification_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'hw_training',
      path: 'health_wellness',
      title: 'Personal Trainer',
      description: 'Fitness coaching, training',
      icon: '🏋️',
      parentId: 'hw_base',
      unlocksFeatures: ['client_programs', 'gym_rental'],
      recommendedLevel: 3
    },
    {
      id: 'hw_therapy',
      path: 'health_wellness',
      title: 'Massage Therapist',
      description: 'Massage, bodywork services',
      icon: '💆',
      parentId: 'hw_base',
      unlocksFeatures: ['appointment_based', 'supply_tracking'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Education
  education: [
    {
      id: 'ed_base',
      path: 'education',
      title: 'Education Services',
      description: 'Teaching & tutoring',
      icon: '📚',
      unlocksFeatures: ['student_tracking', 'curriculum_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'ed_tutor',
      path: 'education',
      title: 'Private Tutor',
      description: 'Academic tutoring',
      icon: '✏️',
      parentId: 'ed_base',
      unlocksFeatures: ['session_packages', 'material_costs'],
      recommendedLevel: 3
    },
    {
      id: 'ed_online',
      path: 'education',
      title: 'Online Course Creator',
      description: 'Digital courses, workshops',
      icon: '🎓',
      parentId: 'ed_base',
      unlocksFeatures: ['course_revenue', 'platform_fees'],
      recommendedLevel: 5
    }
  ],
  
  // NEW: Direct Sales
  direct_sales: [
    {
      id: 'ds_base',
      path: 'direct_sales',
      title: 'Direct Sales',
      description: 'Sales representative work',
      icon: '💼',
      unlocksFeatures: ['commission_tracking', 'inventory_personal'],
      recommendedLevel: 1
    },
    {
      id: 'ds_mlm',
      path: 'direct_sales',
      title: 'Network Marketing',
      description: 'MLM, direct sales teams',
      icon: '📊',
      parentId: 'ds_base',
      unlocksFeatures: ['team_commissions', 'product_inventory'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Real Estate
  real_estate: [
    {
      id: 'rea_base',
      path: 'real_estate',
      title: 'Real Estate',
      description: 'Property sales & management',
      icon: '🏠',
      unlocksFeatures: ['deal_tracking', 'mls_fees'],
      recommendedLevel: 1
    },
    {
      id: 'rea_agent',
      path: 'real_estate',
      title: 'Real Estate Agent',
      description: 'Residential & commercial sales',
      icon: '🔑',
      parentId: 'rea_base',
      unlocksFeatures: ['commission_splits', 'marketing_expenses'],
      recommendedLevel: 3
    },
    {
      id: 'rea_property',
      path: 'real_estate',
      title: 'Property Manager',
      description: 'Rental property management',
      icon: '🏢',
      parentId: 'rea_base',
      unlocksFeatures: ['tenant_tracking', 'maintenance_expenses'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Hospitality
  hospitality: [
    {
      id: 'hosp_base',
      path: 'hospitality',
      title: 'Hospitality Services',
      description: 'Events & catering',
      icon: '🍽️',
      unlocksFeatures: ['event_tracking', 'food_costs'],
      recommendedLevel: 1
    },
    {
      id: 'hosp_catering',
      path: 'hospitality',
      title: 'Catering',
      description: 'Event catering services',
      icon: '🍰',
      parentId: 'hosp_base',
      unlocksFeatures: ['per_person_pricing', 'ingredient_tracking'],
      recommendedLevel: 3
    },
    {
      id: 'hosp_events',
      path: 'hospitality',
      title: 'Event Planning',
      description: 'Wedding, party planning',
      icon: '🎉',
      parentId: 'hosp_base',
      unlocksFeatures: ['vendor_coordination', 'deposit_tracking'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Pet Services
  pet_services: [
    {
      id: 'pet_base',
      path: 'pet_services',
      title: 'Pet Services',
      description: 'Animal care services',
      icon: '🐕',
      unlocksFeatures: ['pet_tracking', 'supply_expenses'],
      recommendedLevel: 1
    },
    {
      id: 'pet_walking',
      path: 'pet_services',
      title: 'Dog Walking',
      description: 'Dog walking & pet sitting',
      icon: '🦮',
      parentId: 'pet_base',
      unlocksFeatures: ['client_pets', 'route_planning'],
      recommendedLevel: 3
    },
    {
      id: 'pet_grooming',
      path: 'pet_services',
      title: 'Pet Grooming',
      description: 'Professional grooming services',
      icon: '✂️',
      parentId: 'pet_base',
      unlocksFeatures: ['service_packages', 'grooming_supplies'],
      recommendedLevel: 3
    }
  ],
  
  // NEW: Multi-Stream (Advanced users)
  multi_stream: [
    {
      id: 'ms_base',
      path: 'multi_stream',
      title: 'Multiple Income Streams',
      description: 'Diversified income sources',
      icon: '💰',
      unlocksFeatures: ['income_stream_separation', 'cross_category_reporting'],
      recommendedLevel: 1
    },
    {
      id: 'ms_portfolio',
      path: 'multi_stream',
      title: 'Portfolio Income',
      description: 'Combining multiple businesses',
      icon: '📊',
      parentId: 'ms_base',
      unlocksFeatures: ['business_segmentation', 'consolidated_reporting'],
      recommendedLevel: 5
    }
  ]
}

/**
 * Calculate user level from XP
 * NOTE: With manual leveling system, XP no longer automatically levels up
 * This function is deprecated - levels are now controlled via manualLevelUp()
 */
export function calculateLevel(xp: number): UserLevel {
  // Always return 1 - manual leveling system only
  return 1
}

/**
 * Check if a feature is unlocked for the user
 */
export function isFeatureUnlocked(
  feature: string,
  userProgress: UserProgress
): boolean {
  return userProgress.unlockedFeatures.includes(feature)
}

/**
 * Get features that should be unlocked at a given level
 */
export function getUnlockedFeaturesAtLevel(level: UserLevel): string[] {
  const features: string[] = []
  for (let i = 0; i < level; i++) {
    features.push(...LEVELS[i].unlocksFeatures)
  }
  return features
}

/**
 * Award XP and check for level up
 */
export function awardXP(
  currentProgress: UserProgress,
  action: keyof typeof XP_REWARDS
): {
  newProgress: UserProgress
  leveledUp: boolean
  newLevel?: UserLevel
  xpGained: number
} {
  const xpGained = XP_REWARDS[action]
  const newTotalXP = currentProgress.totalXP + xpGained
  const newLevel = calculateLevel(newTotalXP)
  const leveledUp = newLevel > currentProgress.currentLevel

  const newProgress: UserProgress = {
    ...currentProgress,
    totalXP: newTotalXP,
    currentXP: newTotalXP,
    currentLevel: newLevel,
    completedActions: [...currentProgress.completedActions, action],
    unlockedFeatures: getUnlockedFeaturesAtLevel(newLevel)
  }

  if (leveledUp) {
    newProgress.lastAchievement = `Reached Level ${newLevel}: ${LEVELS[newLevel - 1].title}`
    newProgress.achievementDate = new Date().toISOString()
  }

  return {
    newProgress,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    xpGained
  }
}

/**
 * Get next level requirements
 */
export function getNextLevelRequirements(currentLevel: UserLevel, currentXP: number) {
  if (currentLevel >= 6) {
    return null // Max level
  }

  const nextLevel = LEVELS[currentLevel]
  const xpNeeded = nextLevel.xpRequired - currentXP
  const progress = currentXP / nextLevel.xpRequired

  return {
    nextLevel: nextLevel.level,
    nextLevelTitle: nextLevel.title,
    xpNeeded,
    progress: Math.min(progress, 1),
    unlocksFeatures: nextLevel.unlocksFeatures
  }
}
