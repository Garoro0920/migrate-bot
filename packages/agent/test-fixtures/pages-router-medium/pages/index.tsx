import Head from 'next/head';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Layout title="Home">
        <h2>Welcome</h2>
      </Layout>
    </>
  );
}
