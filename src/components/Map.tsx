'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, ArrowRight } from 'lucide-react';

const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4126.012073000825!2d12.330477077539506!3d51.32699782386531!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a6f7754a0e548f%3A0x622c46d1478588c4!2sNaumburger%20Str.%2010%2C%2004229%20Plagwitz!5e1!3m2!1sde!2sde!4v1785500238067!5m2!1sde!2sde" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin';

export default function Map() {
  const t = useTranslations('Map');
  const [consented, setConsented] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  useEffect(() => {
    if (!consented && iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
  }, [consented]);

  return (
    <div className="w-full">
      <div className="flex items-start gap-3 mb-4">
        <MapPin size={24} className="text-brand shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-lg mb-1">{t('heading')}</h3>
          <p>
            {t('paragraph1')}
            <br />
            {t('paragraph2')}
          </p>
          <small className="text-gray-500 dark:text-gray-400">{t('note')}</small>
        </div>
      </div>

      {consented ? (
        <>
          <div className="relative w-full h-[50vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe
              ref={iframeRef}
              src={MAP_EMBED_URL}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={t('iframeTitle')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <a
              href="https://www.google.com/maps/dir//Naumburger+Stra%C3%9Fe+10,+04229+Leipzig"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm underline hover:text-brand"
            >
              <ArrowRight size={16} />
              {t('planRouteOnGoogle')}
            </a>
            <span className="text-sm text-gray-500 dark:text-gray-400">|</span>
            <button
              type="button"
              onClick={() => setConsented(false)}
              className="text-sm underline hover:text-brand cursor-pointer"
            >
              {t('hideMap')}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConsented(true)}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer"
        >
          <ArrowRight size={16} />
          {t('planRoute')}
        </button>
      )}
    </div>
  );
}
