import type { NextApiRequest, NextApiResponse } from 'next';
import { addMonths, format } from 'date-fns';

// Create a new deal in HubSpot with the provided deal data
async function createDealInHubSpot(dealData: {
  parentDealId: Number;
  amount: any;
  dealName: string;
  closeDate: string; // ISO string
  originalDealName: string;
  dealOwner: Number;
  // ... add any other deal properties you need
}) {
    console.log('amount', dealData.amount);
    console.log('dealOwner', dealData.dealOwner);
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      properties: {
        dealname: dealData.dealName,
        closedate: dealData.closeDate,
        amount: dealData.amount,
        original_deal_id: dealData.parentDealId,
        original_deal_name: dealData.originalDealName,
        hubspot_owner_id: dealData.dealOwner,
        dealtype: 'existingbusiness',//existing business value on hubspot backend
        dealstage: process.env.HUBSPOT_UPCOMING_RENEWAL_STAGE_ID,
        // ... any other properties (e.g., pipeline, etc.)
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error creating deal:', errorText);
    throw new Error('Failed to create deal in HubSpot');
  }

  // Return the JSON from HubSpot, which should include the newly created record's data
  const jsonData = await response.json();
  return jsonData;
}

/**
 * Returns all matching deals for the given `originalDealId` + `renewalDate` month.
 * If there are one or more results, you'll see them in the returned array.
 */
async function getExistingDealsInMonth(originalDealId: number, renewalDate: Date) {
  const startOfMonth = new Date(
    renewalDate.getFullYear(),
    renewalDate.getMonth(),
    1,
    0,
    0,
    0
  );
  const endOfMonth = new Date(
    renewalDate.getFullYear(),
    renewalDate.getMonth() + 1,
    1,
    0,
    0,
    0
  );

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
                propertyName: 'original_deal_id',
                operator: 'EQ',
                value: originalDealId,
            },
            {
              propertyName: 'closedate',
              operator: 'GTE',
              value: startOfMonth.toISOString(),
            },
            {
              propertyName: 'closedate',
              operator: 'LT',
              value: endOfMonth.toISOString(),
            },
          ],
        },
      ],
      sorts: [],
      properties: ['dealname', 'closedate', 'original_deal_id'],
      limit: 10, // you can adjust the limit if needed
    }),
  });

  if (!response.ok) {
    console.error('Error searching for existing deals:', await response.text());
    throw new Error('Failed to search deals in HubSpot');
  }

  const data = await response.json();
  // Return all matches in that month so we can log them
  return data?.results || [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check custom authentication header
    const hubspotBrettSecret = req.headers['hubspot_brett_secret'];
    if (
      !hubspotBrettSecret ||
      hubspotBrettSecret !== process.env.HUBSPOT_WEBHOOK_SECRET
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract deal fields from the request body
    const {
      dealName,
      contractTerm,
      closeDate: rawCloseDate,
      originalDealId,
      originalDealName,
      amount,
      recordId,
      dealOwner,
    } = req.body;

    if (!dealName || !rawCloseDate) {
      return res
        .status(400)
        .json({ error: 'Missing dealName or closeDate in request body' });
    }

    // Use recordId as originalDealId if not provided
    const finalParentDealId = originalDealId || recordId;
    const finalParentDealName = originalDealName || dealName;

    // Parse the original close date
    const originalCloseDate = new Date(rawCloseDate);
    if (isNaN(originalCloseDate.getTime())) {
      return res.status(400).json({ error: 'Invalid closeDate format' });
    }

    // Decide how many new deals to create
    const numberOfRenewals = contractTerm === '1' ? 3 : 1;

    // Keep track of the deals we create successfully
    const createdDeals: any[] = [];
    let skippedDeals: any[] = []; // to store any deals that we skip due to existing duplicates

    // Create each renewal deal
    for (let i = 1; i <= numberOfRenewals; i++) {
      const renewalCloseDate = addMonths(originalCloseDate, i);

      // Fetch existing deals for this month
      const existingDeals = await getExistingDealsInMonth(
        finalParentDealId,
        renewalCloseDate
      );

      if (existingDeals.length > 0) {
        // Log details about existing deals
        console.log(
          `Skipping creation — deals already exist in ${format(
            renewalCloseDate,
            'MMMM yyyy'
          )}. Found:`
        );
        console.log(JSON.stringify(existingDeals, null, 2));

        // Optionally capture these in an array to include them in the response
        skippedDeals.push({
          month: format(renewalCloseDate, 'MMMM yyyy'),
          existingDeals,
        });
        continue;
      }

      // Format the date for naming
      const monthString = format(renewalCloseDate, 'MMMM');
      const yearString = format(renewalCloseDate, 'yyyy');
      const renewalDealName = `${dealName} renewal - ${monthString} ${yearString}`;

      // Convert renewalCloseDate to ISO string for HubSpot
      const renewalCloseDateISO = renewalCloseDate.toISOString();

      // Create the new deal in HubSpot
      const hubspotResponse = await createDealInHubSpot({
        dealName: renewalDealName,
        parentDealId: finalParentDealId,
        closeDate: renewalCloseDateISO,
        amount: amount,
        originalDealName: finalParentDealName,
        dealOwner: dealOwner,
      });

      createdDeals.push(hubspotResponse);
    }

    return res.status(200).json({
      message: `Successfully processed creation of ${createdDeals.length} renewal deal(s).`,
      createdDeals,
      skippedDeals,
    });
  } catch (error: any) {
    console.error('Error in createHubspotRenewal:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
