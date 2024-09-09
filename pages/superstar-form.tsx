// pages/superstar-form.tsx
import React from "react";
import SuperstarSubmissionForm from "../components/SuperstarSubmissionForm"; // Adjust the import path
import { EditorState } from "draft-js";
import { Typography, Link } from "@mui/material";

const SuperstarFormPage: React.FC = () => {
  const initialArticleTitle = "";
  const initialEditorState = EditorState.createEmpty();

  return (
    <div>
      <style jsx global>
        {`
          body {
            background: #eee;
          }
        `}
      </style>

      <div
        style={{
          padding: "2rem",
          borderRadius: "3px",
          margin: "2rem",
          background: "#fff",
        }}
      >
        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link>
          &raquo; Post an Article to the Superstar Network
        </Typography>
        <SuperstarSubmissionForm
          articleTitle={initialArticleTitle}
          superstarModalEditorState={initialEditorState}
          onSubmit={(title, content, tags) => {
            console.log("Submitted:", title, content, tags);
          }}
        />
      </div>
    </div>
  );
};

export default SuperstarFormPage;
