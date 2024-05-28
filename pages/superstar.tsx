import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
  Box,
} from "@mui/material";
import LayoutContainer from "../components/LayoutContainer";
import StyledHeader from "../components/StyledHeader";
import axios from "axios";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css"; // Import styles for ReactQuill

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[];
}

const HomePage = () => {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState("");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await axios.get<SuperstarSite[]>(
          "/api/superstar-sites"
        );
        const parsedData = response.data.map((site) => ({
          ...site,
        }));
        setSites(parsedData);
      } catch (error) {
        console.error("Error fetching sites:", error);
      }
    };

    fetchSites();
  }, []);

  const processContent = (content: string) => {
    // Remove "Title" keyword if it is the first word and set it as title
    if (content.startsWith("Title")) {
      const parts = content.split("\n");
      setTitle(parts[0].replace("Title: ", "").trim());
      content = parts.slice(1).join("\n");
    }

    // Replace [text](url) with <a href="url">text</a>
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2">$1</a>'
    );

    return content;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.get(
        `/api/generateContent?topic=${encodeURIComponent(topic)}`
      );
      const processedContent = processContent(response.data.content);
      setContent(processedContent);
      setEditableContent(processedContent);
      setLoading(false);
    } catch (error) {
      console.error("Error generating content:", error);
      setLoading(false);
    }
  };

  const handlePost = async () => {
    try {
      const postContent = {
        siteId: selectedSite,
        title,
        content: editableContent,
        tags: tags.join(", "),
        author,
      };
      await axios.post("/api/postSuperstarContentToWordpress", postContent);
      alert("Content posted successfully!");
    } catch (error) {
      console.error("Error posting content:", error);
      alert("Failed to post content.");
    }
  };

  return (
    <LayoutContainer>
      <StyledHeader />
      <h1>Superstar Generator</h1>
      <form onSubmit={handleSubmit}>
        <TextField
          variant="outlined"
          fullWidth
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic"
          margin="normal"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          style={{ marginTop: "16px" }}
        >
          {loading ? <CircularProgress size={24} /> : "Generate Content"}
        </Button>
      </form>
      {content && (
        <div style={{ marginTop: "16px" }}>
          <TextField
            variant="outlined"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title"
            margin="normal"
            label="Title"
          />
          <ReactQuill value={editableContent} onChange={setEditableContent} />
          <FormControl fullWidth variant="outlined" margin="normal">
            <InputLabel id="site-select-label">Select Site</InputLabel>
            <Select
              labelId="site-select-label"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              label="Select Site"
            >
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.domain}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" margin="normal">
            <InputLabel htmlFor="tags">Tags</InputLabel>
            <OutlinedInput
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value.split(", "))}
              placeholder="Enter tags separated by commas"
              label="Tags"
            />
          </FormControl>
          <TextField
            variant="outlined"
            fullWidth
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter author name"
            margin="normal"
            label="Author"
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handlePost}
            style={{ marginTop: "16px" }}
          >
            Post to WordPress
          </Button>
        </div>
      )}
    </LayoutContainer>
  );
};

export default HomePage;
