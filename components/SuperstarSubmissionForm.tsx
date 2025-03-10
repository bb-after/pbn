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
  Chip,
  styled,
} from "@mui/material";
import CopyToClipboardButton from "./CopyToClipboardButton"; // Replace with the correct path to your component
import router from "next/router";
import superstarSites from "pages/api/superstar-sites";
import useValidateUserToken from "hooks/useValidateUserToken";

const Editor = dynamic(
  () => import("react-draft-wysiwyg").then((module) => module.Editor),
  { ssr: false }
);

interface SuperstarFormProps {
  articleTitle: string;
  clientName?: string;
  categories?: string;
  submissionId?: number;
  superstarModalEditorState: EditorState;
  onSubmit: (title: string, content: string, tags: string[]) => void;
  superStarSiteId?: number;
}

interface SuperstarSite {
  id: number;
  domain: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string; // Keep topics as string
  custom_prompt?: string;
}

interface ParsedSuperstarSite {
  id: number;
  domain: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[];
  custom_prompt?: string;
}

const colors = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
];

const MyChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  color: "#fff",
}));

const SuperstarSubmissionForm: React.FC<SuperstarFormProps> = ({
  articleTitle,
  clientName = "",
  categories = "",
  submissionId,
  superstarModalEditorState,
  superStarSiteId,
}) => {
  const [editorState, setEditorState] = useState(superstarModalEditorState);
  const [title, setTitle] = useState(articleTitle);
  const [client, setClient] = useState(clientName);
  const [id, setId] = useState(submissionId);
  const [category, setCategory] = useState(categories);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [superstarSites, setSuperstarSites] = useState<ParsedSuperstarSite[]>(
    []
  );
  const [selectedSite, setSelectedSite] = useState(
    superStarSiteId || undefined
  );
  const [tagInput, setTagInput] = useState<string>(""); // Single string for comma-separated tags
  const { token } = useValidateUserToken();

  useEffect(() => {
    const fetchSuperstarSites = async () => {
      try {
        const response = await fetch("/api/superstar-sites"); // Use the existing API endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: SuperstarSite[] = await response.json(); // Explicitly type the response data

        const parsedData: ParsedSuperstarSite[] = data.map((site) => ({
          ...site,
          topics: (site.topics ? site.topics : "")
            .split(",")
            .map((topic) => topic.trim()), // Split and trim topics
        }));

        setSuperstarSites(parsedData);
      } catch (error) {
        console.error("Error fetching superstar sites:", error);
        // Handle the error as needed, e.g., set an error state
      }
    };

    fetchSuperstarSites();
    setId(submissionId);
    setTitle(articleTitle);
    setClient(clientName);
    setCategory(categories);
    setEditorState(superstarModalEditorState);
  }, [
    articleTitle,
    superstarModalEditorState,
    submissionId,
    clientName,
    categories,
    superStarSiteId,
  ]);

  useEffect(() => {
    if (superStarSiteId) {
      setSelectedSite(superStarSiteId);
    }
  }, [superStarSiteId]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
    const siteId = parseInt(event.target.value, 10);
    setSelectedSite(isNaN(siteId) ? undefined : siteId);
  };

  const postContentToSuperstar = async () => {
    const contentHTML = stateToHTML(editorState.getCurrentContent());
    const urlParams = new URLSearchParams(window.location.search);
    const superStarSiteId = selectedSite;
    // Parse the comma-separated tags
    const tags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    try {
      const response = await fetch("/api/postSuperstarContentToWordpress", {
        method: "POST",
        body: JSON.stringify({
          siteId: superStarSiteId,
          title: title,
          content: contentHTML,
          tags: tags,
          author: "",
          userToken: token,
          clientName: client,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (response.ok) {
        setSubmissionUrl(data.link);
        setIsSubmissionSuccessful(true);
        alert(`Submission posted successfully!`);
        router.push("/superstar-site-submissions");
      } else {
        alert(`Error posting content: ${data.message}`);
      }
    } catch (error: any) {
      console.error("Error posting content:", error);
      alert("Failed to post content. Please try again.");
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

  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
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
            <InputLabel id="superstar-site-select-label">
              Superstar Site
            </InputLabel>
            <Select
              labelId="superstar-site-select-label"
              id="superstar-site-select"
              value={selectedSite !== undefined ? selectedSite.toString() : ""}
              label="Superstar Site"
              onChange={handleCategoryChange}
              fullWidth
              disabled={!!superStarSiteId} // Make dropdown read-only if superStarSiteId is provided
            >
              {superstarSites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.domain} (Autogenerated: {site.autogenerated_count},
                  Manual: {site.manual_count}, Topics: {site.topics.join(", ")})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl component="fieldset" fullWidth>
            <FormLabel>Tags</FormLabel>
            <TextField
              label="Tags"
              value={tagInput}
              fullWidth
              margin="normal"
              placeholder="Enter tags separated by commas"
              onChange={handleTagInputChange}
            />
          </FormControl>

          <FormControl component="fieldset">
            <FormLabel>Content</FormLabel>
            <Editor
              readOnly={false}
              onEditorStateChange={handleEditorStateChange}
              editorState={editorState}
              wrapperClassName="rich-editor-wrapper"
              editorClassName="rich-editor"
            />
          </FormControl>

          <Button
            onClick={postContentToSuperstar}
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

export default SuperstarSubmissionForm;
