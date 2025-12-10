import Link from 'next/link';

interface HeaderProps {
  actionText?: string;
  actionHref?: string;
}

export default function Header({ actionText = 'Submit Glitch', actionHref = '/submit' }: HeaderProps) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">
        <Link href="/">Glitch Hunter Library</Link>
      </h1>
      <Link href={actionHref} className="page-header__action">
        {actionText}
      </Link>
    </header>
  );
}
