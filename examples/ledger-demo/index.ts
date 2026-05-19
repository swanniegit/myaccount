import { GeneralLedger } from './ledger';
import { existsSync } from 'fs';

const LEDGER_FILE = './ledger.json';

// Create or load general ledger
const gl = new GeneralLedger(LEDGER_FILE);

// Only set up accounts and transactions if starting fresh
if (!existsSync(LEDGER_FILE)) {
  console.log('Creating new ledger...\n');

  // Set up chart of accounts
  gl.createAccount('Cash', 'asset');
  gl.createAccount('Accounts Receivable', 'asset');
  gl.createAccount('Equipment', 'asset');
  gl.createAccount('Accounts Payable', 'liability');
  gl.createAccount('Owner Equity', 'equity');
  gl.createAccount('Service Revenue', 'revenue');
  gl.createAccount('Rent Expense', 'expense');
  gl.createAccount('Utilities Expense', 'expense');

  // Owner invests $10,000 cash
  gl.record({
    description: 'Owner initial investment',
    debits: [{ account: 'Cash', amount: 10000 }],
    credits: [{ account: 'Owner Equity', amount: 10000 }],
  });

  // Purchase equipment for $3,000 cash
  gl.record({
    description: 'Purchase equipment',
    debits: [{ account: 'Equipment', amount: 3000 }],
    credits: [{ account: 'Cash', amount: 3000 }],
  });

  // Provide services for $2,500 on account
  gl.record({
    description: 'Services provided on account',
    debits: [{ account: 'Accounts Receivable', amount: 2500 }],
    credits: [{ account: 'Service Revenue', amount: 2500 }],
  });

  // Pay rent $800
  gl.record({
    description: 'Pay monthly rent',
    debits: [{ account: 'Rent Expense', amount: 800 }],
    credits: [{ account: 'Cash', amount: 800 }],
  });

  // Receive $1,500 from customer
  gl.record({
    description: 'Collect from customer',
    debits: [{ account: 'Cash', amount: 1500 }],
    credits: [{ account: 'Accounts Receivable', amount: 1500 }],
  });

  // Pay utilities $150
  gl.record({
    description: 'Pay utilities',
    debits: [{ account: 'Utilities Expense', amount: 150 }],
    credits: [{ account: 'Cash', amount: 150 }],
  });

  // Save the ledger
  gl.save();
}

// Print reports
gl.printJournal();
gl.printAllAccounts();
gl.trialBalance();
