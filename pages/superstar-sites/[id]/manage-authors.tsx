import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Link,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LayoutContainer from "../../../components/LayoutContainer";
import StyledHeader from "../../../components/StyledHeader";
import useAuth from '../../../hooks/useAuth';
import Image from "next/image";

interface Author {
  id: number;
  author_name: string;
  author_email: string;
  author_username: string;
  author_avatar: string;
  author_bio: string;
  wp_author_id: number;
  submission_count?: number;
}

interface Site {
  id: number;
  domain: string;
  login: string;
  hosting_site: string;
  active: number;
}

const ManageAuthors: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [site, setSite] = useState<Site | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAuthor, setNewAuthor] = useState({
    name: "",
    email: "",
    username: "",
    bio: "",
    password: "",
  });
  const [error, setError] = useState("");

  const { isLoading: isValidating, isValidUser } = useAuth('/login');

  useEffect(() => {
    const fetchSiteData = async () => {
      if (!id || !isValidUser) return;

      setIsLoading(true);

      try {
        // Get site details
        const siteResponse = await fetch(`/api/superstar-sites/${id}`);
        if (!siteResponse.ok) throw new Error("Failed to fetch site details");
        const siteData = await siteResponse.json();
        setSite(siteData);

        // Get site authors
        const authorsResponse = await fetch(
          `/api/getSuperstarAuthors?siteId=${id}`
        );
        if (!authorsResponse.ok) throw new Error("Failed to fetch authors");
        const authorsData = await authorsResponse.json();
        setAuthors(authorsData.authors || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSiteData();
  }, [id, isValidUser]);

  const handleAddAuthor = async () => {
    // Validation
    if (
      !newAuthor.name ||
      !newAuthor.email ||
      !newAuthor.username ||
      !newAuthor.password
    ) {
      setError("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/superstar-authors/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId: id,
          name: newAuthor.name,
          email: newAuthor.email,
          username: newAuthor.username,
          password: newAuthor.password,
          bio: newAuthor.bio,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create author");
      }

      // Refresh authors list
      const authorsResponse = await fetch(
        `/api/getSuperstarAuthors?siteId=${id}`
      );
      const authorsData = await authorsResponse.json();
      setAuthors(authorsData.authors || []);

      // Reset form and close dialog
      setNewAuthor({
        name: "",
        email: "",
        username: "",
        bio: "",
        password: "",
      });
      setOpenDialog(false);
      setError("");
    } catch (error: any) {
      console.error("Error creating author:", error);
      setError(error.message || "Failed to create author");
    }
  };

  const handleDeleteAuthor = async (authorId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this author? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/superstar-authors/delete?id=${authorId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete author");
      }

      // Remove the deleted author from the list
      setAuthors(authors.filter((author) => author.id !== authorId));
    } catch (error: any) {
      console.error("Error deleting author:", error);
      alert(error.message || "Failed to delete author");
    }
  };

  if (isValidating || isLoading) {
    return (
      <LayoutContainer>
        <StyledHeader />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100vh"
        >
          <CircularProgress />
        </Box>
      </LayoutContainer>
    );
  }

  if (!isValidUser) {
    return (
      <LayoutContainer>
        <StyledHeader />
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
      </LayoutContainer>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton
            onClick={() => router.push("/superstar-sites")}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Manage Authors for {site?.domain}
          </Typography>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h6">Total Authors: {authors.length}</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Add New Author
          </Button>
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Avatar</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Bio</TableCell>
                <TableCell>Posts</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {authors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No authors found for this site. Add your first author!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                authors.map((author) => (
                  <TableRow key={author.id}>
                    <TableCell>
                      {author.author_avatar ? (
                        <Box
                          component={Image}
                          src={author.author_avatar}
                          alt={author.author_name}
                          width={40}
                          height={40}
                          sx={{
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{author.author_name}</TableCell>
                    <TableCell>{author.author_username}</TableCell>
                    <TableCell>{author.author_email}</TableCell>
                    <TableCell>
                      {author.author_bio
                        ? author.author_bio.length > 50
                          ? `${author.author_bio.substring(0, 50)}...`
                          : author.author_bio
                        : "—"}
                    </TableCell>
                    <TableCell>{author.submission_count || 0}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {author.submission_count &&
                        author.submission_count > 0 ? (
                          <Link
                            href={`/superstar-sites/authors/${author.id}/posts`}
                          >
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              View Posts
                            </Button>
                          </Link>
                        ) : null}

                        <Tooltip title="Delete Author">
                          <span>
                            {" "}
                            {/* Wrapper needed to show tooltip on disabled button */}
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteAuthor(author.id)}
                              disabled={Boolean(author?.submission_count)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {author.submission_count &&
                          author.submission_count > 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Cannot delete authors with posts
                            </Typography>
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Add Author Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Author</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Name"
              value={newAuthor.name}
              onChange={(e) =>
                setNewAuthor({ ...newAuthor, name: e.target.value })
              }
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              value={newAuthor.username}
              onChange={(e) =>
                setNewAuthor({ ...newAuthor, username: e.target.value })
              }
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              type="email"
              value={newAuthor.email}
              onChange={(e) =>
                setNewAuthor({ ...newAuthor, email: e.target.value })
              }
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={newAuthor.password}
              onChange={(e) =>
                setNewAuthor({ ...newAuthor, password: e.target.value })
              }
            />
            <TextField
              margin="normal"
              fullWidth
              label="Bio"
              multiline
              rows={4}
              value={newAuthor.bio}
              onChange={(e) =>
                setNewAuthor({ ...newAuthor, bio: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAuthor} variant="contained">
            Add Author
          </Button>
        </DialogActions>
      </Dialog>
    </LayoutContainer>
  );
};

export default ManageAuthors;
