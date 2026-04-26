import type { GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly categories: readonly string[];
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { categories: ['Tech', 'Travel', 'Food'] },
});

export default function CategoriesIndex({ categories }: Props) {
  return (
    <Layout title="Categories">
      <ul>
        {categories.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </Layout>
  );
}
