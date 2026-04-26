import type { GetServerSideProps } from 'next';
import Layout from '../components/Layout';

interface Props {
  readonly query: string;
  readonly results: readonly string[];
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ query }) => {
  const q = String(query.q ?? '');
  const results = q ? [`Result 1 for "${q}"`, `Result 2 for "${q}"`] : [];
  return { props: { query: q, results } };
};

export default function Search({ query, results }: Props) {
  return (
    <Layout title="Search">
      <p>Query: {query}</p>
      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </Layout>
  );
}
