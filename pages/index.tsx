// pages/index.tsx

import React from 'react';
import Form from '../components/Form';
import Image from 'next/image';
const pageTitle = "PBN'J";

const Home: React.FC = () => {
  return (
    
    <div style={{ padding: 16, margin: 'auto', maxWidth: 750, background: 'rgb(250 250 250)' }}>
      <div style={{ background: '#000', padding: 3 }}>
      <style jsx global>
        {`
          h1 {
            font-family: 'Bungee Inline', sans-serif;
            font-weight: 400;
            font-size: 60px;
            margin-top: 20px;
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
