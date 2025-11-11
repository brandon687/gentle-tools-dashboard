import { UserRole } from '@/contexts/AuthContext';

export type TabName = 'insights' | 'physical' | 'reconciled' | 'outbound' | 'shipped' | 'movements' | 'admin';

/**
 * Define which tabs each role can access
 */
const ROLE_TAB_ACCESS: Record<UserRole, TabName[]> = {
  power_user: ['physical', 'reconciled', 'shipped'],
  admin: ['insights', 'physical', 'reconciled', 'outbound', 'shipped', 'movements', 'admin'],
};

/**
 * Check if a user role has access to a specific tab
 */
export function canAccessTab(role: UserRole | undefined, tab: TabName): boolean {
  if (!role) return false;
  return ROLE_TAB_ACCESS[role]?.includes(tab) ?? false;
}

/**
 * Get all accessible tabs for a user role
 */
export function getAccessibleTabs(role: UserRole | undefined): TabName[] {
  if (!role) return [];
  return ROLE_TAB_ACCESS[role] || [];
}

/**
 * Tab display configuration
 */
export const TAB_CONFIG: Record<TabName, { label: string; description: string }> = {
  insights: {
    label: 'Quick Insights',
    description: 'Dashboard statistics and sync status'
  },
  physical: {
    label: 'Physical Inventory',
    description: 'Full inventory excluding shipped items'
  },
  reconciled: {
    label: 'Pending Outbound',
    description: 'Items marked as shipped/pending outbound'
  },
  outbound: {
    label: 'Outbound IMEIs',
    description: 'Outbound IMEI cache with search'
  },
  shipped: {
    label: 'Dump IMEI',
    description: 'Shipped/dumped IMEI management'
  },
  movements: {
    label: 'Movement Log',
    description: 'Audit trail of all movements'
  },
  admin: {
    label: 'Admin Panel',
    description: 'User management and system settings'
  },
};
