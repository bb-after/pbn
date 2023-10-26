import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableContainer,
  TextField,
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
  const [search, setSearch] = useState(""); // new state for the search query

  const fetchData = (query = "") => {
    let apiUrl = '/api/pbn-site-submissions';
    if (query) {
      apiUrl += `?search=${query}`; // modify the API route to accept a search query
    }

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => setSubmissions(data))
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    fetchData(); // initial fetch without a search query
  }, []);

    // Search handler
    const handleSearch = () => {
      fetchData(search); // fetch data using the current search query
    };
  

  // Function to safely render HTML content
  const renderHTML = (htmlContent: string) => {
    return { __html: htmlContent };
  };

  return (
    <div>
        <style jsx global>
        {`
        body {
            background: #eee;
        }
        th {
            font-weight: bold !important;
        }
        `}
    </style>

      <div style={{padding: '2rem', borderRadius: '3px', margin: '2rem', background: '#fff'}}>

        
      <Typography variant="h5" gutterBottom>
        <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo; PBN Site Submissions
      </Typography>

        {/* Search bar */}
        <Box
          display="flex" // creates a flex container
          justifyContent="flex-end" // aligns the child elements to the right
          alignItems="center" // centers children vertically
          mb={2} // margin-bottom for spacing below the search bar
        >
          <Box mr={1}>
            <TextField
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)} // update the search query upon change
            />
          </Box>
        <Button onClick={handleSearch} variant="contained">Search</Button> {/* Trigger the search */}
      </Box>


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
    </div>
  );
};

export default PbnSiteSubmissionsTable;
