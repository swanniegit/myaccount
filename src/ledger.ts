// Simple T-Account General Ledger
import { readFileSync, writeFileSync, existsSync } from 'fs';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface LedgerEntry {
  date: Date;
  description: string;
  debit: number;
  credit: number;
}

export class TAccount {
  readonly name: string;
  readonly type: AccountType;
  private entries: LedgerEntry[] = [];

  constructor(name: string, type: AccountType) {
    this.name = name;
    this.type = type;
  }

  debit(amount: number, description: string, date = new Date()): void {
    this.entries.push({ date, description, debit: amount, credit: 0 });
  }

  credit(amount: number, description: string, date = new Date()): void {
    this.entries.push({ date, description, debit: 0, credit: amount });
  }

  get totalDebits(): number {
    return this.entries.reduce((sum, e) => sum + e.debit, 0);
  }

  get totalCredits(): number {
    return this.entries.reduce((sum, e) => sum + e.credit, 0);
  }

  get balance(): number {
    // Assets & Expenses: Debit increases, Credit decreases (normal debit balance)
    // Liabilities, Equity, Revenue: Credit increases, Debit decreases (normal credit balance)
    const isDebitNormal = this.type === 'asset' || this.type === 'expense';
    return isDebitNormal
      ? this.totalDebits - this.totalCredits
      : this.totalCredits - this.totalDebits;
  }

  getEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  print(): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${this.name.toUpperCase()} (${this.type})`);
    console.log('='.repeat(50));
    console.log('  Debits          |  Credits');
    console.log('-'.repeat(50));

    const maxLen = Math.max(
      this.entries.filter(e => e.debit > 0).length,
      this.entries.filter(e => e.credit > 0).length
    );

    const debits = this.entries.filter(e => e.debit > 0);
    const credits = this.entries.filter(e => e.credit > 0);

    for (let i = 0; i < maxLen; i++) {
      const d = debits[i];
      const c = credits[i];
      const left = d ? `$${d.debit.toFixed(2).padStart(10)}` : '            ';
      const right = c ? `$${c.credit.toFixed(2).padStart(10)}` : '';
      console.log(`  ${left}      |  ${right}`);
    }

    console.log('-'.repeat(50));
    console.log(`  $${this.totalDebits.toFixed(2).padStart(10)}      |  $${this.totalCredits.toFixed(2).padStart(10)}`);
    console.log(`  Balance: $${this.balance.toFixed(2)}`);
  }

  toJSON(): { name: string; type: AccountType; entries: LedgerEntry[] } {
    return {
      name: this.name,
      type: this.type,
      entries: this.entries.map(e => ({
        ...e,
        date: e.date,
      })),
    };
  }

  static fromJSON(data: { name: string; type: AccountType; entries: LedgerEntry[] }): TAccount {
    const account = new TAccount(data.name, data.type);
    for (const entry of data.entries) {
      account.entries.push({
        ...entry,
        date: new Date(entry.date),
      });
    }
    return account;
  }
}

export interface JournalEntry {
  date: Date;
  description: string;
  debits: { account: string; amount: number }[];
  credits: { account: string; amount: number }[];
}

export class GeneralLedger {
  private accounts = new Map<string, TAccount>();
  private journal: JournalEntry[] = [];
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    if (filePath && existsSync(filePath)) {
      this.load(filePath);
    }
  }

  createAccount(name: string, type: AccountType): TAccount {
    if (this.accounts.has(name)) {
      throw new Error(`Account "${name}" already exists`);
    }
    const account = new TAccount(name, type);
    this.accounts.set(name, account);
    return account;
  }

  getAccount(name: string): TAccount | undefined {
    return this.accounts.get(name);
  }

  getAccountList(): { name: string; type: AccountType; balance: number }[] {
    return Array.from(this.accounts.values()).map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    }));
  }

  getJournal(): JournalEntry[] {
    return [...this.journal];
  }

  getTrialBalance(): { accounts: { name: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number } {
    const accounts: { name: string; debit: number; credit: number }[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const [name, account] of this.accounts) {
      const balance = account.balance;
      if (balance === 0) continue;

      const isDebitNormal = account.type === 'asset' || account.type === 'expense';
      const debit = (isDebitNormal && balance > 0) || (!isDebitNormal && balance < 0) ? Math.abs(balance) : 0;
      const credit = (!isDebitNormal && balance > 0) || (isDebitNormal && balance < 0) ? Math.abs(balance) : 0;

      totalDebit += debit;
      totalCredit += credit;
      accounts.push({ name, debit, credit });
    }

    return { accounts, totalDebit, totalCredit };
  }

  record(entry: {
    date?: Date;
    description: string;
    debits: { account: string; amount: number }[];
    credits: { account: string; amount: number }[];
  }): void {
    const date = entry.date ?? new Date();

    // Validate debits = credits
    const totalDebits = entry.debits.reduce((sum, d) => sum + d.amount, 0);
    const totalCredits = entry.credits.reduce((sum, c) => sum + c.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error(
        `Debits ($${totalDebits}) must equal Credits ($${totalCredits})`
      );
    }

    // Validate accounts exist
    for (const d of entry.debits) {
      if (!this.accounts.has(d.account)) {
        throw new Error(`Account "${d.account}" not found`);
      }
    }
    for (const c of entry.credits) {
      if (!this.accounts.has(c.account)) {
        throw new Error(`Account "${c.account}" not found`);
      }
    }

    // Record to journal
    this.journal.push({ ...entry, date });

    // Post to accounts
    for (const d of entry.debits) {
      this.accounts.get(d.account)!.debit(d.amount, entry.description, date);
    }
    for (const c of entry.credits) {
      this.accounts.get(c.account)!.credit(c.amount, entry.description, date);
    }
  }

  trialBalance(): void {
    console.log('\n' + '='.repeat(60));
    console.log('  TRIAL BALANCE');
    console.log('='.repeat(60));
    console.log('  Account'.padEnd(30) + 'Debit'.padStart(12) + 'Credit'.padStart(12));
    console.log('-'.repeat(60));

    let totalDebit = 0;
    let totalCredit = 0;

    for (const [name, account] of this.accounts) {
      const balance = account.balance;
      const isDebitNormal = account.type === 'asset' || account.type === 'expense';

      const debit = (isDebitNormal && balance > 0) || (!isDebitNormal && balance < 0)
        ? Math.abs(balance)
        : 0;
      const credit = (!isDebitNormal && balance > 0) || (isDebitNormal && balance < 0)
        ? Math.abs(balance)
        : 0;

      totalDebit += debit;
      totalCredit += credit;

      if (balance !== 0) {
        console.log(
          `  ${name.padEnd(28)}` +
          `$${debit.toFixed(2).padStart(10)}` +
          `$${credit.toFixed(2).padStart(10)}`
        );
      }
    }

    console.log('-'.repeat(60));
    console.log(
      `  ${'TOTALS'.padEnd(28)}` +
      `$${totalDebit.toFixed(2).padStart(10)}` +
      `$${totalCredit.toFixed(2).padStart(10)}`
    );
  }

  printJournal(): void {
    console.log('\n' + '='.repeat(70));
    console.log('  GENERAL JOURNAL');
    console.log('='.repeat(70));

    for (const entry of this.journal) {
      console.log(`\n  ${entry.date.toLocaleDateString()}  ${entry.description}`);
      for (const d of entry.debits) {
        console.log(`    ${d.account.padEnd(30)} $${d.amount.toFixed(2)}`);
      }
      for (const c of entry.credits) {
        console.log(`      ${c.account.padEnd(28)}        $${c.amount.toFixed(2)}`);
      }
    }
  }

  printAllAccounts(): void {
    for (const account of this.accounts.values()) {
      account.print();
    }
  }

  save(filePath?: string): void {
    const path = filePath ?? this.filePath;
    if (!path) {
      throw new Error('No file path specified');
    }

    const data = {
      accounts: Array.from(this.accounts.values()).map(a => a.toJSON()),
      journal: this.journal.map(j => ({
        ...j,
        date: j.date.toISOString(),
      })),
    };

    writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`Ledger saved to ${path}`);
  }

  load(filePath: string): void {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    this.accounts.clear();
    this.journal = [];

    for (const accountData of data.accounts) {
      const account = TAccount.fromJSON(accountData);
      this.accounts.set(account.name, account);
    }

    for (const entry of data.journal) {
      this.journal.push({
        ...entry,
        date: new Date(entry.date),
      });
    }

    console.log(`Ledger loaded from ${filePath}`);
  }
}
