import { ReactNode } from 'react';

type SectionHeadingProps = {
  children: ReactNode;
};

export default function SectionHeading({ children }: SectionHeadingProps) {
  return <h2 className="text-2xl font-bold mb-4 text-center">{children}</h2>;
}
