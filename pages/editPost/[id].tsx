import { useRouter } from 'next/router';
import { Link } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { EditorState, convertToRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { stateFromHTML } from 'draft-js-import-html';
import StatusLabsHeader from 'components/StatusLabsHeader';
import PbnSubmissionForm from 'components/PbnSubmissionForm';

export default function EditPost() {
  const router = useRouter();
  const { id } = router.query;
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [articleTitle, setArticleTitle] = useState('');
  const [content, setContent] = useState('');
  const [clientName, setClientName] = useState('');
  const [categories, setCategories] = useState('');
  const [submissionId, setSubmissionId] = useState<number | undefined>(undefined);

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
        router.push('/pbn-site-submissions'); // Change '/404' to your preferred redirection target
        return;
      }
  
      const data = await res.json();
        if (data.content) {
            const contentState = stateFromHTML(data.content); // Convert HTML to Draft.js ContentState
            setEditorState(EditorState.createWithContent(contentState));
            setArticleTitle(data.title);
            setClientName(data.client_name);
            setCategories(data.categories);
        }
    };

    if (id) {
      fetchData();
    }
  }, [id]);



  return (
    <div style={{ padding: 16, margin: 'auto', maxWidth: 750, overflow: 'auto', background: '#ffffff' }}>
        <StatusLabsHeader />
        <h1><Link href="/pbn-site-submissions">PBN Sites</Link>&raquo;Edit PBN Post</h1>
        <PbnSubmissionForm 
            articleTitle={articleTitle} // Pass articleTitle as a prop
            content={content}
            clientName={clientName}
            categories={categories}
            submissionId={submissionId}
            onSubmit={function (title: string, content: string): void {
              throw new Error('Function not implemented.');
            } }       
        />
    </div>
  );
}
