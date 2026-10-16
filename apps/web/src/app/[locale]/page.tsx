import { ContactSection } from '@/features/contact/contact-section';
import { FeaturedCategories } from '@/features/landing/featured-categories';
import { FinalCta } from '@/features/landing/final-cta';
import { Hero } from '@/features/landing/hero';
import { Location } from '@/features/landing/location';
import { Services } from '@/features/landing/services';
import { BusinessJsonLd } from '@/shared/ui/business-json-ld';
import { SectionEntrances } from '@/shared/ui/section-entrances';

/** One-page landing (Phase 1). Testimonials return once the business has Google reviews. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <FeaturedCategories />
      <Location />
      <ContactSection />
      <FinalCta />
      <BusinessJsonLd />
      <SectionEntrances />
    </>
  );
}
