import { useState, useEffect, ReactNode } from "react";
import {
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import Image from "next/image";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Link } from "@mui/material";
import { useZoomBackground } from "../hooks/useZoomBackground"; // Make sure the path is correct
import { useRouter } from "next/router";

type BackgroundStyle =
  | "goldenGate"
  | "library"
  | "arcade"
  | "techHub"
  | "manhattan"
  | "botanicalGarden"
  | "coastalOffice"
  | "vintagePrintshop"
  | "jazzLounge";

type ZoomBackgroundFormProps = {
  onSubmit: (data: {
    company: string;
    clientName: string;
    prompt: string;
  }) => void;
  isLoading: boolean;
  error?: string | null; // Added this line
};

function ZoomBackgroundForm({
  onSubmit,
  isLoading,
  error,
}: ZoomBackgroundFormProps) {
  const [company, setCompany] = useState<string>("Status Labs");
  const [clientName, setClientName] = useState<string>("");
  const [isPromptVisible, setIsPromptVisible] = useState<boolean>(false);

  const [selectedStyle, setSelectedStyle] =
    useState<BackgroundStyle>("goldenGate");
  const [prompt, setPrompt] = useState<string>("");

  const router = useRouter();
  const { query } = router;

  useEffect(() => {
    const BACKGROUND_STYLES = {
      goldenGate: {
        label: "Golden Gate Bridge",
        prompt:
          "The Golden Gate Bridge in classic morning fog. A small Art Deco-style panel (10% frame) mounted high right displays '${companyName} & ${clientName}' in streamlined 1930s lettering, fabricated from brushed steel with copper accents. The sign's metalwork echoes the bridge's industrial elegance. 10% frame, mounted high right corner.",
      },
      library: {
        label: "Classic Library",
        prompt:
          "A classic library interior with mahogany bookshelves and green reading lamps. A small illuminated brass and blue glass sign (10% frame) mounted high right corner displays '${companyName} & ${clientName}' in scholarly styling. Warm wood tones create inviting atmosphere. 10% frame, mounted high right corner.",
      },
      arcade: {
        label: "Retro Arcade",
        prompt:
          "A vibrant 80s arcade with neon lights and classic game cabinets. A retrofuturistic LED display panel (10% frame) mounted high right shows '${companyName} & ${clientName}' in pixelated neon typography. Ambient arcade game lights create dynamic atmosphere. 10% frame, mounted high right corner.",
      },
      techHub: {
        label: "Modern Tech Hub",
        prompt:
          "A sleek, modern tech workspace with holographic displays and minimal design. A floating digital display (10% frame) mounted high right shows '${companyName} & ${clientName}' in clean, modern typography. Subtle blue ambient lighting creates professional atmosphere. 10% frame, mounted high right corner.",
      },
      manhattan: {
        label: "Manhattan Skyline",
        prompt:
          "A sophisticated view of the Manhattan skyline at dusk with iconic skyscrapers and ambient city lights. A tasteful Art Deco-inspired plaque (10% frame) mounted high right displays '${companyName} & ${clientName}' in elegant gilt lettering against dark bronze. City lights create professional atmosphere. 10% frame, mounted high right corner.",
      },
      botanicalGarden: {
        label: "Botanical Garden",
        prompt:
          "An elegant indoor botanical garden with tropical plants and a glass ceiling showing blue sky. A verdant living wall frame (10% frame) mounted high right displays '${companyName} & ${clientName}' in natural, organic typography integrated with small flowering vines. Natural daylight creates fresh atmosphere. 10% frame, mounted high right corner.",
      },
      coastalOffice: {
        label: "Coastal Office",
        prompt:
          "A modern coastal office space with floor-to-ceiling windows overlooking ocean waves. A floating glass panel (10% frame) mounted high right displays '${companyName} & ${clientName}' in clean, maritime-inspired typography. Ocean light creates calming atmosphere. 10% frame, mounted high right corner.",
      },
      vintagePrintshop: {
        label: "Vintage Printshop",
        prompt:
          "A characterful vintage printshop with letterpress machines and wood type specimens. A hand-carved wooden sign (10% frame) mounted high right displays '${companyName} & ${clientName}' in traditional letterpress styling. Warm workshop lighting creates authentic atmosphere. 10% frame, mounted high right corner.",
      },
      jazzLounge: {
        label: "Jazz Lounge",
        prompt:
          "An upscale jazz lounge with rich leather seating and subtle stage lighting. A backlit art deco marquee (10% frame) mounted high right displays '${companyName} & ${clientName}' in sophisticated jazz-age typography. Ambient stage lights create intimate atmosphere. 10% frame, mounted high right corner.",
      },
    };

    if (selectedStyle) {
      setPrompt(BACKGROUND_STYLES[selectedStyle]?.prompt || "");
    }
  }, [selectedStyle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPrompt = prompt
      .replace(/\${clientName}/g, clientName)
      .replace(/\${companyName}/g, company);
    onSubmit({ company, clientName, prompt: updatedPrompt });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl component="fieldset" fullWidth>
        <FormControl fullWidth>
          <InputLabel id="company-label">Company</InputLabel>
          <Select
            labelId="company-label"
            id="company-select"
            value={company}
            label="Company"
            onChange={(e) => setCompany(e.target.value)}
            fullWidth
          >
            {["Status Labs", "BLP", "Sensei"].map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <br />
        <TextField
          fullWidth
          label="Client Name"
          margin="normal"
          required
          variant="outlined"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <br />
        <FormControl fullWidth>
          <InputLabel id="style-label">Background Style</InputLabel>
          <Select
            labelId="style-label"
            id="style-select"
            value={selectedStyle}
            label="Background Style"
            onChange={(e) =>
              setSelectedStyle(e.target.value as BackgroundStyle)
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            {Object.entries({
              goldenGate: { label: "Golden Gate Bridge" },
              library: { label: "Classic Library" },
              arcade: { label: "Retro Arcade" },
              techHub: { label: "Modern Tech Hub" },
              manhattan: { label: "Manhattan Skyline" },
              botanicalGarden: { label: "Botanical Garden" },
              coastalOffice: { label: "Coastal Office" },
              vintagePrintshop: { label: "Vintage Printshop" },
              jazzLounge: { label: "Jazz Lounge" },
            }).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <br />
        <>
          {!isPromptVisible ? (
            <Link
              component="button"
              onClick={() => setIsPromptVisible(true)}
              sx={{
                display: "flex",
                alignItems: "center",
                mt: 2,
              }}
            >
              Edit prompt (optional)
            </Link>
          ) : (
            <>
              <Link
                component="button"
                onClick={() => setIsPromptVisible(false)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <KeyboardArrowUpIcon sx={{ mr: 0.5 }} />
                Hide prompt editor
              </Link>

              <TextField
                fullWidth
                label="Prompt"
                margin="normal"
                multiline
                required
                rows={4}
                variant="outlined"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Prompt will be generated based on selected style"
              />
            </>
          )}
        </>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          sx={{ mt: 2 }}
        >
          {isLoading ? "Generating..." : "Generate Background"}
        </Button>
      </FormControl>
    </form>
  );
}

type ZoomBackgroundDisplayProps = {
  imageUrl: string;
  clientName: string;
};

function ZoomBackgroundDisplay({
  imageUrl,
  clientName,
}: ZoomBackgroundDisplayProps) {
  const [isSetting, setIsSetting] = useState(false);
  const [message, setMessage] = useState<ReactNode | null>(null);

  const { setZoomBackground } = useZoomBackground();

  const handleDownload = async () => {
    try {
      window.location.href = `/api/downloadZoomImage?imageUrl=${encodeURIComponent(
        imageUrl
      )}&clientName=${encodeURIComponent(clientName)}`;
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const redirectToZoomOAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_BASE_URL}/zoom/callback`
    ); // Note: This will be a new page, not an API route
    const scope = encodeURIComponent("user:read write:virtual_background");
    const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
    alert(authUrl);
    // Open popup
    const popup = window.open(
      authUrl,
      "Zoom OAuth",
      "width=600,height=700,left=200,top=100"
    );

    // Listen for messages from popup
    window.addEventListener(
      "message",
      async (event) => {
        if (
          event.origin === window.location.origin &&
          event.data.type === "ZOOM_AUTH_SUCCESS"
        ) {
          console.log("!!!!!!event.data", event.data);
          if (popup) popup.close();
          localStorage.setItem("zoom_access_token", event.data.accessToken);
          localStorage.setItem("zoom_refresh_token", event.data.refreshToken);

          // Retry setting the background
          handleSetZoomBackground(imageUrl);
        }
      },
      false
    );
  };

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const handleSetZoomBackground = async (imageUrl: string) => {
    setCurrentImageUrl(imageUrl); // Store current image URL
    setIsSetting(true);
    setMessage(null);

    let accessToken = localStorage.getItem("zoom_access_token");

    if (!accessToken) {
      redirectToZoomOAuth();
      setIsSetting(false);
      return false;
    }

    try {
      const success = await setZoomBackground(imageUrl);
      if (success) {
        setMessage(
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">
              Image Successfully Uploaded! To use your new background:
            </h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Quit Zoom</li>
              <li>
                <a
                  href="zoommtg://zoom.us/launch"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Relaunch Zoom
                </a>
              </li>
              <li>
                Click your profile picture → Settings → Backgrounds & Effects →
                Virtual backgrounds
              </li>
              <li>Click + and select your new background</li>
            </ol>
          </div>
        );
      } else {
        setMessage("Failed to set Zoom background.");
      }
    } catch (error) {
      console.error("Error setting Zoom background:", error);
      setMessage("An error occurred.");
    } finally {
      setIsSetting(false);
    }
  };

  return (
    <div>
      <h2>Your Generated Background</h2>
      <Image
        src={imageUrl}
        alt="Generated Zoom Background"
        width={1920}
        height={1080}
        style={{ width: "40%", height: "auto" }}
      />
      <div className="mt-4">
        <Button
          color="secondary"
          variant="contained"
          onClick={handleDownload}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Download Background
        </Button>
      </div>
      <div className="mt-4">
        <Button
          color="secondary"
          variant="contained"
          onClick={(e) => handleSetZoomBackground(imageUrl)}
          disabled={isSetting}
        >
          {isSetting ? "Setting..." : "Set as Zoom Background"}
        </Button>
        {message && (
          <>
            <p>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  // const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<
    Array<{
      imageUrl: string;
      clientName: string;
    }>
  >([]);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentClientName, setCurrentClientName] = useState<string>("");

  const handleSubmit = async ({
    company,
    clientName,
    prompt,
  }: {
    company: string;
    clientName: string;
    prompt: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generateZoomBackground", {
        method: "POST",
        body: JSON.stringify({ company, clientName, prompt }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await res.json();

      if (res.ok) {
        setBackgrounds((prev) => [
          ...prev,
          {
            imageUrl: result.imageUrl,
            clientName: clientName,
          },
        ]);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Error generating background.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Zoom Background Generator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ZoomBackgroundForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
          {error && <p className="text-red-500">{error}</p>}
        </div>
        <div className="space-y-8">
          {[...backgrounds].reverse().map((background, index) => (
            <ZoomBackgroundDisplay
              key={index}
              imageUrl={background.imageUrl}
              clientName={background.clientName}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
