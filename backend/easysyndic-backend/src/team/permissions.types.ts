import { UserRole } from '@prisma/client';

export type PermissionModule =
  | 'dashboard'
  | 'residences'
  | 'apartments'
  | 'residents'
  | 'payments'
  | 'complaints'
  | 'assemblies'
  | 'announcements'
  | 'notifications'
  | 'assistant'
  | 'team'
  | 'settings';

export type PermissionAction = string;
export type PermissionMap = Record<string, Record<string, boolean>>;

export const TEAM_ROLES: UserRole[] = [
  UserRole.VICE_SYNDIC,
  UserRole.CAISSIER,
  UserRole.GARDIEN,
  UserRole.SECRETAIRE,
  UserRole.CASHIER,
];

export const GRANULAR_PERMISSION_TEMPLATE: PermissionMap = {
  dashboard: {
    viewDashboard: false,
    viewRevenueKpi: false,
    viewUnpaidKpi: false,
    viewPendingPaymentsKpi: false,
    viewComplaintsKpi: false,
    viewResidentsKpi: false,
    viewApartmentsKpi: false,
  },
  residences: {
    viewList: false,
    viewDetails: false,
    viewAddress: false,
    viewFinancialSummary: false,
    viewApartmentsCount: false,
    viewResidentsCount: false,
  },
  apartments: {
    viewList: false,
    viewDetails: false,
    viewOwnerName: false,
    viewResidentName: false,
    viewBalance: false,
    viewPaymentStatus: false,
    viewUnpaidAmount: false,
  },
  residents: {
    viewList: false,
    viewDetails: false,
    viewPhone: false,
    viewEmail: false,
    viewApartment: false,
    viewBalance: false,
    viewPaymentHistory: false,
  },
  payments: {
    viewList: false,
    viewAmount: false,
    viewUnpaid: false,
    viewPaid: false,
    viewPending: false,
    viewHistory: false,
    viewProofImage: false,
    declarePayment: false,
    validatePayment: false,
    refusePayment: false,
    editPayment: false,
    deletePayment: false,
    exportPayments: false,
  },
  complaints: {
    viewList: false,
    viewDetails: false,
    viewImages: false,
    listenAudio: false,
    updateStatus: false,
    assignComplaint: false,
    closeComplaint: false,
    deleteComplaint: false,
  },
  assemblies: {
    view: false,
    create: false,
    edit: false,
    publish: false,
    delete: false,
    attendance: false,
    voteManage: false,
  },
  announcements: {
    viewList: false,
    create: false,
    edit: false,
    delete: false,
    publish: false,
  },
  notifications: {
    viewList: false,
    send: false,
  },
  assistant: {
    access: false,
  },
  team: {
    viewTeam: false,
    createMember: false,
    editMember: false,
    deleteMember: false,
    editPermissions: false,
  },
  settings: {
    manageResidence: false,
  },
};

function withEnabled(keys: string[]) {
  const permissions = clonePermissions(GRANULAR_PERMISSION_TEMPLATE);

  for (const key of keys) {
    const [module, action] = key.split('.');
    if (permissions[module]?.[action] !== undefined) {
      permissions[module][action] = true;
    }
  }

  return permissions;
}

const caissierPermissions = withEnabled([
  'dashboard.viewDashboard',
  'dashboard.viewRevenueKpi',
  'dashboard.viewUnpaidKpi',
  'dashboard.viewPendingPaymentsKpi',
  'apartments.viewList',
  'apartments.viewBalance',
  'apartments.viewUnpaidAmount',
  'residents.viewList',
  'residents.viewBalance',
  'residents.viewPaymentHistory',
  'payments.viewList',
  'payments.viewAmount',
  'payments.viewUnpaid',
  'payments.viewPaid',
  'payments.viewPending',
  'payments.viewHistory',
  'payments.viewProofImage',
  'payments.validatePayment',
  'payments.refusePayment',
]);

