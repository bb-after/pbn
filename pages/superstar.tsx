import { useState } from "react";
import { Button, TextField, CircularProgress } from "@mui/material";
import LayoutContainer from "../components/LayoutContainer";
import StyledHeader from "../components/StyledHeader";
import axios from "axios";

const HomePage = () => {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.get(
        `/api/generateContent?topic=${encodeURIComponent(topic)}`
      );
      console.log("response? ", response);
      setContent(response.data.content);
      setLoading(false);
    } catch (error) {
      console.error("Error generating content:", error);
      setLoading(false);
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
      <div style={{ marginTop: "16px" }}>
        {loading ? <CircularProgress /> : <p>{content}</p>}
      </div>
    </LayoutContainer>
  );
};

export default HomePage;
