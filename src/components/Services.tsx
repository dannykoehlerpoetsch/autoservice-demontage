import Image from 'next/image';
import { useTranslations } from 'next-intl';

const serviceImages = [
  '/inspektion.jpg',
  '/reparatur.jpg',
  '/diagnose.jpg',
  '/bremsen.jpg',
  '/oelwechsel.jpg',
  '/reifen.jpg',
  '/hauptuntersuchung.jpg',
  '/beratung.jpg',
];

type ServiceItem = { heading: string; service: string };

export default function Services() {
  const t = useTranslations('Services');
  const items = t.raw('items') as ServiceItem[];

  return (
    <article className="grid gap-4 md:grid-cols-2">
      {items.map(({ heading, service }, index) => (
        <div
          key={heading}
          className="relative rounded-lg overflow-hidden min-h-50 flex items-end justify-center"
        >
          <Image
            src={serviceImages[index]}
            alt={heading}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={index === 0}
            quality={100}
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative m-4 p-4 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg text-white w-3/4 transition-transform duration-300 ease-out hover:scale-[1.15] origin-bottom cursor-default">
            <h3 className="text-lg font-semibold mb-2 drop-shadow-md">{heading}</h3>
            <p className="text-sm leading-relaxed drop-shadow">{service}</p>
          </div>
        </div>
      ))}
    </article>
  );
}
