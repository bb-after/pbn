export const sendDataToStatusCrawl = async (inputData: any, hyperlinkedResponse: string): Promise<void> => {
  // Extract userToken from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const userToken = urlParams.get('token');
    debugger;
  // Check if userToken is present
  if (!userToken) {
    console.error('userToken not found in the URL.');
    return;
  }

  // Format the payload
  const payload = {
    formData: inputData,
    article: hyperlinkedResponse,
    token: userToken,
  };

  // Send the POST request
  try {
    const response = await fetch('https://sales.statuscrawl.io/api/v1/article/save', {
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
    console.error('There was a problem with the fetch operation:', error.msg);
  }
};
