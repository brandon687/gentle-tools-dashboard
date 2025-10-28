// iPhone model hierarchy sorting utility
// Based on Apple's official release chronology and product hierarchy

interface ModelHierarchy {
  generation: number;
  tier: number;
  name: string;
}

// Define the comprehensive iPhone model hierarchy
const iPhoneModels: { [key: string]: ModelHierarchy } = {
  // iPhone 17 series (2025)
  '17 PRO MAX': { generation: 17, tier: 4, name: 'iPhone 17 Pro Max' },
  '17 PRO': { generation: 17, tier: 3, name: 'iPhone 17 Pro' },
  'AIR': { generation: 17, tier: 2, name: 'iPhone Air' },
  '17': { generation: 17, tier: 1, name: 'iPhone 17' },
  
  // iPhone 16 series (2024-2025)
  '16E': { generation: 16.5, tier: 0, name: 'iPhone 16e' },
  '16 PRO MAX': { generation: 16, tier: 4, name: 'iPhone 16 Pro Max' },
  '16 PRO': { generation: 16, tier: 3, name: 'iPhone 16 Pro' },
  '16 PLUS': { generation: 16, tier: 2, name: 'iPhone 16 Plus' },
  '16': { generation: 16, tier: 1, name: 'iPhone 16' },
  
  // iPhone 15 series (2023)
  '15 PRO MAX': { generation: 15, tier: 4, name: 'iPhone 15 Pro Max' },
  '15 PRO': { generation: 15, tier: 3, name: 'iPhone 15 Pro' },
  '15 PLUS': { generation: 15, tier: 2, name: 'iPhone 15 Plus' },
  '15': { generation: 15, tier: 1, name: 'iPhone 15' },
  
  // iPhone 14 series (2022)
  '14 PRO MAX': { generation: 14, tier: 4, name: 'iPhone 14 Pro Max' },
  '14 PRO': { generation: 14, tier: 3, name: 'iPhone 14 Pro' },
  '14 PLUS': { generation: 14, tier: 2, name: 'iPhone 14 Plus' },
  '14': { generation: 14, tier: 1, name: 'iPhone 14' },
  
  // iPhone 13 series (2021)
  '13 PRO MAX': { generation: 13, tier: 4, name: 'iPhone 13 Pro Max' },
  '13 PRO': { generation: 13, tier: 3, name: 'iPhone 13 Pro' },
  '13': { generation: 13, tier: 2, name: 'iPhone 13' },
  '13 MINI': { generation: 13, tier: 1, name: 'iPhone 13 mini' },
  
  // iPhone 12 series (2020)
  '12 PRO MAX': { generation: 12, tier: 4, name: 'iPhone 12 Pro Max' },
  '12 PRO': { generation: 12, tier: 3, name: 'iPhone 12 Pro' },
  '12': { generation: 12, tier: 2, name: 'iPhone 12' },
  '12 MINI': { generation: 12, tier: 1, name: 'iPhone 12 mini' },
  
  // iPhone SE series
  'SE 3': { generation: 11.3, tier: 1, name: 'iPhone SE (3rd generation)' },
  'SE 2': { generation: 8.3, tier: 1, name: 'iPhone SE (2nd generation)' },
  'SE': { generation: 6.3, tier: 1, name: 'iPhone SE' },
  
  // iPhone 11 series (2019)
  '11 PRO MAX': { generation: 11, tier: 4, name: 'iPhone 11 Pro Max' },
  '11 PRO': { generation: 11, tier: 3, name: 'iPhone 11 Pro' },
  '11': { generation: 11, tier: 1, name: 'iPhone 11' },
  
  // iPhone XS/XR series (2018)
  'XS MAX': { generation: 10.2, tier: 3, name: 'iPhone XS Max' },
  'XS': { generation: 10.2, tier: 2, name: 'iPhone XS' },
  'XR': { generation: 10.1, tier: 1, name: 'iPhone XR' },
  
  // iPhone X (2017)
  'X': { generation: 10, tier: 1, name: 'iPhone X' },
  
  // iPhone 8 series (2017)
  '8 PLUS': { generation: 8, tier: 2, name: 'iPhone 8 Plus' },
  '8': { generation: 8, tier: 1, name: 'iPhone 8' },
  
  // iPhone 7 series (2016)
  '7 PLUS': { generation: 7, tier: 2, name: 'iPhone 7 Plus' },
  '7': { generation: 7, tier: 1, name: 'iPhone 7' },
  
  // iPhone 6s series (2015)
  '6S PLUS': { generation: 6.2, tier: 2, name: 'iPhone 6s Plus' },
  '6S': { generation: 6.2, tier: 1, name: 'iPhone 6s' },
  
  // iPhone 6 series (2014)
  '6 PLUS': { generation: 6, tier: 2, name: 'iPhone 6 Plus' },
  '6': { generation: 6, tier: 1, name: 'iPhone 6' },
  
  // Older models
  '5S': { generation: 5.2, tier: 1, name: 'iPhone 5s' },
  '5C': { generation: 5.1, tier: 1, name: 'iPhone 5c' },
  '5': { generation: 5, tier: 1, name: 'iPhone 5' },
  '4S': { generation: 4.2, tier: 1, name: 'iPhone 4s' },
  '4': { generation: 4, tier: 1, name: 'iPhone 4' },
  '3GS': { generation: 3.2, tier: 1, name: 'iPhone 3GS' },
  '3G': { generation: 3.1, tier: 1, name: 'iPhone 3G' },
};

