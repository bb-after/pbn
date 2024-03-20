import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import { Editor, EditorState, convertFromRaw, convertToRaw, ContentState, convertFromHTML } from 'draft-js';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { stateToHTML } from 'draft-js-export-html';
import StatusLabsHeader from '../components/StatusLabsHeader'; // Adjust the path as necessary

export default function EditPost() {
  const router = useRouter();
  const { id } = router.query;
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
    // Dynamically load the RTE component (client-side) to prevent server-side rendering issues
    const Editor = dynamic(
    () => import('react-draft-wysiwyg').then((module) => module.Editor),
    { ssr: false }
  );
  
  const handleEditorStateChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
  };

  useEffect(() => {
    // Fetch post data from the database
    const fetchData = async () => {
      const res = await fetch(`/api/getPost?id=${id}`);
      const data = await res.json();
      const contentState = convertFromRaw(JSON.parse(data.content));
      setEditorState(EditorState.createWithContent(contentState));
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleSave = async () => {
    const content = JSON.stringify(convertToRaw(editorState.getCurrentContent()));
    // Use your API to update the post in WordPress
    await fetch(`/api/editPost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, content }),
    });
    router.push('/');
  };

  return (
    <div style={{ padding: 16, margin: 'auto', maxWidth: 750, overflow: 'auto', background: '#ffffff' }}>
    <StatusLabsHeader />
    <Editor
    editorState={editorState}
    onEditorStateChange={handleEditorStateChange}
    wrapperClassName="rich-editor-wrapper"
    editorClassName="rich-editor"
  />
    <Editor editorState={editorState} onChange={setEditorState} />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
