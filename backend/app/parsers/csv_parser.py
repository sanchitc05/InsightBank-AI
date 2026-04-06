import pandas as pd
from typing import List, Optional
import io
from app.parsers.base_parser import BaseParser

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
                
                # Map common column names to standard internal names
                column_map = {
                    'Date': 'date', 'Tran Date': 'date', 'Value Date': 'date', 'Transaction Date': 'date',
                    'Narration': 'description', 'Description': 'description', 'Transaction Remarks': 'description',
                    'Debit': 'debit', 'Withdrawal': 'debit', 'Withdrawal Amt': 'debit',
                    'Credit': 'credit', 'Deposit': 'credit', 'Deposit Amt': 'credit',
                    'Balance': 'balance', 'Closing Balance': 'balance'
                }
                
                # Rename columns based on map
                df = df.rename(columns={c: column_map[c] for c in df.columns if c in column_map})
                
                # Ensure required columns exist
                required = ['date', 'description']
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
                df['date'] = df['date'].apply(self._safe_parse_date)
                df = df.dropna(subset=['date'])
                
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
