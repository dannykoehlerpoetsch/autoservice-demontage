'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ServiceId } from '@/lib/services';
import ServiceDetailDialog from './ServiceDetailDialog';

/** Bild pro Leistung – an der ID festgemacht, nicht an der Listenposition. */
const serviceImages: Record<ServiceId, string> = {
  inspektion: '/inspektion.jpg',
  reparatur: '/reparatur.jpg',
  diagnose: '/diagnose.jpg',
  bremsen: '/bremsen.jpg',
  oelwechsel: '/oelwechsel.jpg',
  reifen: '/reifen.jpg',
  hu: '/hauptuntersuchung.jpg',
  beratung: '/beratung.jpg',
};

export type ServiceItem = {
  id: ServiceId;
  heading: string;
  service: string;
  details: string;
};

export default function Services() {
  const t = useTranslations('Services');
  const items = t.raw('items') as ServiceItem[];
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [open, setOpen] = useState(false);

  // Beim Schließen wird `selected` bewusst nicht zurückgesetzt: Radix hält den
  // Content für die Out-Animation im DOM, die Texte sollen bis zum Schluss
  // sichtbar bleiben statt kurz leer zu werden.
  const openService = (service: ServiceItem) => {
    setSelected(service);
    setOpen(true);
  };

  return (
    <article className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => (
        <button
          key={item.heading}
          type="button"
          onClick={() => openService(item)}
          className="group relative flex min-h-50 cursor-pointer items-end justify-center overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-line focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <Image
            src={serviceImages[item.id]}
            alt={item.heading}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={index === 0}
            quality={100}
          />
          <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/30" />
          <div className="relative m-4 w-3/4 rounded-xl border border-white/30 bg-white/20 p-4 text-white shadow-lg backdrop-blur-md transition-transform duration-300 ease-out origin-bottom group-hover:scale-[1.15]">
            <h3 className="mb-2 text-lg font-semibold drop-shadow-md">{item.heading}</h3>
            <p className="text-sm leading-relaxed drop-shadow">{item.service}</p>
          </div>
        </button>
      ))}

      <ServiceDetailDialog service={selected} open={open} onOpenChange={setOpen} />
    </article>
  );
}
