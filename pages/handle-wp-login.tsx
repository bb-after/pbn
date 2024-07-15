// handleWPLogin.ts
import axios from "axios";

interface SuperstarSite {
  id: number;
  domain: string;
  hosting_site: string;
  manual_count: number;
  topics: string | string[];
  login: string;
}

export const handleWPLogin = async (site: SuperstarSite) => {
  try {
    const response = await axios.get(
      `/api/get-wp-credentials?siteId=${site.id}`
    );
    const { domain, login, hosting_site } = response.data;
    if (login == null) {
      alert("No valid WP credentials found for this blog");
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
