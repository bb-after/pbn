// pages/pbn-site-submissions.js

import { TableContainer, Paper } from "@mui/material";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import PbnSiteSubmissionsTable from "../components/PbnSiteSubmissionsTable";

const PbnSiteSubmissionsPage = () => {
  return (
    <LayoutContainer>
      <StyledHeader />
      <TableContainer component={Paper} style={{ padding: "0.5rem" }}>
        <PbnSiteSubmissionsTable />;
      </TableContainer>
    </LayoutContainer>
  );
};

export default PbnSiteSubmissionsPage;
