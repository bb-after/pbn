import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import Image from "next/image";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Link, Box } from "@mui/material";

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
          "A sophisticated view of the Manhattan skyline at dusk with iconic skyscrapers and ambient city lights. A tasteful Art Deco-inspired plaque (10% frame) mounted high right displays '${companyName} & ${clientName}' in elegant gilt lettering against dark bronze. City lights create professional atmosphere. 10% frame, mounted high right corner. we want a 16:9 image.",
      },
      botanicalGarden: {
        label: "Botanical Garden",
        prompt:
          "An elegant indoor botanical garden with tropical plants and a glass ceiling showing blue sky. A verdant living wall frame (10% frame) mounted high right displays '${companyName} & ${clientName}' in natural, organic typography integrated with small flowering vines. Natural daylight creates fresh atmosphere. 10% frame, mounted high right corner. we want a 16:9 image.",
      },
      coastalOffice: {
        label: "Coastal Office",
        prompt:
          "A modern coastal office space with floor-to-ceiling windows overlooking ocean waves. A floating glass panel (10% frame) mounted high right displays '${companyName} & ${clientName}' in clean, maritime-inspired typography. Ocean light creates calming atmosphere. 10% frame, mounted high right corner. we want a 16:9 image.",
      },
      vintagePrintshop: {
        label: "Vintage Printshop",
        prompt:
          "A characterful vintage printshop with letterpress machines and wood type specimens. A hand-carved wooden sign (10% frame) mounted high right displays '${companyName} & ${clientName}' in traditional letterpress styling. Warm workshop lighting creates authentic atmosphere. 10% frame, mounted high right corner. we want a 16:9 image.",
      },
      jazzLounge: {
        label: "Jazz Lounge",
        prompt:
          "An upscale jazz lounge with rich leather seating and subtle stage lighting. A backlit art deco marquee (10% frame) mounted high right displays '${companyName} & ${clientName}' in sophisticated jazz-age typography. Ambient stage lights create intimate atmosphere. 10% frame, mounted high right corner. we want a 16:9 image.",
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
  const handleDownload = async () => {
    try {
      window.location.href = `/api/downloadZoomImage?imageUrl=${encodeURIComponent(
        imageUrl
      )}&clientName=${encodeURIComponent(clientName)}`;
    } catch (error) {
      console.error("Download failed:", error);
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
        style={{ width: "20%", height: "auto" }}
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
    </div>
  );
}

export default function Home() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
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
    setCurrentClientName(clientName); // Store the client name when submitting

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
        setBackgroundUrl(result.imageUrl);
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
        <ZoomBackgroundForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
        {error && <p className="text-red-500">{error}</p>}
        {backgroundUrl && (
          <ZoomBackgroundDisplay
            imageUrl={backgroundUrl}
            clientName={currentClientName}
          />
        )}
      </div>
    </main>
  );
}
