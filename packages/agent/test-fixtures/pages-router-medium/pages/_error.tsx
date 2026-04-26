import type { NextPageContext } from 'next';

interface Props {
  readonly statusCode: number;
}

function ErrorPage({ statusCode }: Props) {
  return <p>An error {statusCode} occurred</p>;
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): Props => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404;
  return { statusCode };
};

export default ErrorPage;
