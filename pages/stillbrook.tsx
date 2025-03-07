import { useState, useEffect } from "react";
import {
  TableContainer,
  Paper,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from "@mui/material";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import Image from "next/image";

interface SearchResult {
  screenshot?: string;
  error?: string;
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [screenshotType, setScreenshotType] = useState("exact_url_match");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  // Clear URL field when it's not needed
  useEffect(() => {
    if (
      !(
        screenshotType === "exact_url_match" ||
        screenshotType === "keyword_match"
      )
    ) {
      setUrl("");
    }
  }, [screenshotType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/stillbrook-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, url, location, screenshotType }),
    });

    const data = await res.json();
    setLoading(false);
    setResult(data);
  };

  const handleDownload = () => {
    if (result && result.screenshot) {
      const link = document.createElement("a");
      link.href = result.screenshot;
      link.download = "screenshot.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <LayoutContainer>
      <StyledHeader />
      <TableContainer component={Paper} style={{ padding: "0.5rem" }}>
        <div>
          <h1>Stillbrook - Screenshot Generator</h1>
          <form onSubmit={handleSubmit}>
            <div>
              <TextField
                fullWidth
                label="Keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                required
              />
            </div>
            <br />

            <FormControl component="fieldset">
              <FormLabel component="legend">Screenshot Type</FormLabel>
              <RadioGroup
                aria-label="screenshot-type"
                name="screenshotType"
                value={screenshotType}
                onChange={(e) => setScreenshotType(e.target.value)}
              >
                <FormControlLabel
                  value="exact_url_match"
                  control={<Radio />}
                  label="Exact URL Match"
                />
                <FormControlLabel
                  value="negative_sentiment"
                  control={<Radio />}
                  label="Negative Sentiment"
                />
                <FormControlLabel
                  value="keyword_match"
                  control={<Radio />}
                  label="Specific Keyword Match"
                />
              </RadioGroup>
            </FormControl>
            <br />
            {(screenshotType === "exact_url_match" ||
              screenshotType === "keyword_match") && (
              <div>
                <TextField
                  fullWidth
                  label="URL"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  variant="outlined"
                />
                <br />
              </div>
            )}

            <div>
              <br />
              <TextField
                fullWidth
                label="Geographic Location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                variant="outlined"
              />
            </div>
            <br />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? "Processing..." : "Submit"}
            </Button>
          </form>

          {result && (
            <div style={{ marginTop: "2rem" }}>
              {result.error ? (
                <p>{result.error}</p>
              ) : result.screenshot ? (
                <>
                  <Image
                    src={result.screenshot}
                    alt="Google search result"
                    width={800}
                    height={600}
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<SaveAltIcon />}
                    onClick={handleDownload}
                    style={{ marginTop: "1rem" }}
                  >
                    Download Image
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </TableContainer>
    </LayoutContainer>
  );
}
