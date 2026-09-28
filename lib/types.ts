export interface Borrower {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  principal: number;
  interest_rate: number;
  start_date: string;
  status: "active" | "closed" | "cancelled";
  notes: string | null;
  created_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  paid_on: string;
  note: string | null;
  created_at: string;
}
