import { useRouter } from "next/router";
import { Link } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import { EditorState, convertFromRaw } from "draft-js";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { stateFromHTML } from "draft-js-import-html";
import StatusLabsHeader from "components/StatusLabsHeader";
import SuperstarSubmissionForm from "components/SuperstarSubmissionForm";

export default function EditPost() {
  const router = useRouter();
  const { id } = router.query;
  const [editorState, setEditorState] = useState(() =>
    EditorState.createEmpty()
  );
  const [articleTitle, setArticleTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [categories, setCategories] = useState("");
  const [submissionId, setSubmissionId] = useState<number | undefined>(
    undefined
  );
  const [superStarSiteId, setSuperStarSiteId] = useState<number | undefined>(
    undefined
  );

  const fetchPost = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/superstar-site-submissions/${id}`);
      const data = await response.json();
      setArticleTitle(data.title);
      setEditorState(
        EditorState.createWithContent(convertFromRaw(JSON.parse(data.content)))
      );
      setClientName(data.client_name);
      setCategories(data.categories);
      setSubmissionId(data.id);
      setSuperStarSiteId(data.superstar_site_id);
    } catch (error) {
      console.error("Error fetching post:", error);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const { id } = router.query;
    if (id) {
      fetchPost(id as string);
    }
  }, [router.isReady, router.query, fetchPost]);

  return (
    <div
      style={{
        padding: 16,
        margin: "auto",
        maxWidth: 750,
        overflow: "auto",
        background: "#ffffff",
      }}
    >
      <StatusLabsHeader />
      <h1>
        <Link href="/superstar-site-submissions">Superstar Sites</Link>
        &raquo;Edit Superstar Post
      </h1>
      <SuperstarSubmissionForm
        articleTitle={articleTitle}
        superstarModalEditorState={editorState}
        clientName={clientName}
        categories={categories}
        submissionId={submissionId}
        superStarSiteId={superStarSiteId} // Pass superStarSiteId as a prop
        onSubmit={function (title: string, content: string): void {
          throw new Error("Function not implemented.");
        }}
      />
    </div>
  );
}
