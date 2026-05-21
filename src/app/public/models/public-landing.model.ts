export interface TrustBarItem {
  icon: string;
  labelKey: string;
}

export interface StatItem {
  /** Numeric target for count-up animation */
  target: number;
  /** Suffix after the number, e.g. "+" */
  suffix: string;
  labelKey: string;
}

export interface FeatureCard {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export interface ProcessStep {
  number: number;
  titleKey: string;
  subtitleKey: string;
  highlight?: boolean;
}

export interface UserRole {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  registerPath: string;
}

export interface DonationCategory {
  imageSrc: string;
  labelKey: string;
  altKey: string;
}

export interface ValidationNode {
  icon: string;
  labelKey: string;
  variant: 'primary' | 'accent';
}

export interface SimpleLink {
  labelKey: string;
  href: string;
}
