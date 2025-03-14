import { useEffect, useState, useCallback } from "react";
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
  Select,
  MenuItem,
  TablePagination,
} from "@mui/material";

const handleDeleteSubmission = async (
  submissionId: number,
  submissionUrl: string,
  type: "pbn"
) => {
  try {
    const response = await fetch(`/api/deleteFromWordPress`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId, submissionUrl, type }),
    });

    const data = await response.json();
    if (response.ok) {
      alert("Submission deleted successfully!");
      window.location.reload();
      // Refresh your submissions list or handle UI updates here
    } else {
      // Handle backend errors (e.g., post not found, deletion failed)
      alert(`Error deleting submission: ${data.error}`);
    }
  } catch (error) {
    console.error("Error deleting submission:", error);
    alert("Failed to delete submission. Please try again.");
  }
};

const PbnSiteSubmissionsTable = () => {
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState(""); // new state for the search query
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  interface User {
    name: string;
    user_token: string; // Adjust this type based on the actual data, e.g., string, number, etc.
    pbn_count: number;
  }
  const [users, setUsers] = useState<User[]>([]);
  interface Client {
    client_name: string;
    post_count: number;
  }
  const [clients, setClients] = useState<Client[]>([]);

  const [page, setPage] = useState(0); //current page
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  type ExpandedRowsType = { [key: string]: boolean };
  const [expandedRows, setExpandedRows] = useState<ExpandedRowsType>({});

  const handleToggle = (id: string) => {
    setExpandedRows((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/pbn-site-submissions?page=${page}&rowsPerPage=${rowsPerPage}&search=${search}&userToken=${selectedUser}&clientName=${selectedClient}`
      );
      const data = await response.json();
      setSubmissions(data.rows);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  }, [search, selectedUser, selectedClient, page, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/getUsers");
        const data = await response.json();
        setUsers(data.rows);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/pbn-site-submissions?getClientCounts=true");
        const data = await response.json();
        setClients(data.clients || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  // Search handler
  const handleSearch = () => {
    fetchData(); // fetch data using the current search query
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    debugger;
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page to 0 when rows per page change
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

      <div
        style={{
          padding: "2rem",
          borderRadius: "3px",
          margin: "2rem",
          background: "#fff",
        }}
      >
        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo; PBN
          Site Submissions
        </Typography>

        <Box mr={1}></Box>

        {/* Search bar */}
        <Box
          display="flex" // creates a flex container
          justifyContent="flex-end" // aligns the child elements to the right
          alignItems="center" // centers children vertically
          mb={2} // margin-bottom for spacing below the search bar
        >
          <Box mr={1}>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              displayEmpty
              inputProps={{ "aria-label": "Without label" }}
              style={{ minWidth: '120px' }}
            >
              <MenuItem value="">
                <em>All Users</em>
              </MenuItem>
              {users.map((user, index) => (
                <MenuItem key={index} value={user.user_token}>
                  {user.name} ({user.pbn_count})
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box mr={1}>
            <Select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              displayEmpty
              inputProps={{ "aria-label": "Without label" }}
              style={{ minWidth: '120px' }}
            >
              <MenuItem value="">
                <em>All Clients</em>
              </MenuItem>
              {clients.map((client, index) => (
                <MenuItem key={index} value={client.client_name}>
                  {client.client_name} ({client.post_count})
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box mr={1}>
            <TextField
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)} // update the search query upon change
            />
          </Box>
          <Button onClick={handleSearch} variant="contained">
            Search
          </Button>{" "}
          {/* Trigger the search */}
        </Box>

        <TablePagination
          component="div"
          count={totalCount} // Replace with total count of items from server
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Submission Response</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission: any) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.id}</TableCell>
                  <TableCell>{submission.title}</TableCell>
                  <TableCell>
                    {expandedRows[submission.id] ? (
                      <div
                        dangerouslySetInnerHTML={renderHTML(
                          submission?.content
                        )}
                      />
                    ) : (
                      <div
                        dangerouslySetInnerHTML={renderHTML(
                          submission?.content?.substring(0, 100) + "..."
                        )}
                      />
                    )}
                    <Button onClick={() => handleToggle(submission.id)}>
                      {expandedRows[submission.id] ? "Collapse" : "Expand"}
                    </Button>
                  </TableCell>
                  <TableCell>{submission.name}</TableCell>
                  <TableCell>{submission.client_name || '-'}</TableCell>
                  <TableCell>
                    <Link href={submission.submission_response} target="_blank">
                      {submission.submission_response}
                    </Link>
                  </TableCell>
                  <TableCell>{submission.created}</TableCell>
                  <TableCell>
                    <Link
                      href={submission.submission_response}
                      underline="none"
                      target="_blank"
                    >
                      <Button size="small" variant="outlined" color="primary">
                        View
                      </Button>
                    </Link>
                    <Link href={`/editPost/${submission.id}`}>
                      <Button size="small" variant="outlined">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        handleDeleteSubmission(
                          submission.id,
                          submission.submission_response,
                          "pbn"
                        )
                      }
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount} // Replace with total count of items from server
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>
    </div>
  );
};

export default PbnSiteSubmissionsTable;
