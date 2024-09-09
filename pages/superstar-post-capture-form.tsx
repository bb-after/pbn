// pages/pbn-form.tsx
import React from "react";
import { Typography, Link } from "@mui/material";
import SuperstarPostCaptureForm from "../components/SuperstarPostCaptureForm";

const PbnFormPage: React.FC = () => {
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
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo;
          Capture Superstar Article Submission
        </Typography>
        <SuperstarPostCaptureForm />
      </div>
    </div>
  );
};

export default PbnFormPage;
