import React, { useState, useEffect } from 'react';
import { TextField, Button, FormControl, Select, MenuItem } from '@mui/material';
import router from 'next/router';
import useValidateUserToken from '../hooks/useValidateUserToken';
import ClientDropdown from './ClientDropdown';

const SuperstarPostCaptureForm: React.FC = () => {
  const [url, setUrl] = useState(''); // State for website URL input
  const [client, setClient] = useState(''); // State for client name input
  const [clientId, setClientId] = useState<number | null>(null); // State for client ID
  const [categories, setCategories] = useState(''); // State for categories/keywords
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const { token } = useValidateUserToken(); // Get the user token using custom hook

  const [selectedUser, setSelectedUser] = useState(''); // State to hold selected user

  interface User {
    name: string;
    user_token: string; // Adjust this type based on the actual data, e.g., string, number, etc.
  }
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Function to fetch users
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/getAllUsers');
        const data = await response.json();
        setUsers(data.rows);

        // Preselect the current user based on token
        const currentUser = data.rows.find((user: User) => user.user_token === token);
        if (currentUser) {
          setSelectedUser(currentUser.user_token); // Preselect user in dropdown
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, [token]); // Only re-run this effect when the token changes

  // Handle changes to the Website URL input
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  // Handle changes to the Client Name input
  const handleClientChange = (value: string) => {
    setClient(value);
  };

  // Handle client ID changes
  const handleClientIdChange = (id: number | null) => {
    setClientId(id);
  };

  // Handle changes to the Categories input
  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategories(event.target.value);
  };

  // Function to submit the captured data to the backend
  const postToSuperstarSubmissions = async () => {
    if (!url || !client || !clientId || !selectedUser) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const response = await fetch('/api/capture-superstar-submission-by-wordpress-url', {
        method: 'POST',
        body: JSON.stringify({
          url, // URL of the article already posted on WordPress
          clientName: client, // Name of the client
          clientId: clientId, // ID of the client
          userToken: selectedUser, // Use selected user token
          categories: categories,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        setIsSubmissionSuccessful(true);
        alert(`Submission saved successfully!`);
        router.push('/superstar-site-submissions'); // Redirect to submission list page
      } else {
        alert(`Error saving submission: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving submission:', error);
      alert('Failed to save submission. Please try again.');
    }
  };

  return (
    <div>
      <FormControl component="fieldset" fullWidth>
        {/* Input for Website URL */}
        <TextField
          label="Website URL"
          value={url}
          fullWidth
          margin="normal"
          required
          placeholder="Enter the WordPress Post URL"
          onChange={handleUrlChange}
        />

        {/* Client Dropdown */}
        <ClientDropdown
          value={client}
          onChange={handleClientChange}
          onClientIdChange={handleClientIdChange}
          fullWidth
          margin="normal"
          required
          label="Client Name"
        />

        <TextField
          label="Keywords"
          value={categories}
          fullWidth
          margin="normal"
          required
          placeholder="Enter the Keywords you're targeting"
          onChange={handleCategoryChange}
        />
        <br />

        {/* Dropdown for User Selection */}
        <Select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          displayEmpty
          required
          inputProps={{ 'aria-label': 'Without label' }}
        >
          <MenuItem value="">
            <em>Select User *</em>
          </MenuItem>
          {users.map((user, index) => (
            <MenuItem key={index} value={user.user_token}>
              {user.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <br />
      <br />
      {/* Submit Button */}
      <Button
        onClick={postToSuperstarSubmissions}
        variant="contained"
        color="primary"
        disabled={!url || !client || !clientId || !selectedUser} // Disable button if any field is empty
      >
        Submit
      </Button>
    </div>
  );
};

export default SuperstarPostCaptureForm;
