// pages/pbn-form.tsx
import React from "react";
import PbnSubmissionForm from "../components/PbnSubmissionForm"; // Adjust the import path
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { Typography, Link, TableContainer, Paper } from "@mui/material";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";

const PbnFormPage: React.FC = () => {
  // Define any initial values for the props if needed
  const initialArticleTitle = "";
  const content = "";
  const initialEditorState = EditorState.createEmpty();

  return (
    <LayoutContainer>
      <StyledHeader />

      <TableContainer component={Paper} style={{ padding: "1rem" }}>
        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo; Post
          an Article to the PBN
        </Typography>
        <PbnSubmissionForm
          articleTitle={initialArticleTitle}
          content={content}
          onSubmit={function (title: string, content: string): void {
            throw new Error("Function not implemented.");
          }}
        />
      </TableContainer>
    </LayoutContainer>
  );
};

export default PbnFormPage;
