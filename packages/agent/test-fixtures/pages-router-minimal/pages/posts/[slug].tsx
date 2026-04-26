import type { GetStaticPaths, GetStaticProps } from 'next';

interface Props {
  slug: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  return { props: { slug: String(params?.slug ?? '') } };
};

export default function Post({ slug }: Props) {
  return <article>{slug}</article>;
}
