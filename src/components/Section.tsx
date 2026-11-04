import { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  id?: string;
};

export default function Section({ children, id }: SectionProps) {
  return (
    <section className="flex flex-col items-start md:px-4 py-4 mx-auto md:mt-10" id={id}>
      {children}
    </section>
  );
}
