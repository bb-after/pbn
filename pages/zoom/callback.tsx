// pages/zoom-callback.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ZoomCallback() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    async function handleCallback() {
      if (code) {
        try {
          const response = await fetch(`/api/zoom/callback?code=${code}`);
          debugger;
          const data = await response.json();

          if (data.access_token) {
            // Send message to parent window
            window.opener.postMessage(
              {
                type: "ZOOM_AUTH_SUCCESS",
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
              },
              window.location.origin
            );
          }
        } catch (error) {
          console.error("Error in OAuth callback:", error);
        }
      }
    }

    handleCallback();
  }, [code]);

  return (
    <div className="p-4">
      <p>Authenticating with Zoom...</p>
    </div>
  );
}
