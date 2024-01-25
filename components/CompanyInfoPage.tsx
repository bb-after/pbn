import axios from 'axios';
import cheerio from 'cheerio';
import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import Image from 'next/image';
import {
  TextField,
  Button
} from '@mui/material';



// import { fetchCompanyWikipediaText } from '../fetchCompanyWikipediaText'; // Update with the correct import path

const CompanyInfoPage: React.FC = () => {
  const [companyName, setCompanyName] = useState<string>('');
  const [wikipediaText, setWikipediaText] = useState<string | null>(null);
/////
const [matchCount, setMatchCount] = useState(0); // Assuming you have this state defined somewhere
const [wikiMatchCount, setWikiMatchCount] = useState(0); // Assuming you have this state defined somewhere
const [totalCount, setTotalCount] = useState(0); // Assuming you have this state defined somewhere
const [noWikiFoundCount, setNoWikiFoundCount] = useState(0);
const [exportDataList, setExportDataList] = useState<{ companyName: string; wikipediaText: string}[]>([]);
const [noWikiFoundExportDataList, setNoWikiFoundExportDataList] = useState<{ companyName: string; }[]>([]);
const [wikiFoundExportDataList, setWikiFoundExportDataList] = useState<{ companyName: string; }[]>([]);
const [companyInfo, setCompanyInfo] = useState(null); // To store Clearbit company info
const [isLoading, setIsLoading] = useState(false);
const headerTags = ["h2", "h3", "h4"]; // Add any other relevant header tags

async function fetchCompanyWikipediaText(companyName: string): Promise<string | null> {
    console.log('here', companyName);
    try {
        const response = await axios.get(`/api/wikipedia?companyName=${encodeURIComponent(companyName)}`);
        const html = response.data;
      
    // Check if the response status is OK
    if (response.status === 200) {
      // Load the HTML content into Cheerio for parsing
      const $ = cheerio.load(response.data);

      // Extract the main text content from the page (you may need to customize this based on the Wikipedia page structure)
      const mainText = $('#mw-content-text').html();
      if (mainText) {
        // Return the parsed text
        return mainText.trim();
      } else {
        return '';
      }
    } else {
      console.error(`Failed to retrieve Wikipedia page for ${companyName}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error while fetching Wikipedia page` + error);
    return null;
  }
}

function containsText(element: any, searchText: string) {
    return element.text().toLowerCase().includes(searchText.toLowerCase());
}

function parseSections(html: string) {
  const sectionHeaders = [
    "Controversy",
    "Lawsuit",
    "Litigation",
    "Investigation", 
    "Ethical", 
    "Concern",
    "Controversies", 
    "Employee Strike",
    "Consumer Complaints",
    "Financial Troubles",
    "Bankrupt",
    "Issue",
    "Copyright",
    "Infring",
    "CEO Resignation",
    "CEO Departure",
    "Regulatory Issue", 
    "Recall", 
    "Scandal", 
    "Arrest", 
    "Trial", 
    "Fraud", 
    "Critiques", 
    "Negative", 
    "Reactions"
  ];
  const $ = cheerio.load(html);
  console.log($.html()); 
  const sectionData: { [key: string]: string } = {};

  sectionHeaders.forEach((header) => {
    headerTags.forEach((tag) => {
      const sections = $(tag);
      sections.each((index, section) => {
          if (containsText($(section), header)) {
            var matchingSection = $(section).nextUntil(headerTags.join(', ')).text();
            // fallback case for empty sections
            if (matchingSection.trim() == '')
            {

              
              var allContent = $(section).nextAll().addBack().map(function() {
                return $(this).prop('outerHTML');
              }).get().join('');

              var $content = cheerio.load(allContent);

              var referencesSection = $content('#References').parent();
              referencesSection.nextAll().remove();
              referencesSection.remove();

              // Remove the parent <h2> tags of elements with #References and #External_links
              var externalLinksSection = $content('#External_links').parent();
              externalLinksSection.nextAll().remove();
              externalLinksSection.remove();

              var seeAlsoSection = $content('#See_also').parent();
              seeAlsoSection.nextAll().remove();
              seeAlsoSection.remove();

              // Now $content.html() will have the HTML without the specified sections
              var sectionDataWithoutReferencesAndExternalLinks = $content.html();
              sectionData[header] = sectionDataWithoutReferencesAndExternalLinks;

            } else {
              sectionData[header] = matchingSection;
            }
            if (sectionData[header])
              return false; // Stop searching after finding the first occurrence
          }
      });
    });
  }); 


  return sectionData;
}

  useEffect(() => {
    // Function to fetch data from Clearbit
    const fetchCompanyInfo = async (companyName: any) => {
      try {
        setIsLoading(true);

        // Make a request to your Next.js API endpoint
        const response = await fetch(`/api/clearbit?companyName=${encodeURIComponent(companyName)}`);
        if (response.ok) {
          console.log("clearbit data?", response);
          const data = await response.json();
          setCompanyInfo(data); // Store Clearbit data in state
        } else {
          console.error('Clearbit API request failed');
          // Handle error if needed
        }
      } catch (error) {
        console.error('Error fetching Clearbit data:', error);
        // Handle error if needed
      } finally {
        setIsLoading(false);
      }
    };

    // Call fetchCompanyInfo when setWikipediaText is called
    if (wikipediaText) {
      // const companyName = 'YourCompanyName'; // Replace with your actual company name
      fetchCompanyInfo(companyName);
    }
  }, [wikipediaText]);
  
  const exportData = (data: { companyName: string, wikipediaText: string }[]) => {
    const csvRows = ['Company Name,Wikipedia Text'];

    // Add rows with data
    data.forEach(({ companyName, wikipediaText }) => {
      // Handle nullable fields
      const safeCompanyName = companyName ? companyName.replace(/"/g, '""') : '';
      const safeWikipediaText = wikipediaText ? wikipediaText.replace(/"/g, '""') : '';
      csvRows.push(`"${safeCompanyName}","${safeWikipediaText}"`);
    });

    // Create a Blob from the CSV String
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });

    // Use file-saver to save the file
    saveAs(blob, 'export.csv');
  };

  const exportDataNoWikiPage = (data: { companyName: string }[]) => {
    const csvRows = ['Company Name']; // Only Company Name needed
  
    data.forEach(({ companyName }) => {
      // Handle nullable fields
      const safeCompanyName = companyName ? companyName.replace(/"/g, '""') : '';
      csvRows.push(`"${safeCompanyName}"`);
    });
    
    // Create a Blob from the CSV String
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
  
    // Use file-saver to save the file
    saveAs(blob, 'companies_without_wikipedia_page.csv');
  };
  
  
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyNames = companyName.split('\n');
    let allCombinedText = ''; // Initialize a variable to accumulate content for all companies
    let searchIndex = 1;
    let matches = 0;
    let wikiMatches = 0;
    let noWikiFoundMatches = 0;
    setTotalCount(companyNames.length);  
    setMatchCount(0);
    setWikiMatchCount(0);
    setNoWikiFoundCount(0);
    setExportDataList([]);
    setNoWikiFoundExportDataList([]);
    setWikiFoundExportDataList([]);

    companyNames.forEach(async (company) => {

      // Call the fetchCompanyWikipediaText function with the user-generated companyName
      const text = await fetchCompanyWikipediaText(company);
      if (text) {
          console.log(`Wikipedia Text for ${company}:\n${text}`);
          const controversySections = parseSections(text);
          console.log("CONTROVERSY?!?", controversySections);
          if (Object.keys(controversySections).length > 0) {
            const combinedText = Object.keys(controversySections)
            .filter((header) => controversySections[header])
            .map((header) => (
              `<div key="${header}">
                <h3>${header} Section:</h3>
                <p>${controversySections[header]}</p>
              </div>`
            )).join(''); // Concatenate the JSX elements into a single string
        
            // Update the state with the combined text
            const companyContent = `<h2>${searchIndex}.  ${company}</h2>${combinedText}<br><br><br>`;

            allCombinedText += companyContent;
            setExportDataList((prevData) => [...prevData, { companyName: company, wikipediaText: combinedText.replace(/<[^>]*>?/gm, '') }]);

            matches++;
            setMatchCount(matches);
          } else {
            wikiMatches++;
            setWikiMatchCount(wikiMatches);
            setWikiFoundExportDataList((prevData) => [...prevData, { companyName: company }]);
            allCombinedText += `<div className="error"><h2>${searchIndex}.  ${company}</h2>No controversy found for ${company}<br><br><br></div>`;
          }
      } else {
        noWikiFoundMatches++;
        setNoWikiFoundCount(noWikiFoundMatches);
        setNoWikiFoundExportDataList((prevData) => [...prevData, { companyName: company }]);
        console.log(`Wikipedia page not found for ${company}`);
        allCombinedText += `<div className="error"><h2>${searchIndex}.  ${company}</h2>  No Wikipedia page found for ${company}<br><br><br></div>`;
      }

      searchIndex++;
      setWikipediaText(allCombinedText);
    });
  };

  return (

    <div style={{ padding: 16, margin: 'auto', maxWidth: 750, overflow: 'auto', background: '#ffffff' }}>
        <div style={{ background: '#000', padding: 3 }}>
        <style jsx global>
          {`
            h1 {
              font-family: 'Bungee Inline', sans-serif;
              font-weight: 400;
              font-size: 50px;
              margin-top: 20px;
            }
            body {
              background: #eee;
            }
          `}
        </style>
        <Image
          priority
          src="/images/sl-logo.png"
          width={720}
          height={80}	
          style={{ objectFit: 'contain' }}
          alt=""
        />

        </div>
        <h1>Wiki Scraper</h1>
        
        <div>
        <form onSubmit={handleSubmit}>
          <p>Wikiscraper detects companies with Wikipedia controversies, pages, or no presence and exports the results.</p>
          <br /><br />
          <label>
            <TextField
              label="Companies (separate by line breaks)"
              value={companyName}
              fullWidth
              margin="normal"
              required
              multiline
              rows={4}
              placeholder="Company names separated by line breaks"
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>

          <Button type="submit" variant="contained" color="primary">
            Find Wikipedia Pages
          </Button>

        </form>
        {wikipediaText !== null && (
        <div style={{ float: 'left', clear: 'both' }}>
          <br />
            <h2>Results: {matchCount} / {totalCount}</h2>
            <Button onClick={() => exportData(exportDataList)} variant="outlined">Export Controversy Matches ({matchCount})</Button>
            &nbsp;<br /><br />
            <Button onClick={() => exportDataNoWikiPage(wikiFoundExportDataList)} variant="outlined">Export Wiki Matches but no Controversy ({wikiMatchCount})</Button>
            &nbsp;<br /><br />
            <Button onClick={() => exportDataNoWikiPage(noWikiFoundExportDataList)} variant="outlined">Export Companies Without Wikipedia Page ({noWikiFoundCount})</Button>
            <div className="wikipediaResultsHolder" dangerouslySetInnerHTML={{ __html: wikipediaText }}></div>


          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoPage;
