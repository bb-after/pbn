import React, { useEffect, useState } from "react";
import Form from "../components/Form";
import Image from "next/image";
import { useRouter } from "next/router";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import { Paper, TableContainer } from "@mui/material";
import useValidateUserToken from "hooks/useValidateUserToken";

const pageTitle = "PBN'J";

const Home: React.FC = () => {
  const [hasToken, setHasToken] = useState<boolean>(true); // assume token is there initially
  const router = useRouter(); // Use Next.js's router
  const { token } = useValidateUserToken();

  if (!token) {
    return (
      <div
        style={{
          paddingTop: "15rem",
          fontSize: "2rem",
          textAlign: "center",
          color: "tomato",
        }}
      >
        No User token (or invalid token) found!
        <br />
        <br />
        You will be redirected to the{" "}
        <a target="_blank" href="https://sales.statuscrawl.io/home">
          Sales Portal
        </a>{" "}
        momentarily.
        <br />
        <br />
        Please log in to the Sales Portal and try again.
      </div>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />

      <TableContainer component={Paper}>
        <div
          style={{
            padding: "1rem 0 0 1rem",
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
