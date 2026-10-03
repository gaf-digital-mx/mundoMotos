import { ContactSection } from '@/features/contact/contact-section';
import { FeaturedCarousel } from '@/features/landing/featured-carousel';
import { FinalCta } from '@/features/landing/final-cta';
import { Hero } from '@/features/landing/hero';
import { Location } from '@/features/landing/location';
import { Services } from '@/features/landing/services';
import { ValueProp } from '@/features/landing/value-prop';
import { BusinessJsonLd } from '@/shared/ui/business-json-ld';

/** One-page landing (Phase 1). Testimonials return once the business has Google reviews. */
export default function HomePage() {
  return (
    <>
      {/* TEMPORARY A/B: the client picks one hero; the other is removed before merge. */}
      <Hero variant="a" />
      <Hero variant="b" />
      <ValueProp />
      <Services />
      <FeaturedCarousel />
      <Location />
      <ContactSection />
      <FinalCta />
      <BusinessJsonLd />
    </>
  );
}
