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
} from "@mui/material";
import { useRouter } from "next/router";
import { styled } from "@mui/system";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";

const colors = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
];

const MyChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string | string[];
  login: string;
}

const SuperstarSites: React.FC = () => {
  const [sites, setSites] = useState<SuperstarSite[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await axios.get<SuperstarSite[]>(
          "/api/superstar-sites"
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

    fetchSites();
  }, []);

  const handleEdit = (id: number) => {
    router.push(`/superstar-sites/${id}/edit`);
  };

  const handleWPLogin = async (site: SuperstarSite) => {
    try {
      const response = await axios.get(
        `/api/get-wp-credentials?siteId=${site.id}`
      );
      const { domain, login, hosting_site } = response.data;
      console.log("we did it", login);
      if (login == null) {
        alert("no valid WP credentials found for this blog");
        return;
      }

      const loginForm = document.createElement("form");
      loginForm.method = "POST";
      loginForm.action = `${domain}/wp-login.php`;
      loginForm.target = "_blank";

      const usernameField = document.createElement("input");
      usernameField.type = "hidden";
      usernameField.name = "log";
      usernameField.value = login;
      loginForm.appendChild(usernameField);

      const passwordField = document.createElement("input");
      passwordField.type = "hidden";
      passwordField.name = "pwd";
      passwordField.value = hosting_site;
      loginForm.appendChild(passwordField);

      const rememberMeField = document.createElement("input");
      rememberMeField.type = "hidden";
      rememberMeField.name = "rememberme";
      rememberMeField.value = "forever";
      loginForm.appendChild(rememberMeField);

      document.body.appendChild(loginForm);
      loginForm.submit();
      document.body.removeChild(loginForm);
    } catch (error) {
      console.error("Error logging into WordPress:", error);
    }
  };

  const TopRightBox = styled(Box)({
    float: "right",
    marginTop: "-5rem",
    marginRight: "2rem",
  });

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
          <Button variant="contained" color="primary" href="/superstar-form">
            Submit Post
          </Button>
        </TopRightBox>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Domain</TableCell>
              <TableCell>Auto-generated Posts</TableCell>
              <TableCell>Manual Posts</TableCell>
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
                <TableCell>{site.autogenerated_count}</TableCell>
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
