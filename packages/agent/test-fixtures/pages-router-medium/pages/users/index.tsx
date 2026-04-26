import type { GetServerSideProps } from 'next';
import Layout from '../../components/Layout';

interface User {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly users: readonly User[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: {
    users: [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ],
  },
});

export default function Users({ users }: Props) {
  return (
    <Layout title="Users">
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </Layout>
  );
}
