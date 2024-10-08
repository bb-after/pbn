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
  Typography,
} from "@mui/material";
import LayoutContainer from "../components/LayoutContainer";
import StyledHeader from "../components/StyledHeader";
import axios from "axios";
import dynamic from "next/dynamic";
import { formatSuperstarContent } from "utils/formatSuperstarContent";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css"; // Import styles for ReactQuill
import router from "next/router";
import useValidateUserToken from "hooks/useValidateUserToken";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[] | string;
}

const HomePage = () => {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState("");
  const { isValidUser } = useValidateUserToken();

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

  useEffect(() => {
    if (selectedSite) {
      const site = sites.find((s) => s.id === Number(selectedSite));
      if (site) {
        if (Array.isArray(site.topics)) {
          setTopic(site.topics.join(" "));
        } else if (typeof site.topics === "string") {
          setTopic(site.topics);
        } else {
          setTopic("");
        }
      }
    }
  }, [selectedSite, sites]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const topics = topic.split(",");
    const formattedTopics = topics.map((t) => encodeURIComponent(t)).join(",");
    const siteId = selectedSite;
    try {
      const response = await axios.get(
        `/api/generateContent?topic=${encodeURIComponent(
          formattedTopics
        )}&siteId=` + siteId
      );
      const { title, body, topic } = response.data;
      setTitle(title);
      setContent(body);
      setEditableContent(body);
      setLoading(false);
      setTags(topic);
    } catch (error: any) {
      console.error("Error generating content:", error);
      alert("There was an error generating content:" + error.message);
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
      router.push("/superstar-site-submissions");
    } catch (error) {
      console.error("Error posting content:", error);
      alert("Failed to post content.");
    }
  };

  if (!isValidUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h6">
          Unauthorized access. Please log in.
        </Typography>
      </Box>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <h1>Superstar Generator</h1>
      <FormControl fullWidth variant="outlined" margin="normal">
        <InputLabel id="site-select-label">Select Site</InputLabel>
        <Select
          labelId="site-select-label"
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value as string)}
          label="Select Site"
        >
          {sites.map((site) => (
            <MenuItem key={site.id} value={site.id.toString()}>
              {site.domain}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        variant="outlined"
        fullWidth
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Categories"
        margin="normal"
        label="Categories"
      />

      <form onSubmit={handleSubmit}>
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
            <InputLabel htmlFor="tags">Tags</InputLabel>
            <OutlinedInput
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value.split(", "))}
              placeholder="Enter tags separated by commas"
              label="Tags"
            />
          </FormControl>
        </div>
      )}
      <Button
        variant="contained"
        color="secondary"
        onClick={handlePost}
        disabled={!selectedSite || !title || !editableContent}
        style={{ marginTop: "16px" }}
      >
        Post to WordPress
      </Button>
    </LayoutContainer>
  );
};

export default HomePage;
