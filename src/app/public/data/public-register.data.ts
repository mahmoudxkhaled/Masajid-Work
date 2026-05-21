import type { DonorCategoryId, RegistrationSelectionCard } from '../models/public-registration.model';
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

export const DONOR_CATEGORY_FORM_OPTIONS: { id: DonorCategoryId; labelKey: string }[] = [
  { id: 'carpets', labelKey: 'public.landing.donate.carpetsLabel' },
  { id: 'fans', labelKey: 'public.landing.donate.fansLabel' },
  { id: 'sound', labelKey: 'public.landing.donate.soundLabel' },
  { id: 'furniture', labelKey: 'public.landing.donate.furnitureLabel' },
  { id: 'cleaning', labelKey: 'public.landing.donate.cleaningLabel' },
  { id: 'maintenance', labelKey: 'public.landing.donate.maintenanceLabel' },
  { id: 'painting', labelKey: 'public.landing.donate.paintingLabel' },
  { id: 'lighting', labelKey: 'public.landing.donate.lightingLabel' },
];
