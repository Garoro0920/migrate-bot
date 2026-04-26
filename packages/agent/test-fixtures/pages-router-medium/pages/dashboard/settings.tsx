import type { GetServerSideProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly theme: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: { theme: 'light' },
});

export default function Settings({ theme }: Props) {
  return (
    <Layout title="Settings">
      <p>Theme: {theme}</p>
    </Layout>
  );
}
