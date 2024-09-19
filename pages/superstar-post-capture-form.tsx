// pages/pbn-form.tsx
import React from "react";
import { Typography, Link, Paper, TableContainer } from "@mui/material";
import SuperstarPostCaptureForm from "../components/SuperstarPostCaptureForm";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";

const PbnFormPage: React.FC = () => {
  return (
    <LayoutContainer>
      <StyledHeader />
      <TableContainer component={Paper} style={{ padding: "1rem" }}>
        <h1>Superstar Sites</h1>

        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo;
          Capture Superstar Article Submission
        </Typography>
        <SuperstarPostCaptureForm />
      </TableContainer>
    </LayoutContainer>
  );
};

export default PbnFormPage;
