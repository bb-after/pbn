import { useRouter } from "next/router";
import { Link } from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
import StatusLabsHeader from "components/StatusLabsHeader";
import PbnSubmissionForm from "components/PbnSubmissionForm";
import { EditorState, convertFromRaw } from "draft-js";

export default function EditPost() {
  const router = useRouter();
  const { id } = router.query;
  const [articleTitle, setArticleTitle] = useState("");
  const [content, setContent] = useState("");
  const [clientName, setClientName] = useState("");
  const [categories, setCategories] = useState("");
  const [submissionId, setSubmissionId] = useState<number | undefined>(
    undefined
  );
  const [editorState, setEditorState] = useState(EditorState.createEmpty());

  const fetchPost = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/pbn-site-submissions/${id}`);
      const data = await response.json();
      setArticleTitle(data.title);
      setEditorState(
        EditorState.createWithContent(convertFromRaw(JSON.parse(data.content)))
      );
      setClientName(data.client_name);
      setCategories(data.categories);
      setSubmissionId(data.id);
    } catch (error) {
      console.error("Error fetching post:", error);
    }
  }, []);

  useEffect(() => {
    if (router.isReady) {
      const { id } = router.query;
      fetchPost(id as string);
    }
  }, [router, router.isReady, fetchPost]);

  useEffect(() => {
    if (id) {
      const numericId = Number(id);
      setSubmissionId(!isNaN(numericId) ? numericId : undefined);
    }

    // Fetch post data from the database
    const fetchData = async () => {
      const res = await fetch(`/api/getPost?id=${id}`);
      if (res.status === 404) {
        // Redirect to the home page or a custom 404 page
        router.push("/pbn-site-submissions"); // Change '/404' to your preferred redirection target
        return;
      }

      const data = await res.json();
      if (data.content) {
        setArticleTitle(data.title);
        setClientName(data.client_name);
        setCategories(data.categories);
        setContent(data.content);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

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
        <Link href="/pbn-site-submissions">PBN Sites</Link>&raquo;Edit PBN Post
      </h1>
      <PbnSubmissionForm
        articleTitle={articleTitle} // Pass articleTitle as a prop
        content={content}
        clientName={clientName}
        categories={categories}
        submissionId={submissionId}
        onSubmit={function (title: string, content: string): void {
          throw new Error("Function not implemented.");
        }}
      />
    </div>
  );
}
