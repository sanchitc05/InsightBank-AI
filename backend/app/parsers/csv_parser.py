import pandas as pd
from typing import List, Optional
import io
from app.parsers.base_parser import BaseParser

HEADER_MAP = {
    "date": "txn_date",
    "txn date": "txn_date",
    "transaction date": "txn_date",
    "value date": "txn_date",
    "narration": "description",
    "transaction remarks": "description",
    "particulars": "description",
    "description": "description",
    "remarks": "description",
    "debit": "debit",
    "withdrawal amt": "debit",
    "withdrawal amount (inr)": "debit",
    "dr": "debit",
    "credit": "credit",
    "deposit amt": "credit",
    "deposit amount (inr)": "credit",
    "cr": "credit",
    "balance": "balance",
    "closing balance": "balance",
    "running balance": "balance",
}

class CSVParser(BaseParser):
    """Parser for bank statements in CSV format."""

    async def parse(self, csv_path: str) -> pd.DataFrame:
        """Read CSV and extract transactions (Async)."""
        import asyncio
        loop = asyncio.get_event_loop()

        def _sync_csv_parse():
            try:
                # Try different encodings/delimiters if needed
                df = pd.read_csv(csv_path)
                
                # Apply column normalization
                normalized_data = []
                for _, row in df.iterrows():
                    normalized = {HEADER_MAP[col.strip().lower()]: val
                                  for col, val in row.items()
                                  if col.strip().lower() in HEADER_MAP}
                    if normalized:
                        normalized_data.append(normalized)
                
                if not normalized_data:
                    return pd.DataFrame()
                
                df = pd.DataFrame(normalized_data)
                
                # Ensure required columns exist
                required = ['txn_date', 'description']
                for col in required:
                    if col not in df.columns:
                        return pd.DataFrame()

                # Clean amounts
                if 'debit' in df.columns:
                    df['debit'] = df['debit'].fillna(0).apply(self.clean_amount)
                else:
                    df['debit'] = 0.0
                    
                if 'credit' in df.columns:
                    df['credit'] = df['credit'].fillna(0).apply(self.clean_amount)
                else:
                    df['credit'] = 0.0
                    
                if 'balance' in df.columns:
                    df['balance'] = df['balance'].fillna(0).apply(self.clean_amount)

                # Clean dates
                df['txn_date'] = df['txn_date'].apply(self._safe_parse_date)
                df = df.dropna(subset=['txn_date'])
                
                # Rename to standard internal names
                df = df.rename(columns={'txn_date': 'date'})
                
                if 'balance' in df.columns:
                    return df[['date', 'description', 'debit', 'credit', 'balance']]
                else:
                    return df[['date', 'description', 'debit', 'credit']]
                
            except Exception as e:
                return pd.DataFrame()

        return await loop.run_in_executor(None, _sync_csv_parse)

    def parse_table(self, table: list) -> List[dict]:
        """Not used for CSV."""
        return []
