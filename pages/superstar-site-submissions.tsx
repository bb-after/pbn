import { TableContainer, Paper } from "@mui/material";
import LayoutContainer from "components/LayoutContainer";
import StyledHeader from "components/StyledHeader";
import SuperstarSiteSubmissionsTable from "../components/SuperstarSiteSubmissionsTable";

const SuperstarSiteSubmissionsPage = () => {
  return (
    <LayoutContainer>
      <StyledHeader />
      <TableContainer component={Paper} style={{ padding: "0.5rem" }}>
        <h1>Superstar Sites</h1>

        <SuperstarSiteSubmissionsTable />
      </TableContainer>
    </LayoutContainer>
  );
};

export default SuperstarSiteSubmissionsPage;
