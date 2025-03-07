// pages/superstar-form.tsx
import React from "react";
import { Typography, Link, TableContainer, Paper, Autocomplete, TextField, Chip, Box } from "@mui/material";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import { useState, useEffect } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { colors } from "../utils/colors";
import useValidateUserToken from "hooks/useValidateUserToken";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[] | string;
}

const SuperstarFormPage: React.FC = () => {
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<SuperstarSite | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isValidUser } = useValidateUserToken();
  const [authors, setAuthors] = useState<{
    id: number;
    author_name: string;
    wp_author_id: number;
    author_avatar?: string;
  }[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState("");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await axios.get<SuperstarSite[]>("/api/superstar-sites");
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
      fetchAuthorsForSite(selectedSite.id.toString());
    }
  }, [selectedSite]);

  const fetchAuthorsForSite = async (siteId: string) => {
    if (!siteId) return;

    try {
      const response = await axios.get(`/api/superstar-authors/site?siteId=${siteId}`);
      setAuthors(response.data.authors || []);
    } catch (error) {
      console.error("Error fetching authors for site:", error);
      setAuthors([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSite || !title || !content || !clientName) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Get the WordPress author ID if an author is selected
      let authorId;
      let internalAuthorId = "";
      if (selectedAuthor) {
        const chosenAuthor = authors.find((a) => a.id.toString() === selectedAuthor);
        authorId = chosenAuthor?.wp_author_id;
        internalAuthorId = selectedAuthor;
      }

      const postContent = {
        siteId: selectedSite.id.toString(),
        title,
        content,
        tags: categories.join(", "),
        clientName,
        author: authorId, // WordPress author ID
        authorId: internalAuthorId, // Internal author ID for database
      };

      await axios.post("/api/postSuperstarContentToWordpress", postContent);
      alert("Content posted successfully!");
      
      // Redirect to submissions page
      window.location.href = "/superstar-site-submissions";
    } catch (error) {
      console.error("Error posting content:", error);
      alert("Failed to post content.");
    } finally {
      setSubmitting(false);
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

      <TableContainer component={Paper} style={{ padding: "1rem" }}>
        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo; Post
          an Article to a Superstar Site
        </Typography>

        <Autocomplete
          id="site-select"
          options={sites}
          getOptionLabel={(option) => option.domain}
          value={selectedSite}
          onChange={(_, newValue) => setSelectedSite(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Select Superstar Site" variant="outlined" fullWidth margin="normal" required />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Typography noWrap>{option.domain}</Typography>
            </li>
          )}
        />

        <TextField
          label="Client Name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          fullWidth
          margin="normal"
          required
          variant="outlined"
        />

        <Autocomplete
          multiple
          freeSolo
          options={[]}
          value={categories}
          onChange={(_, newValue) => setCategories(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="filled"
                label={option}
                {...getTagProps({ index })}
                sx={{
                  backgroundColor: colors[index % colors.length],
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: colors[index % colors.length],
                    opacity: 0.9,
                  },
                }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Categories/Tags"
              placeholder="Add categories or tags"
              fullWidth
              margin="normal"
            />
          )}
        />

        <TextField
          label="Article Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          margin="normal"
          required
          variant="outlined"
        />

        <Typography variant="subtitle1" style={{ marginTop: "16px" }}>
          Article Content
        </Typography>
        <Box sx={{ mb: 2, mt: 1 }}>
          <ReactQuill 
            value={content} 
            onChange={setContent} 
            style={{ height: "300px", marginBottom: "50px" }}
          />
        </Box>

        <Autocomplete
          id="author-select"
          options={authors}
          getOptionLabel={(option) => option.author_name}
          value={authors.find(a => a.id.toString() === selectedAuthor) || null}
          onChange={(_, newValue) => setSelectedAuthor(newValue ? newValue.id.toString() : "")}
          renderInput={(params) => (
            <TextField {...params} label="Select Author (Optional)" variant="outlined" fullWidth margin="normal" />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box display="flex" alignItems="center">
                {option.author_avatar && (
                  <Box
                    component="img"
                    src={option.author_avatar}
                    alt={option.author_name}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      marginRight: 1,
                    }}
                  />
                )}
                {option.author_name}
              </Box>
            </li>
          )}
        />

        <Box sx={{ mt: 3, mb: 2 }}>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={submitting || !selectedSite || !title || !content || !clientName}
            style={{
              padding: "10px 20px",
              backgroundColor: (!selectedSite || !title || !content || !clientName) ? "#cccccc" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: (!selectedSite || !title || !content || !clientName) ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Post to Superstar Site"}
          </button>
        </Box>
      </TableContainer>
    </LayoutContainer>
  );
};

export default SuperstarFormPage;
