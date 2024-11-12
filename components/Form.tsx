// components/Form.tsx
import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic"; // Import dynamic from Next.js
import { Button, SelectChangeEvent } from "@mui/material";
import styles from "./styles.module.css";
import {
  Send,
  ArrowBack,
  Edit,
  Download,
  Blender,
  Undo,
  RestartAlt,
} from "@mui/icons-material";
import CopyToClipboardButton from "./CopyToClipboardButton";
import PreviousResponseComponent from "./PreviousResponseComponent";
import RemixModal from "./RemixModal";
import PbnSubmissionModal from "./PbnSubmissionModal";
import { postToSlack } from "../utils/postToSlack";
import Step1LoadingStateComponent from "./Step1LoadingState";
import FinalLoadingStateComponent from "./FinalLoadingState";
import ArticleForm from "./ArticleForm";
import {
  callOpenAI,
  callOpenAIToRewriteArticle,
  callOpenAIRevised,
  insertBacklinks,
  getBacklinkArray,
  parseTitleFromArticle,
} from "../utils/openai";
import { sendDataToStatusCrawl } from "../utils/statusCrawl";
import useValidateUserToken from "../hooks/useValidateUserToken";

// Dynamically import JoditEditor to prevent SSR issues
const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

interface FormProps {
}

