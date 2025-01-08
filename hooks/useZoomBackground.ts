// hooks/useZoomBackground.ts
import { useState } from "react";

export const useZoomBackground = () => {
  const [isSetting, setIsSetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const setZoomBackground = async (imageUrl: string): Promise<boolean> => {
    setIsSetting(true);
    setMessage(null);

    // Retrieve the access token from localStorage (or sessionStorage)
    const accessToken = localStorage.getItem("zoom_access_token");
    const refreshToken = localStorage.getItem("zoom_refresh_token");

    console.log('!!!!!!accessToken', accessToken);
    if (!accessToken) {
      setMessage("Access token is missing. Please authenticate again.");
      setIsSetting(false);
      return false;
    }

    try {
      const res = await fetch("/api/zoom/setZoomBackground", {
        method: "POST",
        body: JSON.stringify({ imageUrl, accessToken, refreshToken }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`, // Send the access token in the Authorization header
        },
      });

      const result = await res.json();
      if (res.ok) {
        setMessage("Successfully set as Zoom background!");
        if (result.newTokens) {
            localStorage.setItem("zoom_access_token", result.newTokens.accessToken);
            localStorage.setItem("zoom_refresh_token", result.newTokens.refreshToken);
          }
        
        return true;
      } else {
        setMessage(result.error || "Failed to set Zoom background.");
        return false;
      }
    } catch (error) {
      setMessage("An error occurred.");
      return false;
    } finally {
      setIsSetting(false);
    }
  };

  return { setZoomBackground, isSetting, message };
};
