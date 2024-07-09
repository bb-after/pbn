import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { Typography, TextField, Button, Container, Box } from "@mui/material";
import Autocomplete from "@mui/lab/Autocomplete";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[];
  login: string;
  hosting_site_password: string;
  application_password: string;
}

const EditTopics: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [site, setSite] = useState<SuperstarSite | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [wpUsername, setWpUsername] = useState<string>("");
  const [wpPassword, setWpPassword] = useState<string>("");
  const [wpAppPassword, setWpAppPassword] = useState<string>("");

  useEffect(() => {
    if (id) {
      const fetchSite = async () => {
        try {
          const response = await axios.get<SuperstarSite>(
            `/api/superstar-sites/${id}`
          );
          const siteData = response.data;
          setSite(siteData);
          setTopics(siteData.topics);
          setWpUsername(siteData.login || "");
          setWpPassword(siteData.hosting_site_password || "");
          setWpAppPassword(siteData.application_password || "");
        } catch (error) {
          console.error("Error fetching site:", error);
        }
      };

      fetchSite();
    }
  }, [id]);

  const handleSave = async () => {
    try {
      await axios.put(`/api/superstar-sites/${id}`, {
        topics,
        wpUsername,
        wpPassword,
        wpAppPassword,
      });
      router.push("/superstar-sites");
    } catch (error) {
      console.error("Error saving topics:", error);
    }
  };

  return (
    <Container>
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          Edit Site: {site?.domain}
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          options={[]}
          value={topics}
          onChange={(event, newValue) => setTopics(newValue as string[])}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Topics"
              placeholder="Add topics"
            />
          )}
        />
        <TextField
          variant="outlined"
          label="WordPress Username"
          fullWidth
          margin="normal"
          value={wpUsername}
          onChange={(e) => setWpUsername(e.target.value)}
        />
        <TextField
          variant="outlined"
          label="WordPress Password"
          type="password"
          fullWidth
          margin="normal"
          value={wpPassword}
          onChange={(e) => setWpPassword(e.target.value)}
        />
        <TextField
          variant="outlined"
          label="WordPress Application Password"
          type="password"
          fullWidth
          margin="normal"
          value={wpAppPassword}
          onChange={(e) => setWpAppPassword(e.target.value)}
        />
        <Box mt={2}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default EditTopics;