const Form: React.FC<FormProps> = () => {
  const editor = useRef(null);  // Reference to Jodit editor instance
  const [content, setContent] = useState('');  // State for editor content
  const [response, setResponse] = useState<string>(""); // Initialize with an empty string
  const [articleTitle, setArticleTitle] = useState<string>(""); // State for article title
  const [backlinks, setBacklinks] = useState([""]); // State to hold list of backlinks
  const [previousResponses, setPreviousResponses] = useState<string[]>([]);
  const [missingBacklinks, setMissingBacklinks] = useState<string[]>([]);

  const [iterationCount, setIterationCount] = useState(0);
  const [iterationTotal, setIterationTotal] = useState(0);
  const [isLoadingFirstRequest, setLoadingFirstRequest] = useState(false);
  const [isLoadingSecondRequest, setLoadingSecondRequest] = useState(false);
  const [isLoadingThirdRequest, setLoadingThirdRequest] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [isEditingState, setEditingState] = useState(false);

  const [keywords, setKeywords] = useState("");
  const [gptVersion, setGptVersion] = useState("gpt-4o-mini");
  const [language, setLanguage] = useState("English");
  const [wordCount, setWordCount] = useState(300);
  const [keywordsToExclude, setKeywordsToExclude] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [articleCount, setArticleCount] = useState(1);
  const [tone, setTone] = useState<string[]>([]);
  const [otherInstructions, setOtherInstructions] = useState("");
  const [isRemixModalOpen, setRemixModalOpen] = useState(false);
  const [isPbnModalOpen, setPbnModalOpen] = useState(false);
  const [sourceContent, setSourceContent] = useState(""); // Added to hold the pasted content
  const [useSourceContent, setUseSourceContent] = useState(false); // Determines if source content or URL should be used

  const handleRemixModalOpen = () => {
    setRemixModalOpen(true);
  };

  const handlePbnModalOpen = (response: string) => {
    const postTitle = parseTitleFromArticle(response);
    setArticleTitle(postTitle); 
    setPbnModalOpen(true);
  };

  const { token, isLoading, isValidUser } = useValidateUserToken(); // Destructure the returned object

  const handleRemixModalSubmit = async (
    iterations: number,
    remixMode: string
  ) => {
    if (!token) {
      console.error("User token not found.");
      return;
    }

    setRemixModalOpen(false); // Close the modal

    const inputData = getInputData();
    setIterationTotal(iterations);
    const mode = remixMode;
    try {
      for (let i = 1; i <= iterations; i++) {
        setIterationCount(i);
        setShowForm(false);
        setLoadingFirstRequest(true);

        const firstResponse =
          mode !== "generate"
            ? await callOpenAIToRewriteArticle(response, inputData)
            : await callOpenAI(inputData);

        setLoadingFirstRequest(false);

        const revisedResponse = await callOpenAIRevised(
          inputData,
          firstResponse
        );

        setLoadingThirdRequest(true);
        let hyperlinkedResponse = revisedResponse;
        const backlinkArray = getBacklinkArray(inputData);

        const missingBacklinks = backlinkArray.filter(
          (backlink) => !hyperlinkedResponse.includes(backlink)
        );
        setMissingBacklinks(missingBacklinks); // Update state with missing backlinks

        setResponse(hyperlinkedResponse);
        addResponseToPreviousResponses(hyperlinkedResponse);
        postToSlack("*Iteration #" + i + "*:" + hyperlinkedResponse);
        await sendDataToStatusCrawl(inputData, hyperlinkedResponse, token);
        setLoadingThirdRequest(false);
      }
    } catch (error) {
      setLoadingFirstRequest(false);
      setLoadingThirdRequest(false);
    } finally {
      setIterationCount(0);
      setIterationTotal(0);
    }
  };

  const handleToneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setTone((prevTone) =>
      prevTone.includes(value)
        ? prevTone.filter((item) => item !== value)
        : [...prevTone, value]
    );
  };

  const addResponseToPreviousResponses = (response: string) => {
    if (response !== "" && !previousResponses.includes(response)) {
      setPreviousResponses((prevResponses) => [...prevResponses, response]);
    }
  };

  const handleBackState = () => {
    addResponseToPreviousResponses(response);
    setShowForm(true);
    setEditingState(false);
  };

  const handleStartOver = () => {
    const confirmed = window.confirm(
      "Are you sure you want to start over? This action will clear your current data."
    );

    if (confirmed) {
      setShowForm(true);
      setEditingState(false);
      setResponse("");
      setPreviousResponses([]);
    }
  };

  const handleGoBackToLastResponse = () => {
    const lastResponse = previousResponses[previousResponses.length - 1];
    setResponse(lastResponse);
    setShowForm(false);
  };
  const normalizeLineBreaks = (htmlContent: string) => {
    return htmlContent.replace(/(<br\s*\/?>\s*){2,}/g, "</p><p>");
    // return htmlContent.replace(/<br\s*\/?>/g, "\n\n");
  };
  const wrapInParagraphs = (htmlContent: string) => {
    return `<p>${htmlContent.replace(/\n/g, "</p><p>")}</p>`;
  };
  
  
  
  const openEditor = () => {
    setContent(wrapInParagraphs(normalizeLineBreaks(response)));
    setEditingState(true);
  };
  const closeRTE = () => {
    setEditingState(false);
  };

  const saveEditor = () => {
    setResponse(content);
    setEditingState(false);
  };

  function downloadContent(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAllContent(filename: string, previousResponses: string[]) {
    let combinedContent = "";
    previousResponses.reverse().forEach((prevResponse, index) => {
      const version = `<strong>Version ${index + 1}:</strong><br>`;
      combinedContent += `${version}\n${prevResponse}<br><br>`;
    });

    const blob = new Blob([combinedContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleGptVersionChange = (event: SelectChangeEvent) => {
    setGptVersion(event.target.value as string);
  };

  const handleLanguage = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as string);
  };

  const getInputData = () => ({
    keywords: keywords.split(","),
    keywordsToExclude: keywordsToExclude.split(","),
    sourceUrl: useSourceContent ? "" : sourceUrl,
    sourceContent: useSourceContent ? sourceContent : "",
    tone: tone.join(", "),
    wordCount,
    gptVersion,
    articleCount,
    otherInstructions,
    language,
    // Dynamically generate backlinks properties
    ...backlinks.reduce<Record<string, string>>((acc, _, index) => {
      acc[`backlink${index + 1}`] = backlinks[index];
      return acc;
    }, {}),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputData = getInputData();
    const numberOfIterations = 1;

    if (!token) {
      alert("User token not found.");
      return;
    }

    try {
      setShowForm(false);
      setLoadingFirstRequest(true);

      const firstResponse = await callOpenAI(inputData);
      setLoadingFirstRequest(false);

      const revisedResponse = await callOpenAIRevised(inputData, firstResponse);
      setLoadingThirdRequest(true);
      let hyperlinkedResponse = revisedResponse;
      const backlinkArray = getBacklinkArray(inputData);

      const missingBacklinks = backlinkArray.filter(
        (backlink) => !hyperlinkedResponse.includes(backlink)
      );
      setMissingBacklinks(missingBacklinks);

      setResponse(hyperlinkedResponse);
      addResponseToPreviousResponses(hyperlinkedResponse);
      setLoadingThirdRequest(false);
      postToSlack(hyperlinkedResponse);

      await sendDataToStatusCrawl(inputData, hyperlinkedResponse, token);
    } catch (error) {
      setLoadingFirstRequest(false);
      setLoadingThirdRequest(false);
    }
  };

  // const config = {
  //   readonly: false,
  //   height: 400,
  //   toolbar: true,
  //   buttons: ["bold", "italic", "underline", "link", "source"],
  // };

  return (
    <div className={styles.formWrapper}>
      {showForm ? (
        <div className="formBobby">
          <ArticleForm
            handleSubmit={handleSubmit}
            wordCount={wordCount}
            setWordCount={setWordCount}
            articleCount={articleCount}
            setArticleCount={setArticleCount}
            keywords={keywords}
            setKeywords={setKeywords}
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            sourceContent={sourceContent}
            setSourceContent={setSourceContent}
            useSourceContent={useSourceContent}
            setUseSourceContent={setUseSourceContent}
            keywordsToExclude={keywordsToExclude}
            setKeywordsToExclude={setKeywordsToExclude}
            gptVersion={gptVersion}
            handleGptVersionChange={handleGptVersionChange}
            language={language}
            handleLanguage={handleLanguage}
            tone={tone}
            handleToneChange={handleToneChange}
            otherInstructions={otherInstructions}
            setOtherInstructions={setOtherInstructions} 
            backlinks={backlinks}
            setBacklinks={setBacklinks} 
          />
          {previousResponses.length > 0 && (
            <div>
              <br />
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleGoBackToLastResponse}
              >
                Back to Results
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="response">
          {(isLoadingFirstRequest || isLoadingThirdRequest) && iterationCount > 0 ? (
            <div className={styles.iterationCount}>
              Remixing {iterationCount} / {iterationTotal}
            </div>
          ) : (
            ""
          )}
          {isLoadingFirstRequest ? (
            <Step1LoadingStateComponent />
          ) : isLoadingThirdRequest ? (
            <FinalLoadingStateComponent />
          ) : (
            <div className="allEditing">
              {missingBacklinks.length > 0 && (
                <div className={styles.missingBacklinksWarning}>
                  <h4 color="red">
                    The content was generated but we were unable to insert all
                    backlinks. Please review the text below and manually add
                    your backlinks.
                  </h4>
                  <ul>
                    {missingBacklinks.map((backlink, index) => (
                      <li key={index}>
                        <span>{backlink}</span>
                        <CopyToClipboardButton text={backlink} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isEditingState ? (
                <div>
                  <JoditEditor
                    ref={editor}
                    value={content}
                    // config={config}
                    onBlur={(newContent) => setContent(newContent)}
                    onChange={(newContent) => setContent(newContent)}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Undo />}
                    color="error"
                    onClick={closeRTE}
                  >
                    Cancel
                  </Button>
                  &nbsp;
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={saveEditor}
                  >
                    Save Content
                  </Button>
                </div>
              ) : (
                <div className="responseAndActions">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={handleBackState}
                  >
                    Back
                  </Button>
                  &nbsp;&nbsp;
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestartAlt />}
                    onClick={handleStartOver}
                  >
                    Start Over
                  </Button>
                  <div
                    className={styles.pbnjResults}
                    dangerouslySetInnerHTML={{ __html: response }}
                  ></div>
                  <div className={styles.actionBar}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() => downloadContent("response.html", response)}
                    >
                      Download Content
                    </Button>
                    &nbsp;
                    {previousResponses.length > 1 && (
                      <div>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Download />}
                          onClick={() =>
                            downloadAllContent(
                              "response.html",
                              previousResponses
                            )
                          }
                        >
                          Download All Versions
                        </Button>
                        &nbsp;
                      </div>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={openEditor}
                    >
                      Edit Content
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Blender />}
                      onClick={handleRemixModalOpen}
                    >
                      Remix
                    </Button>
                    <RemixModal
                      isOpen={isRemixModalOpen}
                      onClose={() => setRemixModalOpen(false)}
                      onSubmit={handleRemixModalSubmit}
                    />
                    <br />
                    &nbsp;
                    <CopyToClipboardButton text={response} />
                    <br />
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<Send />}
                      onClick={() => handlePbnModalOpen(response)}
                    >
                      Post article to PBN
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {previousResponses
        .slice()
        .reverse()
        .map((prevResponse, index) => (
          <div key={`response-${index}`}>
            <PreviousResponseComponent
              key={`component-${index}`}
              version={previousResponses.length - index}
              response={prevResponse}
            />
            <div className={styles.actionBar}>
              <Button
                size="small"
                variant="contained"
                startIcon={<Download />}
                onClick={() => downloadContent("response.html", prevResponse)}
              >
                Download Content
              </Button>
              <br />
              &nbsp;
              <CopyToClipboardButton text={prevResponse} />
              <br />
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<Send />}
                onClick={() => handlePbnModalOpen(response)}
              >
                Post article to PBN
              </Button>
            </div>
          </div>
        ))}
      <PbnSubmissionModal
        isOpen={isPbnModalOpen}
        onClose={() => setPbnModalOpen(false)}
        articleTitle={articleTitle} 
        content={response} />
    </div>
  );
};

export default Form;
