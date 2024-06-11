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
import { WithContext as ReactTags } from "react-tag-input";
import CopyToClipboardButton from "./CopyToClipboardButton"; // Replace with the correct path to your component
import axios from "axios";

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
  siteSubmissionId?: number;
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
  siteSubmissionId,
}) => {
  const [editorState, setEditorState] = useState(superstarModalEditorState);
  const [title, setTitle] = useState(articleTitle);
  const [client, setClient] = useState(clientName);
  const [id, setId] = useState(submissionId);
  const [category, setCategory] = useState(categories);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [superstarSites, setSuperstarSites] = useState([]);
  const [tags, setTags] = useState([]);
  const KeyCodes = {
    comma: 188,
    enter: 13,
  };
  const delimiters = [KeyCodes.comma, KeyCodes.enter];

  useEffect(() => {
    const fetchSuperstarSites = async () => {
      const response = await fetch("/api/superstar-sites"); // Use the existing API endpoint
      const data = await response.json();
      const parsedData = data.map((site: any) => ({
        ...site,
        topics: Array.isArray(site.topics)
          ? site.topics
          : site.topics
          ? site.topics.split(",")
          : [],
      }));
      setSuperstarSites(parsedData);
    };

    fetchSuperstarSites();
    setId(submissionId);
    setTitle(articleTitle);
    setClient(clientName);
    setCategory(categories);
    setEditorState(superstarModalEditorState);
  }, [articleTitle, superstarModalEditorState]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  const postContentToSuperstar = async () => {
    const contentHTML = stateToHTML(editorState.getCurrentContent());
    const urlParams = new URLSearchParams(window.location.search);
    const userToken = urlParams.get("token");

    try {
      const postContent = {
        siteId: submissionId,
        title: title,
        content: contentHTML,
        tags: [], //tags.join(", "),
        author: client,
      };
      await axios.post("/api/postSuperstarContentToWordpress", postContent);
      alert("Content posted successfully!");
    } catch (error) {
      console.error("Error posting content:", error);
      alert("Failed to post content.");
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

  const handleDelete = (i: number) => {
    setTags(tags.filter((tag, index) => index !== i));
  };

  const handleAddition = (tag: any) => {
    setTags([...tags, tag]);
  };

  const renderTag = (props: any) => {
    const { tag, key, onRemove, classNameRemove } = props;
    const color = colors[key % colors.length];
    return (
      <MyChip
        key={key}
        label={tag.text}
        onDelete={() => onRemove(key)}
        style={{ backgroundColor: color }}
      />
    );
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
              value={category}
              label="Superstar Site"
              onChange={handleCategoryChange}
              fullWidth
            >
              {superstarSites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.domain} (Autogenerated: {site.autogenerated_count},
                  Manual: {site.manual_count}, Topics: {site.topics})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl component="fieldset" fullWidth>
            <FormLabel>Tags</FormLabel>
            <ReactTags
              tags={tags}
              handleDelete={handleDelete}
              handleAddition={handleAddition}
              delimiters={delimiters}
              renderTag={renderTag}
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
