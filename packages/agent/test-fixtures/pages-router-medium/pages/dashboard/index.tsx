import type { GetServerSideProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly user: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: { user: 'demo' },
});

export default function Dashboard({ user }: Props) {
  return (
    <Layout title="Dashboard">
      <p>Hello {user}</p>
    </Layout>
  );
}
