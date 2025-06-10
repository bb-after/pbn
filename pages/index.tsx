import React, { useEffect, useState } from 'react';
import Form from '../components/Form';
import Image from 'next/image';
import { useRouter } from 'next/router';
import LayoutContainer from 'components/LayoutContainer';
import StyledHeader from 'components/StyledHeader';
import { Paper, TableContainer } from '@mui/material';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

const pageTitle = "PBN'J";

const Home: React.FC = () => {
  const [hasToken, setHasToken] = useState<boolean>(true); // assume token is there initially
  const router = useRouter(); // Use Next.js's router
  const { token } = useValidateUserToken();

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <LayoutContainer>
      <StyledHeader />

      <TableContainer component={Paper}>
        <div
          style={{
            padding: '1rem 0 0 1rem',
          }}
        >
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
      </TableContainer>
    </LayoutContainer>
  );
};

export default Home;
