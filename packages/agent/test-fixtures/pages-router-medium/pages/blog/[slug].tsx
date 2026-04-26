import type { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '../../components/Layout';

interface Props {
  readonly slug: string;
  readonly title: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { slug: 'hello' } }, { params: { slug: 'second' } }],
  fallback: 'blocking',
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug ?? '');
  return { props: { slug, title: `Post: ${slug}` } };
};

export default function BlogPost({ slug, title }: Props) {
  return (
    <Layout title={title}>
      <h2>{title}</h2>
      <p>Slug: {slug}</p>
    </Layout>
  );
}
