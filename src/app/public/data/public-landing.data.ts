import type {
  DonationCategory,
  FeatureCard,
  ProcessStep,
  SimpleLink,
  StatItem,
  TrustBarItem,
  UserRole,
  ValidationNode,
} from '../models/public-landing.model';

export const PUBLIC_LANDING_ROUTE_PATH = '/';

const img = (file: string) => `assets/images/masajid-work/${file}`;

export const LOGO_SRC = img('Logo.png');

export const LOGO_SRC_DARK = img('Black_Logo.png');

export const TRUST_BAR_ITEMS: TrustBarItem[] = [
  { icon: 'no_accounts', labelKey: 'public.landing.trustBar.noCash' },
  { icon: 'id_card', labelKey: 'public.landing.trustBar.verifiedReps' },
  { icon: 'photo_camera', labelKey: 'public.landing.trustBar.proof' },
  { icon: 'groups', labelKey: 'public.landing.trustBar.community' },
];

export const STATS: StatItem[] = [
  { target: 120, suffix: '+', labelKey: 'public.landing.stats.facilities' },
  { target: 850, suffix: '+', labelKey: 'public.landing.stats.donors' },
  { target: 300, suffix: '+', labelKey: 'public.landing.stats.requests' },
  { target: 190, suffix: '+', labelKey: 'public.landing.stats.fulfilled' },
];

export const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: 'fact_check',
    titleKey: 'public.landing.features.verifiedTitle',
    descriptionKey: 'public.landing.features.verifiedDesc',
  },
  {
    icon: 'inventory_2',
    titleKey: 'public.landing.features.physicalTitle',
    descriptionKey: 'public.landing.features.physicalDesc',
  },
  {
    icon: 'task_alt',
    titleKey: 'public.landing.features.proofTitle',
    descriptionKey: 'public.landing.features.proofDesc',
  },
  {
    icon: 'visibility',
    titleKey: 'public.landing.features.validationTitle',
    descriptionKey: 'public.landing.features.validationDesc',
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: 1,
    titleKey: 'public.landing.process.s1Title',
    subtitleKey: 'public.landing.process.s1Sub',
  },
  {
    number: 2,
    titleKey: 'public.landing.process.s2Title',
    subtitleKey: 'public.landing.process.s2Sub',
  },
  {
    number: 3,
    titleKey: 'public.landing.process.s3Title',
    subtitleKey: 'public.landing.process.s3Sub',
  },
  {
    number: 4,
    titleKey: 'public.landing.process.s4Title',
    subtitleKey: 'public.landing.process.s4Sub',
  },
  {
    number: 5,
    titleKey: 'public.landing.process.s5Title',
    subtitleKey: 'public.landing.process.s5Sub',
  },
  {
    number: 6,
    titleKey: 'public.landing.process.s6Title',
    subtitleKey: 'public.landing.process.s6Sub',
  },
  {
    number: 7,
    titleKey: 'public.landing.process.s7Title',
    subtitleKey: 'public.landing.process.s7Sub',
    highlight: true,
  },
];

export const USER_ROLES: UserRole[] = [
  {
    icon: 'mosque',
    titleKey: 'public.landing.roles.facilityTitle',
    descriptionKey: 'public.landing.roles.facilityDesc',
    actionLabelKey: 'public.landing.roles.facilityBtn',
    registerPath: '/register/facility',
  },
  {
    icon: 'volunteer_activism',
    titleKey: 'public.landing.roles.donorTitle',
    descriptionKey: 'public.landing.roles.donorDesc',
    actionLabelKey: 'public.landing.roles.donorBtn',
    registerPath: '/register/donor',
  },
  {
    icon: 'storefront',
    titleKey: 'public.landing.roles.vendorTitle',
    descriptionKey: 'public.landing.roles.vendorDesc',
    actionLabelKey: 'public.landing.roles.vendorBtn',
    registerPath: '/register/vendor',
  },
  {
    icon: 'handshake',
    titleKey: 'public.landing.roles.charityTitle',
    descriptionKey: 'public.landing.roles.charityDesc',
    actionLabelKey: 'public.landing.roles.charityBtn',
    registerPath: '/register/charity-center',
  },
];

export const DONATION_CATEGORIES: DonationCategory[] = [
  { imageSrc: img('donate-carpets.jpg'), labelKey: 'public.landing.donate.carpetsLabel', altKey: 'public.landing.donate.carpetsAlt' },
  { imageSrc: img('donate-fans-ac.jpg'), labelKey: 'public.landing.donate.fansLabel', altKey: 'public.landing.donate.fansAlt' },
  { imageSrc: img('donate-sound.jpg'), labelKey: 'public.landing.donate.soundLabel', altKey: 'public.landing.donate.soundAlt' },
  { imageSrc: img('donate-furniture.jpg'), labelKey: 'public.landing.donate.furnitureLabel', altKey: 'public.landing.donate.furnitureAlt' },
  { imageSrc: img('donate-cleaning.jpg'), labelKey: 'public.landing.donate.cleaningLabel', altKey: 'public.landing.donate.cleaningAlt' },
  { imageSrc: img('donate-maintenance.jpg'), labelKey: 'public.landing.donate.maintenanceLabel', altKey: 'public.landing.donate.maintenanceAlt' },
  { imageSrc: img('donate-painting.jpg'), labelKey: 'public.landing.donate.paintingLabel', altKey: 'public.landing.donate.paintingAlt' },
  { imageSrc: img('donate-lighting.jpg'), labelKey: 'public.landing.donate.lightingLabel', altKey: 'public.landing.donate.lightingAlt' },
];

export const VALIDATION_NODES: ValidationNode[] = [
  { icon: 'shield', labelKey: 'public.landing.validation.identity', variant: 'primary' },
  { icon: 'add_photo_alternate', labelKey: 'public.landing.validation.visualProof', variant: 'primary' },
  { icon: 'verified_user', labelKey: 'public.landing.validation.localValidation', variant: 'accent' },
];

export const FOOTER_QUICK_LINKS: SimpleLink[] = [
  { labelKey: 'public.landing.footer.aboutUs', href: '#about' },
  { labelKey: 'public.landing.footer.howItWorks', href: '#how-it-works' },
  { labelKey: 'public.landing.footer.trust', href: '#trust-validation' },
  { labelKey: 'public.landing.footer.facilityReg', href: '#about' },
];

export const FOOTER_LEGAL_LINKS: SimpleLink[] = [
  { labelKey: 'public.landing.footer.vendorPortal', href: '#about' },
  { labelKey: 'public.landing.footer.privacy', href: '#footer' },
];

export const HERO_IMAGE = img('hero-mosque.jpg');

export const AUTH_LOGIN_PATH = '/auth';

export const REGISTER_DONOR_PATH = '/register/donor';

export const REGISTER_FACILITY_PATH = '/register/facility';

export const REGISTER_VENDOR_PATH = '/register/vendor';

export const REGISTER_SELECTION_PATH = '/register';

export const REGISTER_CHARITY_CENTER_PATH = '/register/charity-center';
