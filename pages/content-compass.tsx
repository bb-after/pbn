import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Chip,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import axios from "axios";
import { useRouter } from "next/router";
import debounce from "lodash/debounce";

// Types for our data
interface Industry {
  industry_id: number;
  industry_name: string;
  blog_count?: number;
}

interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
  parent_region_id: number | null;
  blog_count?: number;
  sub_regions?: Region[];
}

interface Topic {
  topic_id: number;
  topic_title: string;
  blog_count: number;
}

interface Blog {
  id: number;
  domain: string;
  blog_id?: number;
  blog_url?: string;
}

interface Client {
  client_id: number;
  client_name: string;
}

// Step titles for the new flow
const steps = [
  "Select Client",
  "Choose Article Type",
  "Select Target",
  "View Blogs",
];

export default function ContentCompass() {
  const router = useRouter();

  // State for current step
  const [activeStep, setActiveStep] = useState(0);

  // State for our data
  const [clients, setClients] = useState<Client[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);

  // State for selected values
  const [selectedClientName, setSelectedClientName] = useState<string | null>(
    null
  );
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [articleType, setArticleType] = useState<"specific" | "general" | "">(
    ""
  );
  const [selectedTopic, setSelectedTopic] = useState<number | "">("");
  const [selectedTargetType, setSelectedTargetType] = useState<
    "industry" | "region"
  >("industry");
  const [selectedIndustry, setSelectedIndustry] = useState<number | "">("");
  const [selectedRegion, setSelectedRegion] = useState<number | "">("");

  // Loading states
  const [loadingClientNames, setLoadingClientNames] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Client name search input state
  const [clientNameSearch, setClientNameSearch] = useState<string>("");

  // Fetch client names on initial load
  useEffect(() => {
    fetchClientNames();
  }, []);

  // Fetch client names when search changes
  const debouncedFetchClientNames = useCallback(
    debounce((search: string) => {
      fetchClientNames(search);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedFetchClientNames(clientNameSearch);
  }, [clientNameSearch, debouncedFetchClientNames]);

  // Fetch topics when client is selected and specific article type is chosen
  useEffect(() => {
    if (selectedClientName && articleType === "specific") {
      fetchTopics();
    }
  }, [selectedClientName, articleType]);

  // Fetch industries and regions when client is selected and general article type is chosen
  useEffect(() => {
    if (selectedClientName && articleType === "general") {
      fetchIndustries();
      fetchRegions();
    }
  }, [selectedClientName, articleType]);

  // Fetch blogs based on the selected criteria
  useEffect(() => {
    if (articleType === "specific" && selectedTopic !== "") {
      fetchBlogsByTopic(selectedTopic as number);
    } else if (articleType === "general") {
      if (selectedTargetType === "industry" && selectedIndustry !== "") {
        fetchBlogsByIndustry(selectedIndustry as number);
      } else if (selectedTargetType === "region" && selectedRegion !== "") {
        fetchBlogsByRegion(selectedRegion as number);
      }
    }
  }, [
    articleType,
    selectedTopic,
    selectedTargetType,
    selectedIndustry,
    selectedRegion,
  ]);

  // Functions to fetch data
  const fetchClientNames = async (search?: string) => {
    try {
      setLoadingClientNames(true);
      setError(null);
      const url = `/api/client-names${
        search ? `?search=${encodeURIComponent(search)}` : ""
      }`;
      const response = await axios.get(url);
      setClients(response.data);
    } catch (err) {
      console.error("Failed to fetch client names:", err);
      setError("Failed to load client names. Please try again later.");
    } finally {
      setLoadingClientNames(false);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      setError(null);
      // Fetch all topics with blog count
      const response = await axios.get("/api/article-topics");
      setTopics(response.data);
    } catch (err) {
      console.error("Failed to fetch topics:", err);
      setError("Failed to load topics. Please try again later.");
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      setLoadingIndustries(true);
      setError(null);
      // Fetch industries with blog count
      const response = await axios.get("/api/industries?with_count=true");
      setIndustries(response.data);
    } catch (err) {
      console.error("Failed to fetch industries:", err);
      setError("Failed to load industries. Please try again later.");
    } finally {
      setLoadingIndustries(false);
    }
  };

  const fetchRegions = async () => {
    try {
      setLoadingRegions(true);
      setError(null);
      // Fetch regions with blog count and hierarchical structure
      const response = await axios.get(
        "/api/geo-regions?with_count=true&with_hierarchy=true"
      );
      setRegions(response.data);
    } catch (err) {
      console.error("Failed to fetch regions:", err);
      setError("Failed to load regions. Please try again later.");
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchBlogsByTopic = async (topicId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(`/api/blogs?topic_id=${topicId}`);
      setBlogs(response.data);
    } catch (err) {
      console.error("Failed to fetch blogs by topic:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoadingBlogs(false);
    }
  };

  const fetchBlogsByIndustry = async (industryId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(`/api/blogs?industry_id=${industryId}`);
      setBlogs(response.data);
    } catch (err) {
      console.error("Failed to fetch blogs by industry:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoadingBlogs(false);
    }
  };

  const fetchBlogsByRegion = async (regionId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(`/api/blogs?region_id=${regionId}`);
      setBlogs(response.data);
    } catch (err) {
      console.error("Failed to fetch blogs by region:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Handle reset
  const handleReset = () => {
    setActiveStep(0);
    setSelectedClientName(null);
    setSelectedClientId(null);
    setArticleType("specific");
    setSelectedTopic("");
    setSelectedTargetType("industry");
    setSelectedIndustry("");
    setSelectedRegion("");
    setBlogs([]);
  };

  // Handle client name selection
  const handleClientNameChange = (
    _event: React.SyntheticEvent,
    newValue: Client | null
  ) => {
    setSelectedClientName(newValue ? newValue.client_name : null);
    setSelectedClientId(newValue ? newValue.client_id : null);
    if (newValue) {
      setActiveStep(1); // Move to article type step automatically
    }
  };

  // Handle client name input change
  const handleClientNameInputChange = (
    _event: React.SyntheticEvent,
    newInputValue: string
  ) => {
    setClientNameSearch(newInputValue);
  };

  // Handle article type selection
  const handleArticleTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newArticleType: "specific" | "general"
  ) => {
    // Always proceed when a button is clicked, even if it's the same value
    if (newArticleType !== null) {
      // Always set the article type, even if it's the same
      setArticleType(newArticleType);
      
      // Reset selections if the article type is changing
      if (newArticleType !== articleType) {
        setSelectedTopic("");
        setSelectedTargetType("industry");
        setSelectedIndustry("");
        setSelectedRegion("");
      }
      
      // Always move to the next step
      setActiveStep(2);
    }
  };

  // Handle topic selection
  const handleTopicChange = (topicId: number) => {
    setSelectedTopic(topicId);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle target type selection (industry vs region)
  const handleTargetTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTargetType: "industry" | "region"
  ) => {
    if (newTargetType !== null) {
      // Always set the target type, even if it's the same
      setSelectedTargetType(newTargetType);

      // Reset selections
      setSelectedIndustry("");
      setSelectedRegion("");
    }
  };

  // Handle industry selection
  const handleIndustryChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setSelectedIndustry(event.target.value as number);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle region selection
  const handleRegionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedRegion(event.target.value as number);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle blog selection - Visit Blog
  const handleBlogClick = (blog: Blog) => {
    // Open blog URL in a new tab/window
    if (blog.blog_url) {
      window.open(blog.blog_url, "_blank");
    }
  };

  // Handle Submit Post click - Navigate to superstar-form
  const handleSubmitPostClick = (blog: Blog) => {
    // Determine what parameters to pass based on the selected options
    let queryParams = new URLSearchParams();

    // Always send blog info
    queryParams.append("blogId", blog.id.toString());
    if (blog.domain) {
      queryParams.append("blogName", blog.domain);
    }

    // Always add client name first in the query string (important for form pre-population)
    if (selectedClientName) {
      // Use the client parameter since that's what superstar-form expects
      queryParams.append("client", selectedClientName);

      // Also add client ID if available
      if (selectedClientId) {
        queryParams.append("clientId", selectedClientId.toString());
      }
    }

    // Add topic if specific article
    if (articleType === "specific" && selectedTopic) {
      const selectedTopicObj = topics.find((t) => t.topic_id === selectedTopic);
      if (selectedTopicObj) {
        queryParams.append("topic", selectedTopicObj.topic_title);
      }
    }

    // Add industry or region if general article
    if (articleType === "general") {
      if (selectedTargetType === "industry" && selectedIndustry) {
        const selectedIndustryObj = industries.find(
          (i) => i.industry_id === selectedIndustry
        );
        if (selectedIndustryObj) {
          queryParams.append("industry", selectedIndustryObj.industry_name);
        }
      } else if (selectedTargetType === "region" && selectedRegion) {
        const findRegionById = (
          regionId: number,
          regionsList: Region[]
        ): Region | undefined => {
          for (const region of regionsList) {
            if (region.region_id === regionId) {
              return region;
            }
            if (region.sub_regions) {
              const subRegionMatch = findRegionById(
                regionId,
                region.sub_regions
              );
              if (subRegionMatch) {
                return subRegionMatch;
              }
            }
          }
          return undefined;
        };

        const selectedRegionObj = findRegionById(
          selectedRegion as number,
          regions
        );
        if (selectedRegionObj) {
          queryParams.append("region", selectedRegionObj.region_name);
        }
      }
    }

    // Navigate to the form page
    router.push(`/superstar-form?${queryParams.toString()}`);
  };

  // Render the client name selection step
  const renderClientNameStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        Select a Client
      </Typography>
      <Autocomplete
        value={
          clients.find((c) => c.client_name === selectedClientName) || null
        }
        onChange={handleClientNameChange}
        inputValue={clientNameSearch}
        onInputChange={handleClientNameInputChange}
        options={clients}
        getOptionLabel={(option) => option.client_name}
        loading={loadingClientNames}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Client Name"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loadingClientNames ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        sx={{ mt: 2 }}
      />
    </Box>
  );

  // Render the article type selection step
  const renderArticleTypeStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        Choose Article Type for {selectedClientName}
      </Typography>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <ToggleButtonGroup
          value={articleType}
          exclusive
          onChange={handleArticleTypeChange}
          aria-label="Article Type"
          size="large"
          color="primary"
        >
          <ToggleButton value="specific" aria-label="Specific Article">
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h6">Specific Article Topic</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Find blogs that match a particular article topic
              </Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="general" aria-label="General Article">
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h6">General Article</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Find blogs by industry or geographic region
              </Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box mt={4}>
        <Button onClick={handleBack} variant="outlined" sx={{ mr: 1 }}>
          Back
        </Button>
      </Box>
    </Box>
  );

  // Render the target selection step (either topic, or industry/region)
  const renderTargetStep = () => {
    // Add back button at the top of the step
    return (
      <Box my={4}>
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Select Target for {selectedClientName}
          </Typography>
          <Button onClick={handleBack} variant="outlined" sx={{ mt: 1 }}>
            Back
          </Button>
        </Box>

        {articleType === "specific"
          ? renderTopicSelection()
          : renderGeneralArticleTargets()}
      </Box>
    );
  };

  // Render specific article topic selection
  const renderTopicSelection = () => (
    <Box>
      {loadingTopics ? (
        <Box display="flex" justifyContent="center" mt={4} mb={4}>
          <CircularProgress />
        </Box>
      ) : topics.length > 0 ? (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table aria-label="topics table">
            <TableHead>
              <TableRow>
                <TableCell width="70%">Topic</TableCell>
                <TableCell align="center">Available Blogs</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Sort topics by ID ascending */}
              {[...topics]
                .sort((a, b) => a.topic_id - b.topic_id)
                .map((topic) => (
                  <TableRow
                    key={topic.topic_id}
                    sx={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedTopic === topic.topic_id
                          ? "#e3f2fd"
                          : "inherit",
                      "&:hover": {
                        backgroundColor:
                          selectedTopic === topic.topic_id
                            ? "#e3f2fd"
                            : "#f5f5f5",
                      },
                    }}
                    onClick={() => handleTopicChange(topic.topic_id)}
                  >
                    <TableCell>
                      <Typography
                        variant="body1"
                        fontWeight={
                          selectedTopic === topic.topic_id ? "bold" : "normal"
                        }
                      >
                        #{topic.topic_id} - {topic.topic_title}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={topic.blog_count}
                        color={topic.blog_count > 0 ? "primary" : "default"}
                        variant={topic.blog_count > 0 ? "outlined" : "filled"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTopicChange(topic.topic_id);
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box py={3}>
          <Typography align="center" color="textSecondary">
            No topics found. Please try again later.
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Render general article target selection (industry or region)
  const renderGeneralArticleTargets = () => (
    <Box>
      <Box sx={{ mb: 3, mt: 2 }}>
        <ToggleButtonGroup
          value={selectedTargetType}
          exclusive
          onChange={handleTargetTypeChange}
          aria-label="Target Type"
          size="medium"
          color="primary"
        >
          <ToggleButton value="industry" aria-label="Industry">
            Target by Industry
          </ToggleButton>
          <ToggleButton value="region" aria-label="Region">
            Target by Region
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {selectedTargetType === "industry" ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select an Industry
          </Typography>

          {loadingIndustries ? (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth variant="outlined">
              <InputLabel>Industry</InputLabel>
              <Select
                value={selectedIndustry}
                onChange={handleIndustryChange}
                label="Industry"
              >
                <MenuItem value="">
                  <em>Select an industry</em>
                </MenuItem>
                {industries.map((industry) => (
                  <MenuItem
                    key={industry.industry_id}
                    value={industry.industry_id}
                  >
                    {industry.industry_name}{" "}
                    {industry.blog_count && `(${industry.blog_count} blogs)`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select a Geographic Region
          </Typography>

          {loadingRegions ? (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth variant="outlined">
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={handleRegionChange}
                label="Region"
              >
                <MenuItem value="">
                  <em>Select a region</em>
                </MenuItem>

                {/* Render regions grouped by parent */}
                {regions.map((continent) => [
                  <MenuItem
                    key={continent.region_id}
                    value={continent.region_id}
                    sx={{ fontWeight: "bold" }}
                  >
                    {continent.region_name}{" "}
                    {continent.blog_count &&
                      `- ${continent.blog_count} blog(s)`}
                  </MenuItem>,

                  continent.sub_regions &&
                    continent.sub_regions.map((country) => (
                      <MenuItem
                        key={country.region_id}
                        value={country.region_id}
                        sx={{ pl: 4 }}
                      >
                        #{country.region_id} - {country.region_name}{" "}
                        {country.blog_count && `(${country.blog_count} blogs)`}
                      </MenuItem>
                    )),
                ])}
              </Select>
            </FormControl>
          )}
        </Box>
      )}
    </Box>
  );

  // Render the blogs display step
  const renderBlogsStep = () => {
    // Prepare the heading based on selections made
    let heading = "";
    if (articleType === "specific" && selectedTopic) {
      const selectedTopicObj = topics.find((t) => t.topic_id === selectedTopic);
      heading = `Available Blogs for ${selectedClientName} - "#${selectedTopic} - ${
        selectedTopicObj?.topic_title || "Selected Topic"
      }"`;
    } else if (articleType === "general") {
      if (selectedTargetType === "industry" && selectedIndustry) {
        const selectedIndustryObj = industries.find(
          (i) => i.industry_id === selectedIndustry
        );
        heading = `Available Blogs for ${selectedClientName} in #${selectedIndustry} - ${
          selectedIndustryObj?.industry_name || "Selected Industry"
        }`;
      } else if (selectedTargetType === "region" && selectedRegion) {
        const findRegionById = (
          regionId: number,
          regionsList: Region[]
        ): Region | undefined => {
          for (const region of regionsList) {
            if (region.region_id === regionId) {
              return region;
            }
            if (region.sub_regions) {
              const subRegionMatch = findRegionById(
                regionId,
                region.sub_regions
              );
              if (subRegionMatch) {
                return subRegionMatch;
              }
            }
          }
          return undefined;
        };

        const selectedRegionObj = findRegionById(
          selectedRegion as number,
          regions
        );
        heading = `Available Blogs for ${selectedClientName} in #${selectedRegion} - ${
          selectedRegionObj?.region_name || "Selected Region"
        }`;
      }
    }

    return (
      <Box my={4}>
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            {heading}
          </Typography>
          <Button onClick={handleBack} variant="outlined" sx={{ mt: 1 }}>
            Back
          </Button>
        </Box>

        {loadingBlogs ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : blogs.length > 0 ? (
          <Grid container spacing={3} mt={2}>
            {blogs.map((blog) => (
              <Grid item xs={12} sm={6} md={4} key={blog.id || blog.blog_id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {blog.domain}
                    </Typography>
                    {selectedClientName && (
                      <Box mt={1}>
                        <Chip
                          label={`Client: ${selectedClientName}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions
                    sx={{ justifyContent: "space-between", px: 2, py: 1 }}
                  >
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => window.open(`${blog.domain}`, "_blank")}
                      startIcon={
                        <Box component="span" sx={{ fontSize: "18px" }}>
                          🔗
                        </Box>
                      }
                    >
                      Visit Blog
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      variant="contained"
                      onClick={() => handleSubmitPostClick(blog)}
                      startIcon={
                        <Box component="span" sx={{ fontSize: "18px" }}>
                          ✏️
                        </Box>
                      }
                    >
                      Submit Post
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography align="center" sx={{ py: 3 }}>
            No blogs found for the selected criteria. Please try another
            selection.
          </Typography>
        )}

        <Box mt={4}>
          <Button onClick={handleReset} variant="contained" color="primary">
            Start Over
          </Button>
        </Box>
      </Box>
    );
  };

  // Function to render the active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderClientNameStep();
      case 1:
        return renderArticleTypeStep();
      case 2:
        return renderTargetStep();
      case 3:
        return renderBlogsStep();
      default:
        return "Unknown step";
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 8, mb: 8 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Content Compass
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="textSecondary"
          paragraph
        >
          Navigate to the perfect content placement for your clients
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mt: 4, mb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Box mt={2} mb={2}>
            <Typography color="error" align="center">
              {error}
            </Typography>
          </Box>
        )}

        {getStepContent(activeStep)}
      </Paper>
    </Container>
  );
}
