import React, { useEffect, useState } from 'react';
import Form from '../components/Form';
import Image from 'next/image';
import { useRouter } from 'next/router';

const pageTitle = "PBN'J";

const Home: React.FC = () => {
  const [hasToken, setHasToken] = useState<boolean>(true); // assume token is there initially
  const router = useRouter(); // Use Next.js's router

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');

    if (!token) {
      setHasToken(false);
      const timerId = setTimeout(() => {
        router.push('https://sales.statuscrawl.io/home');
      }, 3000);

      return () => clearTimeout(timerId); // Clear timeout if component is unmounted
    }
  }, [router]);

  if (!hasToken) {
    return (
      <div style={{ paddingTop: '15rem', fontSize: '2rem', textAlign: 'center', color: 'tomato' }}>
        No User token (or invalid token) found!<br /><br />
        You will be redirected to the <a target="_blank" href="https://sales.statuscrawl.io/home">Sales Portal</a> momentarily.<br /><br />Please log in to the Sales Portal and try again.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, margin: 'auto', maxWidth: 750, background: '#ffffff' }}>
      <div style={{ background: '#000', padding: 3 }}>
      <style jsx global>
        {`
          h1 {
            font-family: 'Bungee Inline', sans-serif;
            font-weight: 400;
            font-size: 60px;
            margin-top: 20px;
          }
          body {
            background: #eee;
          }
        `}
      </style>
      <Image
        priority
        src="/images/sl-logo.png"
        width={720}
        height={80}	
        style={{ objectFit: 'contain' }}
        alt=""
      />


      </div>
      
      <div style={{ paddingTop: 20, display: 'flex' }}>

        <Image
        priority
        src="/images/pbnj.png"
        height={110}
        width={110}
        style={{ marginRight: 30 }}
        alt=""
      />

        <h1>{`${pageTitle}`}</h1>
      </div>
      
      <Form />
    </div>
  );
};

export default Home;
