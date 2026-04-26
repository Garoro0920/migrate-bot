import Head from 'next/head';
import Layout from '../components/Layout';

export default function About() {
  return (
    <>
      <Head>
        <title>About</title>
      </Head>
      <Layout title="About">
        <p>About this site.</p>
      </Layout>
    </>
  );
}
