import type { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly id: string;
  readonly name: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { id: 'p1' } }],
  fallback: 'blocking',
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const id = String(params?.id ?? '');
  return { props: { id, name: `Product ${id}` } };
};

export default function ProductDetail({ id, name }: Props) {
  return (
    <Layout title={name}>
      <p>Product id: {id}</p>
    </Layout>
  );
}
