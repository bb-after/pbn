import { useEffect, useState } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Link,
} from '@mui/material';

const PbnSiteSubmissionsTable = () => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    // Fetch data from the API route
    fetch('/api/pbn-site-submissions')
      .then((response) => response.json())
      .then((data) => setSubmissions(data))
      .catch((error) => console.error(error));
  }, []);

  // Function to safely render HTML content
  const renderHTML = (htmlContent: string) => {
    return { __html: htmlContent };
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        PBN Site Submissions
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>PBN Site URL</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>User Token</TableCell>
              <TableCell>Submission Response</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((submission: any) => (
              <TableRow key={submission.id}>
                <TableCell>{submission.id}</TableCell>
                <TableCell>{submission.pbn_site_url}</TableCell>
                <TableCell>{submission.title}</TableCell>
                <TableCell
                  dangerouslySetInnerHTML={renderHTML(submission.content)}
                ></TableCell>
                <TableCell>{submission.user_token}</TableCell>
                <TableCell>
                  <Link href={submission.submission_response} target="_blank">
                    {submission.submission_response}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default PbnSiteSubmissionsTable;
