import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  TextField,
  Button,
  FormControl,
  FormLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputLabel,
} from "@mui/material";
import CopyToClipboardButton from "./CopyToClipboardButton";
import useValidateUserToken from "../hooks/useValidateUserToken";

// Dynamically load JoditEditor to prevent SSR issues
const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

interface PbnFormProps {
  articleTitle: string;
  clientName?: string;
  categories?: string;
  submissionId?: number;
  content: string;
  onSubmit: (title: string, content: string) => void;
}

const PbnSubmissionForm: React.FC<PbnFormProps> = ({
  articleTitle,
  clientName = "",
  categories = "",
  submissionId,
  content,
  onSubmit,
}) => {
  // State management
  const [editorContent, setEditorContent] = useState(content); // Independent editor content state
  const [title, setTitle] = useState(articleTitle);
  const [client, setClient] = useState(clientName);
  const [id, setId] = useState(submissionId);
  const [category, setCategory] = useState(categories);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const { token } = useValidateUserToken();

  // Handle category changes
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  // Update state on prop changes
  useEffect(() => {
    setId(submissionId);
    setTitle(articleTitle);
    setClient(clientName);
    setCategory(categories);
    setEditorContent(content); // Reset editor content if `content` prop changes
  }, [articleTitle, clientName, categories, submissionId, content]);

  // Post content to PBN
  const postContentToPbn = async () => {
    try {
      const response = await fetch("/api/postToWordPress", {
        method: "POST",
        body: JSON.stringify({
          title,
          clientName,
          content: editorContent,
          userToken: token,
          category,
          tags: [],
          submissionId: id,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 201) {
        const responseData = await response.json();
        setSubmissionUrl(responseData.link);
        setIsSubmissionSuccessful(true);
      } else {
        handleError(response);
      }
    } catch (error: any) {
      alert("Request error: " + error.message);
      setIsSubmissionSuccessful(false);
    }
  };

  const handleError = async (response: Response) => {
    const responseData = await response.json();
    if (response.status === 400) {
      alert(
        `Article already uploaded to PBN. Submission response: ${responseData.submission_response}`
      );
    } else if (response.status === 404) {
      alert("No active blogs found in database");
    } else {
      alert("Failed to post article to PBN");
    }
    setIsSubmissionSuccessful(false);
  };

  // Input handlers
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClient(event.target.value);
  };

  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent);
  };

  return (
    <div>
      {isSubmissionSuccessful && submissionUrl ? (
        <div>
          <TextField
            fullWidth
            margin="normal"
            value={submissionUrl}
            InputProps={{ readOnly: true }}
            variant="outlined"
          />
          <CopyToClipboardButton text={submissionUrl} />
        </div>
      ) : (
        <>
          <FormControl component="fieldset" fullWidth>
            <TextField
              label="Article Title"
              value={title}
              fullWidth
              margin="normal"
              required
              placeholder="Article Title"
              onChange={handleTitleChange}
            />
            <TextField
              label="Client Name"
              value={client}
              fullWidth
              margin="normal"
              required
              placeholder="Client Name"
              onChange={handleClientChange}
            />
          </FormControl>
          <FormControl component="fieldset" fullWidth>
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              id="category-select"
              value={category}
              label="Category"
              onChange={handleCategoryChange}
              fullWidth
            >
              {[
                "Business",
                "Finance",
                "Health",
                "Lifestyle",
                "Technology",
                "News",
                "Education",
                "Entrepreneurship",
                "Sports",
                "General",
              ].map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl component="fieldset">
            <FormLabel>Content</FormLabel>
            <JoditEditor
              key={submissionId || articleTitle} // Unique key for each instance
              value={editorContent}
              onBlur={handleContentChange} // Update content on blur
              onChange={handleContentChange} // Update content on each change
            />
          </FormControl>
          <Button onClick={postContentToPbn} variant="contained" color="primary">
            Submit
          </Button>
        </>
      )}
    </div>
  );
};

export default PbnSubmissionForm;
