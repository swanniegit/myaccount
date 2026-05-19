import express from 'express';
import { GeneralLedger } from './ledger';
import { join } from 'path';

const app = express();
const PORT = 3000;
const LEDGER_FILE = './ledger.json';

app.use(express.json());
app.use(express.static(join(import.meta.dirname, '../public')));

const gl = new GeneralLedger(LEDGER_FILE);

// Initialize default accounts if new ledger
if (gl.getAccountList().length === 0) {
  gl.createAccount('Cash', 'asset');
  gl.createAccount('Accounts Receivable', 'asset');
  gl.createAccount('Equipment', 'asset');
  gl.createAccount('Accounts Payable', 'liability');
  gl.createAccount('Owner Equity', 'equity');
  gl.createAccount('Service Revenue', 'revenue');
  gl.createAccount('Rent Expense', 'expense');
  gl.createAccount('Utilities Expense', 'expense');
  gl.save();
}

// API Routes
app.get('/api/accounts', (req, res) => {
  res.json(gl.getAccountList());
});

app.get('/api/accounts/:name', (req, res) => {
  const account = gl.getAccount(req.params.name);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json({
    name: account.name,
    type: account.type,
    balance: account.balance,
    totalDebits: account.totalDebits,
    totalCredits: account.totalCredits,
    entries: account.getEntries(),
  });
});

app.post('/api/accounts', (req, res) => {
  try {
    const { name, type } = req.body;
    gl.createAccount(name, type);
    gl.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/journal', (req, res) => {
  res.json(gl.getJournal());
});

app.post('/api/transactions', (req, res) => {
  try {
    const { description, debits, credits } = req.body;
    gl.record({ description, debits, credits });
    gl.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/trial-balance', (req, res) => {
  res.json(gl.getTrialBalance());
});

app.listen(PORT, () => {
  console.log(`Ledger UI running at http://localhost:${PORT}`);
});