export const PERMISSION_TEMPLATES: Record<string, PermissionMap> = {
  [UserRole.CAISSIER]: caissierPermissions,
  [UserRole.CASHIER]: caissierPermissions,
  [UserRole.GARDIEN]: withEnabled([
    'dashboard.viewDashboard',
    'dashboard.viewComplaintsKpi',
    'residences.viewDetails',
    'residents.viewList',
    'residents.viewApartment',
    'complaints.viewList',
    'complaints.viewDetails',
    'complaints.viewImages',
    'complaints.listenAudio',
    'announcements.viewList',
    'assemblies.view',
  ]),
  [UserRole.SECRETAIRE]: withEnabled([
    'dashboard.viewDashboard',
    'dashboard.viewResidentsKpi',
    'dashboard.viewApartmentsKpi',
    'residents.viewList',
    'residents.viewPhone',
    'residents.viewEmail',
    'announcements.viewList',
    'announcements.create',
    'announcements.edit',
    'assemblies.view',
    'assemblies.create',
    'assemblies.edit',
    'assemblies.publish',
    'assemblies.attendance',
    'assemblies.voteManage',
    'notifications.viewList',
    'notifications.send',
    'assistant.access',
  ]),
  [UserRole.VICE_SYNDIC]: (() => {
    const permissions = getFullPermissionMap();
    permissions.team.editPermissions = false;
    return permissions;
  })(),
};

export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'settings.manageTeam': ['team.viewTeam', 'team.editPermissions'],
  'apartments.view': ['apartments.viewList'],
  'apartments.create': ['apartments.viewList'],
  'apartments.edit': ['apartments.viewDetails'],
  'apartments.delete': ['apartments.viewDetails'],
  'residents.view': ['residents.viewList'],
  'residents.create': ['residents.viewList'],
  'residents.edit': ['residents.viewDetails'],
  'payments.view': ['payments.viewList'],
  'payments.create': ['payments.declarePayment', 'payments.editPayment'],
  'payments.edit': ['payments.editPayment'],
  'payments.delete': ['payments.deletePayment'],
  'payments.validate': ['payments.validatePayment'],
  'payments.refuse': ['payments.refusePayment'],
  'complaints.view': ['complaints.viewList'],
  'complaints.updateStatus': ['complaints.updateStatus'],
  'complaints.close': ['complaints.closeComplaint'],
  'announcements.view': ['announcements.viewList'],
  'announcements.create': ['announcements.create'],
  'announcements.edit': ['announcements.edit'],
  'announcements.delete': ['announcements.delete'],
  'assemblies.view': ['assemblies.view'],
  'assemblies.create': ['assemblies.create'],
  'assemblies.edit': ['assemblies.edit'],
  'assemblies.publish': ['assemblies.publish'],
  'assemblies.delete': ['assemblies.delete'],
  'assemblies.attendance': ['assemblies.attendance'],
  'assemblies.voteManage': ['assemblies.voteManage'],
  'notifications.view': ['notifications.viewList'],
  'notifications.send': ['notifications.send'],
};

export function clonePermissions(permissions: PermissionMap): PermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([module, actions]) => [
      module,
      { ...actions },
    ]),
  );
}

export function getFullPermissionMap(): PermissionMap {
  const permissions = clonePermissions(GRANULAR_PERMISSION_TEMPLATE);

  for (const actions of Object.values(permissions)) {
    for (const action of Object.keys(actions)) {
      actions[action] = true;
    }
  }

  return permissions;
}

export function mergePermissions(
  role: UserRole,
  permissions?: PermissionMap,
): PermissionMap {
  const base = clonePermissions(
    PERMISSION_TEMPLATES[role] ?? GRANULAR_PERMISSION_TEMPLATE,
  );

  for (const [module, actions] of Object.entries(permissions ?? {})) {
    base[module] = { ...(base[module] ?? {}), ...actions };
  }

  return base;
}
