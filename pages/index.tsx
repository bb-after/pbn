// pages/index.tsx

import React, { useEffect, useState } from 'react';
import Form from '../components/Form';
import Image from 'next/image';



const pageTitle = "Status AI";

const Home: React.FC = () => {
  const [hasToken, setHasToken] = useState<boolean>(true); // assume token is there initially
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setHasToken(false);
    }
  }, []);

  if (!hasToken) {
    // Option 1: Redirect to another page
    // return <Redirect to="/error" />;

    // Option 2: Display an error message
    return   <div style={{ paddingTop: '15rem', fontSize: '2rem', textAlign: 'center', color: 'tomato' }}>
      No User token (or invalid token) found! Please log in to the Sales Portal and try again.
      </div>;
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
