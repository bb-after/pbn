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
} from "@mui/material";
import axios from "axios";
import { useRouter } from "next/router";
import debounce from "lodash/debounce";

// Types for our data
interface Category {
  category_id: number;
  category_name: string;
}

interface Topic {
  topic_id: number;
  topic_title: string;
  category_id: number;
  blog_count: number;
}

interface Blog {
  id: any;
  domain: string;
  blog_id: number;
  blog_url: string;
}

interface ClientName {
  client_name: string;
}

// Step titles
const steps = ["Select Client", "Select Category", "Select Topic", "View Blogs"];

export default function ContentExplorer() {
  const router = useRouter();

  // State for current step
  const [activeStep, setActiveStep] = useState(0);

  // State for our data
  const [clientNames, setClientNames] = useState<ClientName[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);

  // State for selected values
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");
  const [selectedTopic, setSelectedTopic] = useState<number | "">("");

  // Loading states
  const [loadingClientNames, setLoadingClientNames] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
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

  // Fetch categories when a client name is selected
  useEffect(() => {
    fetchCategories();
  }, [selectedClientName]);

  // Fetch topics when a category is selected
  useEffect(() => {
    if (selectedCategory !== "") {
      fetchTopics(selectedCategory as number);
    } else {
      setTopics([]);
    }
  }, [selectedCategory]);

  // Fetch blogs when a topic is selected
  useEffect(() => {
    if (selectedTopic !== "") {
      fetchBlogs(selectedTopic as number);
    } else {
      setBlogs([]);
    }
  }, [selectedTopic]);

  // Functions to fetch data
  const fetchClientNames = async (search?: string) => {
    try {
      setLoadingClientNames(true);
      setError(null);
      const url = `/api/client-names${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const response = await axios.get(url);
      setClientNames(response.data);
    } catch (err) {
      console.error("Failed to fetch client names:", err);
      setError("Failed to load client names. Please try again later.");
    } finally {
      setLoadingClientNames(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setError(null);
      const response = await axios.get("/api/categories");
      setCategories(response.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Failed to load categories. Please try again later.");
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchTopics = async (categoryId: number) => {
    try {
      setLoadingTopics(true);
      setError(null);
      const response = await axios.get(
        `/api/article-topics?category_id=${categoryId}`
      );
      setTopics(response.data);
    } catch (err) {
      console.error("Failed to fetch topics:", err);
      setError("Failed to load topics. Please try again later.");
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchBlogs = async (topicId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(`/api/blogs?topic_id=${topicId}`);
      setBlogs(response.data);
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Handle reset
  const handleReset = () => {
    setActiveStep(0);
    setSelectedClientName(null);
    setSelectedCategory("");
    setSelectedTopic("");
    setBlogs([]);
  };

  // Handle client name selection
  const handleClientNameChange = (
    _event: React.SyntheticEvent,
    newValue: string | null
  ) => {
    setSelectedClientName(newValue);
    if (newValue) {
      setActiveStep(1); // Move to category step automatically
    }
  };

  // Handle client name input change
  const handleClientNameInputChange = (
    _event: React.SyntheticEvent, 
    newInputValue: string
  ) => {
    setClientNameSearch(newInputValue);
  };

  // Handle category selection
  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    setSelectedTopic("");
    setActiveStep(2); // Move to topic step automatically (was 1 before)
  };

  // Handle topic selection
  const handleTopicChange = (topicId: number) => {
    setSelectedTopic(topicId);
    setActiveStep(3); // Move to blog step automatically (was 2 before)
  };

  // Handle blog selection - Visit Blog
  const handleBlogClick = (blog: Blog) => {
    // Open blog URL in a new tab/window
    window.open(blog.blog_url, "_blank");
  };

  // Handle Submit Post click - Navigate to superstar-form
  const handleSubmitPostClick = (blog: Blog) => {
    // Find the selected topic and category objects
    const selectedTopicObj = topics.find(
      (topic) => topic.topic_id === selectedTopic
    );
    const selectedCategoryObj = categories.find(
      (category) => category.category_id === selectedCategory
    );

    // Construct URL with query parameters
    let url = `/superstar-form?`;

    // Add blog ID parameter
    url += `blogId=${blog.id}`;

    // Add blog name for display purposes
    url += `&blogName=${encodeURIComponent(blog.domain)}`;

    // Add topic information if available
    if (selectedTopicObj) {
      url += `&topic=${encodeURIComponent(selectedTopicObj.topic_title)}`;
    }

    // Add category information if available
    if (selectedCategoryObj) {
      url += `&category=${encodeURIComponent(
        selectedCategoryObj.category_name
      )}`;
    }

    // Add client name information if available
    if (selectedClientName) {
      url += `&clientName=${encodeURIComponent(selectedClientName)}`;
    }

    // Navigate to the form page
    router.push(url);
  };

  // Render the category selection step
  const renderCategoryStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        {selectedClientName ? `Select a Category for ${selectedClientName}` : "Select a Category"}
      </Typography>
      <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={selectedCategory}
          onChange={handleCategoryChange}
          label="Category"
          disabled={loadingCategories}
          displayEmpty
          renderValue={(selected) => {
            const selectedCategoryObj = categories.find(
              (category) => category.category_id === selected
            );
            return selectedCategoryObj ? selectedCategoryObj.category_name : "";
          }}
        >
          <MenuItem disabled value="">
            <em>Select a category</em>
          </MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.category_id} value={category.category_id}>
              {category.category_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {loadingCategories && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}
      <Box mt={4}>
        <Button onClick={handleBack} variant="outlined" sx={{ mr: 1 }}>
          Back
        </Button>
      </Box>
    </Box>
  );

  // Render the topic selection step
  const renderTopicStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        {(() => {
          const selectedCategoryObj = categories.find(
            (category) => category.category_id === selectedCategory
          );
          const categoryName = selectedCategoryObj ? selectedCategoryObj.category_name : "Selected Category";
          
          if (selectedClientName) {
            return `Select a Topic for ${selectedClientName} in ${categoryName}`;
          }
          return `Select a Topic in ${categoryName}`;
        })()}
      </Typography>

      {loadingTopics ? (
        <Box display="flex" justifyContent="center" mt={4} mb={4}>
          <CircularProgress />
        </Box>
      ) : topics.length > 0 ? (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {topics.map((topic) => (
            <Grid item xs={12} sm={6} md={4} key={topic.topic_id}>
              <Card
                sx={{
                  cursor: "pointer",
                  height: "100%",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: 6,
                  },
                  backgroundColor:
                    selectedTopic === topic.topic_id ? "#e3f2fd" : "white",
                  borderColor:
                    selectedTopic === topic.topic_id
                      ? "primary.main"
                      : "divider",
                  borderWidth: selectedTopic === topic.topic_id ? 2 : 1,
                  borderStyle: "solid",
                }}
                onClick={() => handleTopicChange(topic.topic_id)}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    align="center"
                  >
                    {topic.topic_title}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    mt={2}
                    flexDirection="column"
                  >
                    <Chip
                      label={
                        topic.blog_count === 1
                          ? "1 blog available"
                          : `${topic.blog_count} blogs available`
                      }
                      color={topic.blog_count > 0 ? "primary" : "default"}
                      variant={topic.blog_count > 0 ? "outlined" : "filled"}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    {selectedTopic === topic.topic_id && (
                      <Typography
                        color="primary"
                        variant="subtitle2"
                        sx={{ mt: 1 }}
                      >
                        Selected
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box py={3}>
          <Typography align="center" color="textSecondary">
            No topics found for this category.
          </Typography>
        </Box>
      )}

      <Box mt={4}>
        <Button onClick={handleBack} variant="outlined" sx={{ mr: 1 }}>
          Back
        </Button>
      </Box>
    </Box>
  );

  // Render the blogs display step
  const renderBlogsStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        {(() => {
          const selectedTopicObj = topics.find(
            (topic) => topic.topic_id === selectedTopic
          );
          const topicName = selectedTopicObj
            ? `"${selectedTopicObj.topic_title}"`
            : "Selected Topic";
            
          if (selectedClientName) {
            return `Available Blogs for ${selectedClientName} - ${topicName}`;
          }
          return `Available Blogs for ${topicName}`;
        })()}
      </Typography>
      {loadingBlogs ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : blogs.length > 0 ? (
        <Grid container spacing={3} mt={2}>
          {blogs.map((blog) => (
            <Grid item xs={12} sm={6} md={4} key={blog.blog_id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {blog.domain}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    component="p"
                    noWrap
                  >
                    {blog.blog_url}
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
                    onClick={() => handleBlogClick(blog)}
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
        <Typography>No blogs found for this topic.</Typography>
      )}
      <Box mt={4}>
        <Button onClick={handleBack} variant="outlined" sx={{ mr: 1 }}>
          Back
        </Button>
        <Button onClick={handleReset} variant="contained" color="primary">
          Start Over
        </Button>
      </Box>
    </Box>
  );

  // Render the client name selection step
  const renderClientNameStep = () => (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        Select a Client
      </Typography>
      <Autocomplete
        value={selectedClientName}
        onChange={handleClientNameChange}
        inputValue={clientNameSearch}
        onInputChange={handleClientNameInputChange}
        options={clientNames.map(c => c.client_name)}
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
                  {loadingClientNames ? <CircularProgress color="inherit" size={20} /> : null}
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

  // Function to render the active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderClientNameStep();
      case 1:
        return renderCategoryStep();
      case 2:
        return renderTopicStep();
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
          Content Explorer
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="textSecondary"
          paragraph
        >
          Browse content by category, topic, and blog
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
