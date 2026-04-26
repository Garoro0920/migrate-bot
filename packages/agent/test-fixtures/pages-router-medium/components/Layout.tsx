import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface Props {
  readonly children: ReactNode;
  readonly title?: string;
}

export default function Layout({ children, title }: Props) {
  return (
    <>
      <Header title={title} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
