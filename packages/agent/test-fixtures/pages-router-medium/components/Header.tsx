import Link from 'next/link';

interface Props {
  readonly title?: string;
}

export default function Header({ title }: Props) {
  return (
    <header>
      <h1>{title ?? 'Site'}</h1>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/blog">Blog</Link>
      </nav>
    </header>
  );
}
