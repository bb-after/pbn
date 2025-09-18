import { NextApiRequest, NextApiResponse } from 'next';
import { getRampAccessToken } from '../../../utils/rampAuth';

interface RampTransaction {
  id: string;
  user_id?: string;
  amount: number;
  currency_code: string;
  merchant_name: string;
  sk_category_name: string;
  memo: string | null;
  user_transaction_time: string;
  accounting_date: string;
  settlement_date: string;
  receipts: string[];
  card_holder: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
  accounting_categories: Array<{
    tracking_category_remote_id: string;
    tracking_category_remote_name: string;
    category_name: string;
    tracking_category_remote_type: string;
    category_id: string | null;
  }>;
  line_items?: Array<{
    amount: {
      amount: number;
      currency_code: string;
    };
    memo: string | null;
    accounting_field_selections: Array<{
      type: string;
      name: string;
      category_info: {
        id: string;
        type: string;
        name: string;
        external_id: string;
      };
    }>;
  }>;
}

interface RampUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface RampExpense {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  client: string;
  date: string;
  merchant: string;
  receipt_url?: string;
  raw_data: any; // Full raw transaction data for debugging
  parent_transaction_id?: string; // For line items, reference to parent transaction
  is_line_item?: boolean; // Flag to indicate this is a line item
  line_item_index?: number; // Index of line item in parent transaction
  total_amount?: number; // Total amount of parent transaction (for context)
  total_line_items?: number; // Total number of line items in the split
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, start_date, end_date, user_name } = req.body;

  if (!user_id || !start_date || !end_date) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters: user_id, start_date, end_date' });
  }

  console.log('Received parameters:', {
    user_id,
    start_date,
    end_date,
    user_name,
    start_date_type: typeof start_date,
    end_date_type: typeof end_date,
  });

  try {
    const accessToken = await getRampAccessToken();

    // Use the user name passed from frontend, or default
    const userName = user_name || 'Unknown User';

    // Convert dates to ISO datetime format as required by Ramp API
    const fromDateTime = new Date(start_date + 'T00:00:00.000Z').toISOString();
    const toDateTime = new Date(end_date + 'T23:59:59.999Z').toISOString();

    console.log('Date conversion:', {
      original_start: start_date,
      original_end: end_date,
      converted_from: fromDateTime,
      converted_to: toDateTime,
    });

    // Fetch transactions for the user within the date range
    const transactionsUrl = new URL('https://api.ramp.com/developer/v1/transactions');
    transactionsUrl.searchParams.append('user_id', user_id);
    transactionsUrl.searchParams.append('from_date', fromDateTime);
    transactionsUrl.searchParams.append('to_date', toDateTime);
    transactionsUrl.searchParams.append('page_size', '100');

    console.log('Transactions request URL:', transactionsUrl.toString());
    console.log('Request parameters:', {
      user_id,
      from_date: start_date,
      to_date: end_date,
      page_size: '100',
    });

    const transactionsResponse = await fetch(transactionsUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      console.error('Ramp transactions API error:', {
        status: transactionsResponse.status,
        statusText: transactionsResponse.statusText,
        body: errorText,
      });

      if (transactionsResponse.status === 401) {
        return res.status(401).json({ error: 'Authentication expired' });
      }

      return res.status(500).json({
        error: `Ramp API error: ${transactionsResponse.status} ${transactionsResponse.statusText}`,
        details: errorText,
      });
    }

    const transactionsData = await transactionsResponse.json();
    console.log(
      'Raw transactions data sample:',
      JSON.stringify(transactionsData.data?.[0], null, 2)
    );
    console.log('Full response structure:', Object.keys(transactionsData));

    const expenses: RampExpense[] = [];

    transactionsData.data.forEach((transaction: RampTransaction) => {
      // Use user_transaction_time as the transaction date (when user made the transaction)
      const transactionDate = transaction.user_transaction_time;

      // Ensure date is in a valid format for frontend
      let formattedDate: string;

      if (!transactionDate) {
        console.warn('Missing date fields for transaction:', transaction.id);
        formattedDate = new Date().toISOString(); // Fallback to current date
      } else {
        try {
          // Test if the date is valid
          const testDate = new Date(transactionDate);
          if (isNaN(testDate.getTime())) {
            console.warn('Invalid date format:', transactionDate);
            formattedDate = new Date().toISOString(); // Fallback to current date
          } else {
            // Convert to ISO string to ensure consistency
            formattedDate = testDate.toISOString();
          }
        } catch (error) {
          console.error('Date parsing error for transaction:', transaction.id, transactionDate);
          formattedDate = new Date().toISOString(); // Fallback to current date
        }
      }

      const transactionUserName = transaction.card_holder
        ? `${transaction.card_holder.first_name} ${transaction.card_holder.last_name}`
        : userName;
      const totalAmount = Math.abs(transaction.amount);

      // Check if this transaction has line items
      if (transaction.line_items && transaction.line_items.length > 1) {
        console.log(
          `Processing split transaction ${transaction.id} with ${transaction.line_items.length} line items`
        );

        // Create an expense entry for each line item
        transaction.line_items.forEach((lineItem, index) => {
          // Extract category and client from line item's accounting_field_selections
          const categorySelection = lineItem.accounting_field_selections?.find(
            sel =>
              sel.type === 'GL_ACCOUNT' && sel.category_info?.external_id === 'QuickbooksCategory'
          );
          const clientSelection = lineItem.accounting_field_selections?.find(
            sel =>
              sel.type === 'CUSTOMERS_JOBS' &&
              sel.category_info?.external_id === 'QuickbooksCustomer'
          );

          const categoryName =
            categorySelection?.name || transaction.sk_category_name || 'Uncategorized';
          const clientName = clientSelection?.name || 'No client';
          const lineItemAmount = Math.abs(lineItem.amount.amount) / 100; // Convert from cents to dollars

          expenses.push({
            id: `${transaction.id}_line_${index}`, // Unique ID for line item
            user_id: transaction.card_holder?.user_id || transaction.user_id || '',
            user_name: transactionUserName,
            amount: lineItemAmount,
            currency: lineItem.amount.currency_code,
            description: lineItem.memo || transaction.memo || 'No memo',
            category: categoryName,
            client: clientName,
            date: formattedDate,
            merchant: transaction.merchant_name || 'Unknown merchant',
            receipt_url: transaction.receipts?.[0],
            raw_data: transaction,
            parent_transaction_id: transaction.id,
            is_line_item: true,
            line_item_index: index,
            total_amount: totalAmount,
            total_line_items: transaction.line_items?.length || 0,
          });
        });
      } else {
        // No line items, process as a single transaction
        const quickbooksCategory = transaction.accounting_categories?.find(
          cat => cat.tracking_category_remote_id === 'QuickbooksCategory'
        );
        const quickbooksCustomer = transaction.accounting_categories?.find(
          cat => cat.tracking_category_remote_id === 'QuickbooksCustomer'
        );

        const categoryName =
          quickbooksCategory?.category_name || transaction.sk_category_name || 'Uncategorized';
        const clientName = quickbooksCustomer?.category_name || 'No client';

        expenses.push({
          id: transaction.id,
          user_id: transaction.card_holder?.user_id || transaction.user_id || '',
          user_name: transactionUserName,
          amount: totalAmount,
          currency: transaction.currency_code,
          description: transaction.memo || 'No memo',
          category: categoryName,
          client: clientName,
          date: formattedDate,
          merchant: transaction.merchant_name || 'Unknown merchant',
          receipt_url: transaction.receipts?.[0],
          raw_data: transaction,
          is_line_item: false,
        });
      }
    });

    res.status(200).json(expenses);
  } catch (error) {
    console.error('Error fetching Ramp expenses:', error);
    res.status(500).json({
      error: 'Failed to fetch expenses',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
