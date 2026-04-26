import type { GetServerSideProps } from 'next';
import Layout from '../../components/Layout';

interface Product {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly products: readonly Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: {
    products: [
      { id: 'p1', name: 'Widget' },
      { id: 'p2', name: 'Gadget' },
    ],
  },
});

export default function Products({ products }: Props) {
  return (
    <Layout title="Products">
      <ul>
        {products.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </Layout>
  );
}
