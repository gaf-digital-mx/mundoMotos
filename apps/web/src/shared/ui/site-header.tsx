import { useTranslations } from 'next-intl';

import logo from '@/assets/brand/generated/logo-96.webp';
import { Link } from '@/i18n/navigation';
import { business } from '@/shared/config/business';

import { WhatsappButton } from './whatsapp-button';

/** In-page anchors to landing sections; absolute so they also work from other pages. */
const NAV = [
  { href: '/#servicios', key: 'services' },
  { href: '/#refacciones', key: 'featured' },
  { href: '/#ubicacion', key: 'location' },
  { href: '/#contacto', key: 'contact' },
] as const;

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="mx-auto flex max-w-(--container-page) items-center justify-between gap-18 px-4 py-18 md:px-24">
      <Link href="/" className="flex items-center gap-12">
        {/* Native img: assets are pre-optimized (no runtime optimizer in a static export). */}
        <img
          src={logo.src}
          alt=""
          width={48}
          height={46}
          fetchPriority="high"
          className="size-[48px]"
        />
        <span className="flex flex-col leading-none whitespace-nowrap">
          <span className="text-[20px] font-semibold tracking-tight text-ignition-gold md:text-heading-2xs">
            {business.name}
          </span>
          <span className="hidden text-caption tracking-label text-silver-mist uppercase sm:block">
            {t('header.tagline')}
          </span>
        </span>
      </Link>
      <nav aria-label={t('nav.label')} className="hidden lg:block">
        <ul className="flex gap-30">
          {NAV.map(({ href, key }) => (
            <li key={href}>
              <a
                href={href}
                className="text-nav-label font-semibold tracking-label text-ash-gray uppercase hover:text-bone-white"
              >
                {t(`nav.${key}`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <WhatsappButton
        source="header"
        message={t('common.whatsappGreeting')}
        label={t('common.whatsappShort')}
        compactOnMobile
        newTabHint={t('common.opensInNewTab')}
      />
    </header>
  );
}
