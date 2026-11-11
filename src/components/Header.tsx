'use client';

import Image from 'next/image';
import { useState, useEffect, type MouseEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const t = useTranslations('Header');
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const navLinks = [
    { href: '/', hash: null, label: t('navHome') },
    { href: '/#services', hash: '#services', label: t('navServices') },
    { href: '/#demo', hash: '#demo', label: t('navDemo') },
  ];

  const scrollToHash = (hash: string | null) => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (hash: string | null) => (e: MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      scrollToHash(hash);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (menuRef.current?.contains(target) || toggleRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress, true);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (pathname === '/' && window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [pathname]);

  return (
    <header className="header-bg text-white sticky top-0 z-50 h-3/4 overflow-x-clip">
      <div className="relative">
        <div className="flex items-center justify-between">
          <Link href="/#home" aria-label={t('homeAriaLabel')} onClick={handleNavClick('#home')}>
            {/*
             * width/height sind die echten Bildmaße der Datei (2172×724 = exakt 3:1), damit
             * der Browser das Seitenverhältnis vor dem Laden reservieren kann – verzerrt wird
             * dadurch nichts, egal welche Klasse die Größe setzt. `sizes` begrenzt die
             * ausgelieferte Variante auf die tatsächliche Breite (w-40 = 10rem, md:w-56 =
             * 14rem, bis zu 18 px Grundschrift = 180 px bzw. 252 px).
             */}
            <Image
              src="/Headerlogo.png"
              alt={t('logoAlt')}
              width={2172}
              height={724}
              sizes="(min-width: 768px) 252px, 180px"
              className="h-auto w-40 md:w-56"
              priority
            />
          </Link>
          <button
            type="button"
            ref={toggleRef}
            /*
             * Das Minus am Rand rückt das Symbol bündig nach rechts, genau wie das Logo links
             * bündig steht. Die Polsterung bleibt als Trefferfläche erhalten – ohne das
             * `overflow-x-clip` am `header` würde dasselbe Minus die Seite auf schmalen
             * Viewports um diese Breite über den Viewport hinaus schieben.
             */
            className="md:hidden p-2 -mr-2 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? t('menuClose') : t('menuOpen')}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <nav className="hidden md:flex items-center gap-6">
            <ul className="flex gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:underline"
                    onClick={handleNavClick(link.hash)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <LanguageSwitcher />
            <ThemeToggle />
          </nav>
        </div>
        {isOpen && (
          <nav
            ref={menuRef}
            className="md:hidden absolute top-full left-0 right-0 header-bg z-50 px-4 py-4 rounded-b-lg shadow-lg"
          >
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block py-2 px-3 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg"
                    onClick={(e) => {
                      handleNavClick(link.hash)(e);
                      setIsOpen(false);
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="px-3 pt-2 flex items-center justify-between">
                <LanguageSwitcher />
                <ThemeToggle />
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
