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

  const processContent = (content: string, seoTitle: string) => {
    // Remove leading and trailing quotes from seoTitle
    let cleanedTitle = seoTitle.replace(/^"|"$/g, "").trim();

    // Handle multiple title suggestions
    if (/^\d+\.\s*".*"$/.test(seoTitle)) {
      const titles = seoTitle.match(/\d+\.\s*"([^"]+)"/g);
      if (titles && titles.length > 0) {
        cleanedTitle = titles[0].replace(/^\d+\.\s*"|"$/g, "").trim();
      }
    }

    // Function to add line breaks within the article every 3-5 sentences
    const addParagraphs = (text: string) => {
      const sentences = text.split(". ");
      let paragraph = "";
      let formattedText = "";

      for (let i = 0; i < sentences.length; i++) {
        paragraph += sentences[i] + (i < sentences.length - 1 ? ". " : "");
        if ((i + 1) % 3 === 0 || i === sentences.length - 1) {
          // Approx every 3-5 sentences
          formattedText += `<p></p><p>${paragraph}</p>`;
          paragraph = "";
        }
      }

      return formattedText.trim();
    };

    // Remove "Title" keyword if it is the first word and set it as title
    if (content.startsWith("Title")) {
      const parts = content.split("\n");
      content = parts.slice(1).join("\n");
    }

    // Replace [text](url) with <a href="$2">$1</a>
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2">$1</a>'
    );

    // Add paragraphs
    content = addParagraphs(content);

    return { content, title: cleanedTitle };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const formattedTopic = topic.replace(/,/g, " ");
    try {
      const response = await axios.get(
        `/api/generateContent?topic=${encodeURIComponent(formattedTopic)}`
      );
      const { title, body } = response.data;
      const processedContent = processContent(body, title);
      setTitle(processedContent.title);
      setContent(processedContent.content);
      setEditableContent(processedContent.content);
      setLoading(false);
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
    } catch (error) {
      console.error("Error posting content:", error);
      alert("Failed to post content.");
    }
  };

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
