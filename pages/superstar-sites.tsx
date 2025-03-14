import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
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
  Grid,
} from "@mui/material";
import { useRouter } from "next/router";
import { styled } from "@mui/system";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import useValidateUserToken from "hooks/useValidateUserToken";
import { handleWPLogin } from "../utils/handle-wp-login";
import { colors } from "../utils/colors";
import debounce from "lodash/debounce";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  manual_count: number;
  author_count: number;
  topics: string | string[];
  login: string;
  custom_prompt?: string;
}

type SortField = "manual_count" | "author_count" | "domain" | "id";
type SortOrder = "asc" | "desc";

const MyChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const SuperstarSites: React.FC = () => {
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [sortField, setSortField] = useState<SortField>("domain");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [customPromptFilter, setCustomPromptFilter] = useState<string>("all");

  const router = useRouter();
  const { isLoading: isAuthLoading, isValidUser } = useValidateUserToken();
  const [active, setActive] = useState<string>("1");

  // Debounced search handler
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort function
  const sortSites = (sites: SuperstarSite[]) => {
    return [...sites].sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortField === "domain") {
        return multiplier * a.domain.localeCompare(b.domain);
      }
      return multiplier * ((a[sortField] || 0) - (b[sortField] || 0));
    });
  };

  // Filter function
  const filterSites = (sites: SuperstarSite[]) => {
    return sites.filter((site) => {
      if (customPromptFilter === "all") return true;
      if (customPromptFilter === "yes") return !!site.custom_prompt;
      return !site.custom_prompt;
    });
  };

  useEffect(() => {
    const fetchSites = async () => {
      setIsFetching(true);
      try {
        const response = await axios.get<SuperstarSite[]>(
          `/api/superstar-sites?search=${debouncedSearchQuery}&active=${active}`
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
      } finally {
        setIsFetching(false);
        setIsLoading(false);
      }
    };

    if (isValidUser) {
      fetchSites();
    }
  }, [isValidUser, debouncedSearchQuery, active]);

  const handleEdit = (id: number) => {
    router.push(`/superstar-sites/${id}/edit`);
  };

  const TopRightBox = styled(Box)({
    float: "right",
    marginTop: "-5rem",
    marginRight: "2rem",
  });

  if (isAuthLoading || isLoading) {
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

  const sortedAndFilteredSites = sortSites(filterSites(sites));

  return (
    <LayoutContainer>
      <StyledHeader />
      <TableContainer component={Paper} style={{ padding: "1rem" }}>
        <h1>Superstar Sites</h1>
        <TopRightBox>
          <Button
            variant="contained"
            color="primary"
            href="/superstar-post-capture-form"
          >
            Capture WordPress Post
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

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
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
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="custom-prompt-label">Custom Prompt</InputLabel>
              <Select
                labelId="custom-prompt-label"
                value={customPromptFilter}
                onChange={(e) => setCustomPromptFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="yes">Has Custom Prompt</MenuItem>
                <MenuItem value="no">No Custom Prompt</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              variant="outlined"
              label="Search by Domain"
              fullWidth
              margin="normal"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </Grid>
        </Grid>

        {isFetching && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === "id"}
                  direction={sortField === "id" ? sortOrder : "asc"}
                  onClick={() => handleSort("id")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === "domain"}
                  direction={sortField === "domain" ? sortOrder : "asc"}
                  onClick={() => handleSort("domain")}
                >
                  Domain
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === "manual_count"}
                  direction={sortField === "manual_count" ? sortOrder : "asc"}
                  onClick={() => handleSort("manual_count")}
                >
                  Posts
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === "author_count"}
                  direction={sortField === "author_count" ? sortOrder : "asc"}
                  onClick={() => handleSort("author_count")}
                >
                  Authors
                </TableSortLabel>
              </TableCell>
              <TableCell>Topics</TableCell>
              <TableCell>Custom Prompt</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAndFilteredSites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>{site.id}</TableCell>
                <TableCell>
                  <Link href={site.domain} target="_blank">
                    {site.domain}
                  </Link>
                </TableCell>
                <TableCell>{site.manual_count}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body1" mr={1}>
                      {site.author_count || 0}
                    </Typography>
                  </Box>
                </TableCell>
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
                  <Chip
                    label={site.custom_prompt ? "Yes" : "No"}
                    color={site.custom_prompt ? "success" : "default"}
                    variant={site.custom_prompt ? "filled" : "outlined"}
                  />
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
                  <br />
                  <Link href={`/superstar-sites/${site.id}/manage-authors`}>
                    <Button variant="outlined" color="info">
                      Authors
                    </Button>
                  </Link>
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
