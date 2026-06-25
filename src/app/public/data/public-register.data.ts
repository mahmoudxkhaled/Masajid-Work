import type { RegistrationSelectionCard } from '../models/public-registration.model';
import {
  REGISTER_CHARITY_CENTER_PATH,
  REGISTER_DONOR_PATH,
  REGISTER_FACILITY_PATH,
  REGISTER_VENDOR_PATH,
} from './public-landing.data';

export const REGISTRATION_SELECTION_CARDS: RegistrationSelectionCard[] = [
  {
    icon: 'volunteer_activism',
    titleKey: 'public.register.selection.donor.title',
    descriptionKey: 'public.register.selection.donor.description',
    route: REGISTER_DONOR_PATH,
    accentClass: 'selection-card__icon--primary',
  },
  {
    icon: 'mosque',
    titleKey: 'public.register.selection.facility.title',
    descriptionKey: 'public.register.selection.facility.description',
    route: REGISTER_FACILITY_PATH,
    accentClass: 'selection-card__icon--tertiary',
  },
  {
    icon: 'storefront',
    titleKey: 'public.register.selection.vendor.title',
    descriptionKey: 'public.register.selection.vendor.description',
    route: REGISTER_VENDOR_PATH,
    accentClass: 'selection-card__icon--secondary',
  },
  {
    icon: 'account_balance',
    titleKey: 'public.register.selection.charity.title',
    descriptionKey: 'public.register.selection.charity.description',
    route: REGISTER_CHARITY_CENTER_PATH,
    accentClass: 'selection-card__icon--accent',
  },
];
