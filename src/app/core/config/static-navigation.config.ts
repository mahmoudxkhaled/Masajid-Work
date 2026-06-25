import { IFunctionDetail, IModulesDetails } from '../models/account-status.model';
import { Roles } from '../models/system-roles';

export const DEFAULT_MODULE_VISIBLE_ROLES: Roles[] = [
    Roles.Developer,
    Roles.SystemAdministrator,
    Roles.EntityAdministrator,
    Roles.SystemUser,
];

export const MODULE_ROLE_VISIBILITY: Partial<Record<string, Roles[]>> = {
    SDB: [Roles.Developer, Roles.SystemAdministrator],
    SSM: [Roles.Developer, Roles.SystemAdministrator],
    SENT: [Roles.Developer, Roles.SystemAdministrator],
    USRACC: [Roles.Developer, Roles.SystemAdministrator],
    NOT: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    PRF: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    SET: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    LGOT: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    NOTM: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
};

export const SYSTEM_ADMIN_ONLY_LEGACY_FUNCTIONS: readonly string[] = ['EntAdm', 'DC'];

export const STATIC_FUNCTIONS_DETAILS: Record<string, IFunctionDetail> = {
    DBS: {
        FunctionID: 1,
        Name: 'Dashboard Summary',
        Name_Regional: '\u0645\u0644\u062e\u0635 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
        Default_Order: 10,
        URL: '/',
    },
    EntAdm: {
        FunctionID: 3,
        Name: 'Entity Administration',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a',
        Default_Order: 20,
        URL: '/entity-administration',
    },
    DC: {
        FunctionID: 4,
        Name: 'Document Control',
        Name_Regional: '\u0627\u0644\u062a\u062d\u0643\u0645 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a',
        Default_Order: 30,
        URL: '/document-control',
    },
    SysAdm: {
        FunctionID: 2,
        Name: 'System Administration',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645',
        Default_Order: 40,
        URL: '/system-administration',
    },
};

export const STATIC_MODULES_DETAILS: IModulesDetails = {
    LGOT: {
        ModuleID: 5,
        FunctionID: 1,
        Name: 'Logout',
        Name_Regional: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
        Default_Order: 10,
        URL: '',
    },
    PRF: {
        ModuleID: 3,
        FunctionID: 1,
        Name: 'Profile',
        Name_Regional: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
        Default_Order: 20,
        URL: '/summary/profile',
    },
    SET: {
        ModuleID: 4,
        FunctionID: 1,
        Name: 'Settings',
        Name_Regional: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
        Default_Order: 30,
        URL: '/summary/settings',
    },
    NOT: {
        ModuleID: 2,
        FunctionID: 1,
        Name: 'Notifications',
        Name_Regional: '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
        Default_Order: 40,
        URL: '/summary/notifications',
    },
    NOTM: {
        ModuleID: 33,
        FunctionID: 1,
        Name: 'Notifications Management',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
        Default_Order: 50,
        URL: '/summary/notifications-management',
    },
    GP: {
        ModuleID: 95,
        FunctionID: 1,
        Name: 'Personal Groups',
        Name_Regional: '\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629',
        Default_Order: 55,
        URL: '/summary/groups',
    },
    SDB: {
        ModuleID: 9,
        FunctionID: 2,
        Name: 'System Dashboard',
        Name_Regional: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0646\u0638\u0627\u0645',
        Default_Order: 10,
        URL: '/system-administration/dashboard',
    },
    SENT: {
        ModuleID: 91,
        FunctionID: 2,
        Name: 'System Entities',
        Name_Regional: '\u0643\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645',
        Default_Order: 20,
        URL: '/system-administration/system-entities',
    },
    USRACC: {
        ModuleID: 7,
        FunctionID: 2,
        Name: 'System Users',
        Name_Regional: '\u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0646\u0638\u0627\u0645',
        Default_Order: 30,
        URL: '/system-administration/user-accounts',
    },
    SSM: {
        ModuleID: 90,
        FunctionID: 2,
        Name: 'System Storage Management',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0646\u0638\u0627\u0645',
        Default_Order: 45,
        URL: '/system-administration/system-storage-management',
    },
    ENTDT: {
        ModuleID: 6,
        FunctionID: 3,
        Name: 'Manage Entities',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a',
        Default_Order: 10,
        URL: '/entity-administration/entities',
    },
    EUA: {
        ModuleID: 13,
        FunctionID: 3,
        Name: 'Entity User Accounts',
        Name_Regional: '\u062d\u0633\u0627\u0628\u0627\u062a \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0643\u064a\u0627\u0646',
        Default_Order: 20,
        URL: '/entity-administration/entity-user-accounts',
    },
    ESM: {
        ModuleID: 93,
        FunctionID: 3,
        Name: 'Entity Storage Management',
        Name_Regional: '\u0625\u062f\u0627\u0631\u0629 \u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a',
        Default_Order: 60,
        URL: '/entity-administration/entity-storage-management',
    },
    STCM: {
        ModuleID: 15,
        FunctionID: 4,
        Name: 'Storage and Content Management',
        Name_Regional: '\u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649',
        Default_Order: 10,
        URL: '/document-control/storage-content-management',
    },
};
