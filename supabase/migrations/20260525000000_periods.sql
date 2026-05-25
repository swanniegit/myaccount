CREATE TABLE IF NOT EXISTS acct_periods (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year       integer     NOT NULL,
  month      integer     NOT NULL CHECK (month BETWEEN 1 AND 12),
  start_date date        NOT NULL,
  end_date   date        NOT NULL,
  status     text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at  timestamptz,
  closed_by  text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_acct_periods_year_month ON acct_periods (year, month);
