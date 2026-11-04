import { SquareCheckBig } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function USP() {
  const t = useTranslations('USP');
  const items = t.raw('items') as string[];

  return (
    <ul className="flex flex-col items-start py-4 gap-3">
      {items.map((usp, index) => (
        <li key={index} className="flex items-center gap-2">
          <SquareCheckBig size={20} className="text-green-600 shrink-0" />
          {usp}
        </li>
      ))}
    </ul>
  );
}
