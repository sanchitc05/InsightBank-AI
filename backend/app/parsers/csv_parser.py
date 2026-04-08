import pandas as pd
from typing import List, Optional
import io
from app.parsers.base_parser import BaseParser

HEADER_MAP = {
    "date": "txn_date",
    "txn date": "txn_date",
    "trans date": "txn_date",
    "transaction date": "txn_date",
    "value date": "txn_date",
    "value_date": "txn_date",
    "trans_date": "txn_date",
    "narration": "description",
    "transaction remarks": "description",
    "particulars": "description",
    "description": "description",
    "remarks": "description",
    "narration/remarks": "description",
    "narration_remark": "description",
    "debit": "debit",
    "withdrawal": "debit",
    "withdrawal amt": "debit",
    "withdrawal amount (inr)": "debit",
    "dr": "debit",
    "debit amount": "debit",
    "amount out": "debit",
    "credit": "credit",
    "deposit": "credit",
    "deposit amt": "credit",
    "deposit amount (inr)": "credit",
    "cr": "credit",
    "credit amount": "credit",
    "amount in": "credit",
    "amount": "credit",
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
                # Try delimiter sniffing and multiple encodings
                try:
                    df = pd.read_csv(csv_path, sep=None, engine='python', encoding='utf-8')
                except Exception:
                    try:
                        df = pd.read_csv(csv_path, encoding='latin1')
                    except Exception:
                        df = pd.read_csv(csv_path, encoding='utf-8', errors='replace')
                
                # Apply column normalization
                normalized_data = []
                for _, row in df.iterrows():
                    normalized = {}
                    for col, val in row.items():
                        if not isinstance(col, str):
                            continue
                        key = col.strip().lower()
                        if key in HEADER_MAP:
                            mapped = HEADER_MAP[key]
                            normalized[mapped] = val
                    
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

    def _safe_parse_date(self, val):
        """CSV-specific robust date parsing: try BaseParser formats then pandas fallback."""
        # Use BaseParser static method if available
        try:
            base = super()._safe_parse_date(val)
            if base:
                return base
        except Exception:
            pass

        try:
            parsed = pd.to_datetime(val, dayfirst=True, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.date()
        except Exception:
            return None

    def parse_table(self, table: list) -> List[dict]:
        """Not used for CSV."""
        return []
