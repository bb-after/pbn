// PbnSubmissionForm.tsx (Reusable Form Component)
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { EditorState } from "draft-js";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { stateToHTML } from "draft-js-export-html";
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
import CopyToClipboardButton from "./CopyToClipboardButton"; // Replace with the correct path to your component
import useValidateUserToken from "hooks/useValidateUserToken";

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import("react-draft-wysiwyg").then((module) => module.Editor),
  { ssr: false }
);

///

interface PbnFormProps {
  articleTitle: string; // Add articleTitle prop
  clientName?: string;
  categories?: string;
  submissionId?: number;
  pbnModalEditorState: EditorState; // Add pbnModalEditorState prop
  onSubmit: (title: string, content: string) => void;
}

const PbnSubmissionForm: React.FC<PbnFormProps> = ({
  articleTitle, // Receive articleTitle as a prop
  clientName = "",
  categories = "",
  submissionId,
  pbnModalEditorState, // Receive pbnModalEditorState as a prop
}) => {
  const [editorState, setEditorState] = useState(pbnModalEditorState); // Use pbnModalEditorState as initial state
  const [title, setTitle] = useState(articleTitle); // Use articleTitle as initial state
  const [client, setClient] = useState(clientName); // Use '' as initial state
  const [id, setId] = useState(submissionId);
  const [category, setCategory] = useState(categories); // State for tracking the selected category
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };
  const { token } = useValidateUserToken();

  useEffect(() => {
    setId(submissionId);
    console.log("subbbb", submissionId);
    setTitle(articleTitle);
    setClient(clientName);
    setCategory(categories);
    // Assuming you also pass the content as a prop and want to initialize it similarly
    // const contentState = stateFromHTML(EditorState); // Convert HTML to Draft.js ContentState
    setEditorState(pbnModalEditorState);
  }, [articleTitle, pbnModalEditorState]); // Add articleContent to dependencies if you're using it

  const postContentToPbn = async () => {
    const contentHTML = stateToHTML(editorState.getCurrentContent());
    const urlParams = new URLSearchParams(window.location.search);
    try {
      const response = await fetch("/api/postToWordPress", {
        method: "POST",
        body: JSON.stringify({
          title: title,
          clientName: clientName,
          content: contentHTML,
          userToken: token,
          category: category,
          tags: [],
          submissionId: id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201) {
        const responseData = await response.json();
        // Article posted successfully
        // alert('article posted successfully! \n' + responseData.link);
        setSubmissionUrl(responseData.link); // Assuming responseData.link contains the URL
        setIsSubmissionSuccessful(true);
      } else if (response.status == 400) {
        const responseData = await response.json();
        alert(
          `Article already uploaded to PBN. Submission response: ${responseData.submission_response}`
        );
        setIsSubmissionSuccessful(false);
      } else if (response.status == 404) {
        alert("No active blogs found in database");
        setIsSubmissionSuccessful(false);
      } else {
        alert("Failed to post article to PBN");
        setIsSubmissionSuccessful(false);
      }
    } catch (error: any) {
      alert("Request error: " + error.message);
      setIsSubmissionSuccessful(false);
    }
  };

  const handleEditorStateChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClient(event.target.value);
  };

  return (
    <div>
      {isSubmissionSuccessful && submissionUrl ? (
        <div>
          <TextField
            fullWidth
            margin="normal"
            value={submissionUrl}
            InputProps={{
              readOnly: true,
            }}
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
          <br /> <br />
          <FormControl component="fieldset">
            <FormLabel>Content</FormLabel>
            {/* Render the DraftJS editor */}
            <Editor
              readOnly={false}
              onEditorStateChange={handleEditorStateChange}
              editorState={editorState}
              wrapperClassName="rich-editor-wrapper"
              editorClassName="rich-editor"
            />
          </FormControl>
          <br /> <br />
          <Button
            onClick={postContentToPbn}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </>
      )}
    </div>
  );
};

export default PbnSubmissionForm;
