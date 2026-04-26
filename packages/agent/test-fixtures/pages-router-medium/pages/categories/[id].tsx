import type { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly id: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: 'blocking',
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => ({
  props: { id: String(params?.id ?? '') },
});

export default function Category({ id }: Props) {
  return (
    <Layout title={`Category ${id}`}>
      <p>Category page for {id}</p>
    </Layout>
  );
}