/**
 * Normalize model name to match our hierarchy keys
 * Patterns are ordered from most specific to least specific to avoid premature matches
 */
function normalizeModelName(model: string): string {
  const normalized = model.toUpperCase().trim();
  
  // Handle variations in naming - ORDER MATTERS!
  // More specific patterns (Pro Max, Pro, Plus, Mini) must come before generic patterns
  const patterns = [
    // Special edition models
    { regex: /SE\s*\(3RD/, key: () => 'SE 3' },
    { regex: /SE\s*\(2ND/, key: () => 'SE 2' },
    { regex: /SE/, key: () => 'SE' },
    
    // X series special names
    { regex: /XS\s*MAX/, key: () => 'XS MAX' },
    { regex: /XS/, key: () => 'XS' },
    { regex: /XR/, key: () => 'XR' },
    { regex: /\bX\b/, key: () => 'X' },
    
    // Letter-suffix + tier combinations (e.g., "6s Plus", "6S Pro Max")
    // These MUST come before both the letter-suffix pattern and tiered-only patterns
    { regex: /(\d+[A-Z]+)\s*PRO\s*MAX/, key: (match: RegExpMatchArray) => `${match[1]} PRO MAX` },
    { regex: /(\d+[A-Z]+)\s*PRO/, key: (match: RegExpMatchArray) => `${match[1]} PRO` },
    { regex: /(\d+[A-Z]+)\s*PLUS/, key: (match: RegExpMatchArray) => `${match[1]} PLUS` },
    { regex: /(\d+[A-Z]+)\s*MINI/, key: (match: RegExpMatchArray) => `${match[1]} MINI` },
    
    // Tiered models without letter suffixes (e.g., "15 Pro Max", "14 Plus")
    { regex: /(\d+)\s*PRO\s*MAX/, key: (match: RegExpMatchArray) => `${match[1]} PRO MAX` },
    { regex: /(\d+)\s*PRO/, key: (match: RegExpMatchArray) => `${match[1]} PRO` },
    { regex: /(\d+)\s*PLUS/, key: (match: RegExpMatchArray) => `${match[1]} PLUS` },
    { regex: /(\d+)\s*MINI/, key: (match: RegExpMatchArray) => `${match[1]} MINI` },
    
    // Special variants with letters attached to numbers (no tier)
    { regex: /(\d+)([A-Z]+)/, key: (match: RegExpMatchArray) => `${match[1]}${match[2]}` },
    
    // Generic iPhone number pattern - THIS MUST BE LAST among number patterns
    { regex: /IPHONE\s+(\d+E?)/, key: (match: RegExpMatchArray) => match[1] },
    { regex: /(\d+E?)/, key: (match: RegExpMatchArray) => match[1] },
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern.regex);
    if (match) {
      return pattern.key(match);
    }
  }
  
  return normalized;
}

/**
 * Get hierarchy info for a model
 */
function getModelHierarchy(model: string): ModelHierarchy {
  const key = normalizeModelName(model);
  return iPhoneModels[key] || { generation: 0, tier: 0, name: model };
}

/**
 * Sort iPhone models by generation (newest first) and tier (highest first)
 */
export function sortModelsByHierarchy(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  const hierarchyA = getModelHierarchy(a);
  const hierarchyB = getModelHierarchy(b);
  
  // First sort by generation (newest first)
  if (hierarchyA.generation !== hierarchyB.generation) {
    return hierarchyB.generation - hierarchyA.generation;
  }
  
  // Then by tier (Pro Max > Pro > Plus > Base > mini)
  return hierarchyB.tier - hierarchyA.tier;
}

/**
 * Get the canonical/formatted name for a model
 */
export function getCanonicalModelName(model: string): string {
  const hierarchy = getModelHierarchy(model);
  return hierarchy.name;
}

/**
 * Sort GB/storage options numerically (highest first)
 */
export function sortGBOptions(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  const numA = parseInt(a) || 0;
  const numB = parseInt(b) || 0;
  return numB - numA;
}

/**
 * Sort colors alphabetically
 */
export function sortColors(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

/**
 * Sort by lock status - UNLOCKED items first, then LOCKED, then everything else
 */
export function sortByLockStatus<T extends { lockStatus?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const statusA = a.lockStatus?.toUpperCase();
    const statusB = b.lockStatus?.toUpperCase();
    
    // If both have the same status or both are undefined
    if (statusA === statusB) return 0;
    
    // UNLOCKED items come first
    if (statusA === 'UNLOCKED') return -1;
    if (statusB === 'UNLOCKED') return 1;
    
    // Then LOCKED items
    if (statusA === 'LOCKED') return -1;
    if (statusB === 'LOCKED') return 1;
    
    // Everything else comes last
    if (!statusA) return 1;
    if (!statusB) return -1;
    
    // Alphabetical sort for other statuses
    return statusA.localeCompare(statusB);
  });
}
