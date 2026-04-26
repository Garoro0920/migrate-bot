import type { GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Post {
  readonly slug: string;
  readonly title: string;
}

interface Props {
  readonly posts: readonly Post[];
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const posts: Post[] = [
    { slug: 'hello', title: 'Hello world' },
    { slug: 'second', title: 'Second post' },
  ];
  return { props: { posts } };
};

export default function BlogIndex({ posts }: Props) {
  return (
    <Layout title="Blog">
      <ul>
        {posts.map((p) => (
          <li key={p.slug}>{p.title}</li>
        ))}
      </ul>
    </Layout>
  );
}
