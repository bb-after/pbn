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
  CircularProgress,
} from "@mui/material";
import useValidateUserToken from "../hooks/useValidateUserToken";
import Image from "next/image";

const handleDeleteSubmission = async (
  submissionId: number,
  submissionUrl: string,
  type: "superstar" | "pbn"
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

const SuperstarSiteSubmissionsTable = () => {
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState(""); // new state for the search query
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedAutogenerated, setSelectedAutogenerated] =
    useState<string>("");

  interface User {
    name: string;
    user_token: string;
    superstar_count: number;
  }

  interface Author {
    id: number;
    author_name: string;
    author_avatar: string;
    superstar_site_id: number;
    site_domain: string;
    submission_count: number;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);

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
        `/api/superstar-site-submissions?page=${page}&rowsPerPage=${rowsPerPage}&search=${search}&userToken=${selectedUser}&authorId=${selectedAuthor}&autogenerated=${selectedAutogenerated}`
      );
      const data = await response.json();
      setSubmissions(data.rows);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  }, [
    search,
    selectedUser,
    selectedAuthor,
    selectedAutogenerated,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Function to fetch users
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/getSuperstarUsers");
        const data = await response.json();
        console.log("users", data);
        setUsers(data.rows);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    // Function to fetch authors
    const fetchAuthors = async () => {
      try {
        const response = await fetch("/api/getSuperstarAuthors");
        const data = await response.json();
        console.log("authors", data);
        setAuthors(data.authors);
      } catch (error) {
        console.error("Failed to fetch authors:", error);
      }
    };

    fetchUsers();
    fetchAuthors();
  }, []);

  // Search handler
  const handleSearch = () => {
    setPage(0); // Reset to first page when searching
    fetchData();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedUser("");
    setSelectedAuthor("");
    setSelectedAutogenerated("");
    setPage(0);
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

  const { isLoading, isValidUser } = useValidateUserToken();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h6">
          Unauthorized access. Please log in.
        </Typography>
      </Box>
    );
  }

  return (
    <div>
      <style jsx global>
        {`
          th {
            font-weight: bold !important;
          }
        `}
      </style>

      <Typography variant="h5" gutterBottom>
        <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo;
        Superstar Site Submissions
      </Typography>

      <Box mr={1}></Box>

      {/* Search and filters */}
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="flex-end"
        alignItems="center"
        mb={2}
        gap={2}
      >
        {/* User filter */}
        <Box>
          <Typography variant="caption" display="block" gutterBottom>
            User
          </Typography>
          <Select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value as string)}
            displayEmpty
            size="small"
            style={{ minWidth: 150 }}
          >
            <MenuItem value="">
              <em>All Users</em>
            </MenuItem>
            {users.map((user, index) => (
              <MenuItem key={index} value={user.user_token}>
                {user.name} ({user.superstar_count})
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Author filter */}
        <Box>
          <Typography variant="caption" display="block" gutterBottom>
            Author
          </Typography>
          <Select
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value as string)}
            displayEmpty
            size="small"
            style={{ minWidth: 180 }}
          >
            <MenuItem value="">
              <em>All Authors</em>
            </MenuItem>
            {authors.map((author) => (
              <MenuItem key={author.id} value={author.id}>
                {author.author_name} ({author.submission_count})
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Autogenerated filter */}
        <Box>
          <Typography variant="caption" display="block" gutterBottom>
            Content Type
          </Typography>
          <Select
            value={selectedAutogenerated}
            onChange={(e) => setSelectedAutogenerated(e.target.value as string)}
            displayEmpty
            size="small"
            style={{ minWidth: 150 }}
          >
            <MenuItem value="">
              <em>All Content</em>
            </MenuItem>
            <MenuItem value="true">Autogenerated</MenuItem>
            <MenuItem value="false">Manual</MenuItem>
          </Select>
        </Box>

        {/* Search bar */}
        <Box>
          <Typography variant="caption" display="block" gutterBottom>
            Search Title
          </Typography>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            style={{ minWidth: 200 }}
          />
        </Box>

        {/* Action buttons */}
        <Box display="flex" flexDirection="column" justifyContent="flex-end">
          <Button
            onClick={handleSearch}
            variant="contained"
            color="primary"
            size="small"
          >
            Search
          </Button>
          <Button
            onClick={handleResetFilters}
            variant="outlined"
            color="secondary"
            size="small"
            style={{ marginTop: "4px" }}
          >
            Reset Filters
          </Button>
        </Box>
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
              <TableCell>Author</TableCell>
              <TableCell>Autogenerated</TableCell>
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
                      dangerouslySetInnerHTML={renderHTML(submission?.content)}
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
                <TableCell>
                  {submission.author_name ? (
                    <Box display="flex" alignItems="center">
                      {submission.author_avatar && (
                        <Box sx={{ marginRight: 1 }}>
                          <Image
                            src={submission.author_avatar}
                            alt={submission.author_name}
                            width={24}
                            height={24}
                            style={{ borderRadius: "50%" }}
                          />
                        </Box>
                      )}
                      {submission.author_name}
                    </Box>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {submission.autogenerated === 1 ? (
                    <Typography variant="body2" color="primary">
                      Autogenerated
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="secondary">
                      Manual
                    </Typography>
                  )}
                </TableCell>
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
                  <Link href={`/editSuperStarPost/${submission.id}`}>
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
                        "superstar"
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
  );
};

export default SuperstarSiteSubmissionsTable;
