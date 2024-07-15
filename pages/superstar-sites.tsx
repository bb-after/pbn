import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  Link,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import { useRouter } from "next/router";
import { styled } from "@mui/system";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import useValidateUserToken from "hooks/useValidateUserToken";
import { handleWPLogin } from "./handle-wp-login";
import { colors } from "./colors";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  manual_count: number;
  topics: string | string[];
  login: string;
}
const MyChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const SuperstarSites: React.FC = () => {
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const router = useRouter();
  const { isLoading, isValidUser } = useValidateUserToken();
  const [active, setActive] = useState<string>("1");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await axios.get<SuperstarSite[]>(
          `/api/superstar-sites?search=${searchQuery}&active=${active}`
        );

        const parsedData = response.data.map((site) => ({
          ...site,
          topics: Array.isArray(site.topics)
            ? site.topics
            : site.topics
            ? site.topics.split(",")
            : [],
        }));
        setSites(parsedData);
      } catch (error) {
        console.error("Error fetching sites:", error);
      }
    };

    if (isValidUser) {
      fetchSites();
    }
  }, [isValidUser, searchQuery, active]);

  const handleEdit = (id: number) => {
    router.push(`/superstar-sites/${id}/edit`);
  };

  const TopRightBox = styled(Box)({
    float: "right",
    marginTop: "-5rem",
    marginRight: "2rem",
  });

  if (isLoading) {
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
      <TableContainer component={Paper}>
        <h1>Superstar Sites</h1>
        <TopRightBox>
          <Button variant="contained" color="primary" href="/superstar">
            New AI Post
          </Button>
          &nbsp;
          <Button variant="contained" color="secondary" href="/superstar-form">
            Submit Post
          </Button>
          &nbsp;
          <Button
            variant="contained"
            color="warning"
            href="/superstar-sites/new"
          >
            New Site
          </Button>
        </TopRightBox>

        <FormControl fullWidth margin="normal">
          <InputLabel id="active-label">Status</InputLabel>
          <Select
            labelId="active-label"
            value={active}
            onChange={(e) => setActive(e.target.value as string)}
          >
            <MenuItem value="1">Active</MenuItem>
            <MenuItem value="0">Inactive</MenuItem>
          </Select>
        </FormControl>
        <TextField
          variant="outlined"
          label="Search by Domain"
          fullWidth
          margin="normal"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Domain</TableCell>
              <TableCell>Posts</TableCell>
              <TableCell>Topics</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>{site.id}</TableCell>
                <TableCell>
                  <Link href={site.domain} target="_blank">
                    {site.domain}
                  </Link>
                </TableCell>
                <TableCell>{site.manual_count}</TableCell>
                <TableCell>
                  {(Array.isArray(site.topics) ? site.topics : []).map(
                    (topic, index) => (
                      <MyChip
                        key={index}
                        label={topic}
                        style={{
                          backgroundColor: colors[index % colors.length],
                          color: "#fff",
                        }}
                      />
                    )
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleEdit(site.id)}
                  >
                    Edit
                  </Button>
                  <br />
                  <br />
                  <Button variant="contained" color="secondary">
                    Delete
                  </Button>

                  {site.login ? (
                    <Box>
                      <br />
                      <Button
                        sx={{ backgroundColor: "#64b5f6" }}
                        variant="contained"
                        onClick={() => handleWPLogin(site)}
                      >
                        Wordpress
                      </Button>
                    </Box>
                  ) : (
                    ""
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </LayoutContainer>
  );
};

export default SuperstarSites;
