import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PublicRoutingModule } from './public-routing.module';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { RegisterSelectionComponent } from './pages/register-selection/register-selection.component';
import { DonorRegistrationComponent } from './pages/register-donor/register-donor.component';
import { FacilityRegistrationComponent } from './pages/register-facility/register-facility.component';
import { VendorRegistrationComponent } from './pages/register-vendor/register-vendor.component';
import { CharityCenterRegistrationComponent } from './pages/register-charity-center/register-charity-center.component';
import { RegisterLocationPickerComponent } from './components/register-location-picker/register-location-picker.component';
import { HeaderSectionComponent } from './components/header-section/header-section.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { TrustBarSectionComponent } from './components/trust-bar-section/trust-bar-section.component';
import { StatsSectionComponent } from './components/stats-section/stats-section.component';
import { FeaturesSectionComponent } from './components/features-section/features-section.component';
import { HowItWorksSectionComponent } from './components/how-it-works-section/how-it-works-section.component';
import { AboutSectionComponent } from './components/about-section/about-section.component';
import { ServicesSectionComponent } from './components/services-section/services-section.component';
import { ValidationSectionComponent } from './components/validation-section/validation-section.component';
import { CallToActionSectionComponent } from './components/call-to-action-section/call-to-action-section.component';
import { FooterSectionComponent } from './components/footer-section/footer-section.component';
import { PublicThemePreferenceService } from './services/public-theme-preference.service';
import { PublicScrollRevealDirective } from './directives/public-scroll-reveal.directive';

@NgModule({
  declarations: [
    PublicScrollRevealDirective,
    PublicLayoutComponent,
    LandingPageComponent,
    RegisterSelectionComponent,
    DonorRegistrationComponent,
    FacilityRegistrationComponent,
    VendorRegistrationComponent,
    CharityCenterRegistrationComponent,
    RegisterLocationPickerComponent,
    HeaderSectionComponent,
    HeroSectionComponent,
    TrustBarSectionComponent,
    StatsSectionComponent,
    FeaturesSectionComponent,
    HowItWorksSectionComponent,
    AboutSectionComponent,
    ServicesSectionComponent,
    ValidationSectionComponent,
    CallToActionSectionComponent,
    FooterSectionComponent,
  ],
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, PublicRoutingModule],
  providers: [PublicThemePreferenceService],
})
export class PublicModule { }
