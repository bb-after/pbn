"use client";
import { useState } from "react";
import ZoomBackgroundForm from "components/ZoomBackgroundForm";
import { ZoomBackgroundDisplay } from "components/ZoomBackgroundDisplay";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const imageUrl = await generateZoomBackground(formData);
      setBackgroundUrl(imageUrl);
    } catch (err) {
      setError("Failed to generate background. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LayoutContainer>
      <StyledHeader />
      <ZoomBackgroundForm />
      {backgroundUrl && <ZoomBackgroundDisplay imageUrl={backgroundUrl} />}
    </LayoutContainer>
  );
}
