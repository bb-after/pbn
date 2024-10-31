export const sendDataToStatusCrawl = async (
  inputData: any,
  hyperlinkedResponse: string,
  userToken: string
): Promise<void> => {
  if (!userToken) {
    console.error('userToken is required.');
    return;
  }
  
  const statusCrawlEndpoint = 'https://sales.statuscrawl.io/api/v1/article/save';
  // Format the payload
  const payload = {
    formData: inputData,
    article: hyperlinkedResponse,
    token: userToken,
  };

  // Send the POST request
  try {
    const response = await fetch(statusCrawlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const responseData = await response.json();
    console.log(responseData);
  } catch (error: any) {
    console.error('There was a problem with the fetch operation:', error.message);
  }
};
