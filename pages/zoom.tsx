"use client";
import { useState, useEffect } from "react";
import ZoomBackgroundForm from "components/ZoomBackgroundForm";
import { ZoomBackgroundDisplay } from "components/ZoomBackgroundDisplay";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import useValidateUserToken from "hooks/useValidateUserToken";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export async function generateZoomBackground(
  formData: FormData
): Promise<string> {
  const response = await fetch("/api/generateZoomBackground", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: formData.get("company"),
      clientName: formData.get("clientName"),
      prompt: formData.get("prompt"),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate background");
  }

  const data = await response.json();
  return data.imageUrl;
}

export default function Home() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const { token, isLoading } = useValidateUserToken();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        width="100%"
        height="100%"
        bgcolor="rgba(0, 0, 0, 0.7)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        zIndex={9999}
      >
        <Box
          bgcolor="white"
          padding="20px"
          borderRadius="8px"
          textAlign="center"
          boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
        >
          <Typography variant="h6" gutterBottom>
            User token not found
          </Typography>
          <Typography variant="body1">
            Please re-log in via{" "}
            <a href="https://sales.statuscrawl.io" style={{ color: "blue" }}>
              sales.statuscrawl.io
            </a>{" "}
            and try again.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <ZoomBackgroundForm />
      {backgroundUrl && <ZoomBackgroundDisplay imageUrl={backgroundUrl} />}
    </LayoutContainer>
  );
}
