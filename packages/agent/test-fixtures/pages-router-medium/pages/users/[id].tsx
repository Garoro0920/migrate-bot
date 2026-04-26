import type { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly id: string;
  readonly name: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { id: 'u1' } }],
  fallback: 'blocking',
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const id = String(params?.id ?? '');
  return { props: { id, name: `User ${id}` } };
};

export default function UserDetail({ id, name }: Props) {
  return (
    <Layout title={name}>
      <p>User: {id}</p>
    </Layout>
  );
}
