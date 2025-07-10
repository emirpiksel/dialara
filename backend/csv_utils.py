"""
CSV parsing utilities for lead import functionality
"""

import pandas as pd
import logging
from typing import List, Dict, Any, Tuple, Optional
from io import StringIO, BytesIO
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class CSVParseError(Exception):
    """Custom exception for CSV parsing errors"""
    pass

class LeadCSVParser:
    """
    Handles parsing of CSV/XLSX files for lead import
    """
    
    # Mapping of common column names to our lead fields
    FIELD_MAPPINGS = {
        'full_name': ['name', 'full_name', 'full name', 'contact_name', 'contact name', 'customer_name', 'customer name'],
        'phone_number': ['phone', 'phone_number', 'phone number', 'mobile', 'telephone', 'tel', 'contact_phone'],
        'email': ['email', 'email_address', 'email address', 'e-mail', 'contact_email'],
        'clinic_name': ['clinic', 'clinic_name', 'clinic name', 'company', 'company_name', 'company name', 'organization', 'business_name'],
        'source': ['source', 'lead_source', 'lead source', 'origin'],
        'status': ['status', 'lead_status', 'lead status'],
        'notes': ['notes', 'note', 'comments', 'comment', 'description', 'remarks'],
    }
    
    VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost']
    VALID_SOURCES = ['call', 'web', 'referral']
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.processed_count = 0
        self.skipped_count = 0
    
    def normalize_column_name(self, col_name: str) -> str:
        """Normalize column name for matching"""
        return col_name.lower().strip().replace('_', ' ')
    
    def map_columns(self, df_columns: List[str]) -> Dict[str, str]:
        """
        Map CSV columns to our lead fields
        Returns a mapping of our_field -> csv_column
        """
        column_mapping = {}
        normalized_columns = {self.normalize_column_name(col): col for col in df_columns}
        
        for our_field, possible_names in self.FIELD_MAPPINGS.items():
            for possible_name in possible_names:
                if possible_name in normalized_columns:
                    column_mapping[our_field] = normalized_columns[possible_name]
                    break
        
        return column_mapping
    
    def validate_phone_number(self, phone: str) -> Optional[str]:
        """Validate and normalize phone number"""
        if not phone or pd.isna(phone):
            return None
        
        phone = str(phone).strip()
        # Remove common formatting characters
        phone = re.sub(r'[\s\-\(\)\+\.]', '', phone)
        
        # Basic validation - should contain only digits and be reasonable length
        if re.match(r'^\d{10,15}$', phone):
            return phone
        
        return None
    
    def validate_email(self, email: str) -> Optional[str]:
        """Validate email format"""
        if not email or pd.isna(email):
            return None
        
        email = str(email).strip().lower()
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if re.match(email_regex, email):
            return email
        
        return None
    
    def parse_file(self, file_content: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
        """
        Parse CSV or XLSX file and return processed leads data
        
        Returns:
            Tuple of (leads_data, errors, warnings)
        """
        self.errors = []
        self.warnings = []
        self.processed_count = 0
        self.skipped_count = 0
        
        try:
            # Determine file type and read accordingly
            if filename.lower().endswith('.csv'):
                # Try different encodings for CSV
                for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
                    try:
                        content_str = file_content.decode(encoding)
                        df = pd.read_csv(StringIO(content_str))
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise CSVParseError("Could not decode CSV file with any supported encoding")
            
            elif filename.lower().endswith(('.xlsx', '.xls')):
                df = pd.read_excel(BytesIO(file_content), engine='openpyxl')
            
            else:
                raise CSVParseError("Unsupported file format. Please upload CSV or XLSX files only.")
            
            if df.empty:
                raise CSVParseError("The file appears to be empty")
            
            logger.info(f"📊 Parsed file with {len(df)} rows and {len(df.columns)} columns")
            
            # Map columns to our fields
            column_mapping = self.map_columns(df.columns.tolist())
            logger.info(f"🔗 Column mapping: {column_mapping}")
            
            # Check required fields
            required_fields = ['full_name', 'phone_number']
            missing_required = [field for field in required_fields if field not in column_mapping]
            
            if missing_required:
                raise CSVParseError(f"Required columns not found: {missing_required}. Please ensure your CSV has columns for name and phone number.")
            
            leads_data = []
            
            # Process each row
            for idx, row in df.iterrows():
                try:
                    lead_data = self.process_row(row, column_mapping, idx + 1)
                    if lead_data:
                        leads_data.append(lead_data)
                        self.processed_count += 1
                    else:
                        self.skipped_count += 1
                
                except Exception as e:
                    error_msg = f"Row {idx + 1}: {str(e)}"
                    self.errors.append(error_msg)
                    logger.warning(f"⚠️ Skipped row {idx + 1}: {e}")
                    self.skipped_count += 1
            
            logger.info(f"✅ CSV processing complete: {self.processed_count} processed, {self.skipped_count} skipped")
            
            return leads_data, self.errors, self.warnings
        
        except Exception as e:
            logger.exception("❌ Error parsing CSV file")
            raise CSVParseError(f"Failed to parse file: {str(e)}")
    
    def process_row(self, row: pd.Series, column_mapping: Dict[str, str], row_num: int) -> Optional[Dict[str, Any]]:
        """Process a single row of data"""
        
        # Extract and validate required fields
        full_name = str(row[column_mapping['full_name']]).strip() if 'full_name' in column_mapping else None
        if not full_name or pd.isna(row[column_mapping['full_name']]):
            raise ValueError("Name is required but missing or empty")
        
        phone_number = self.validate_phone_number(row[column_mapping['phone_number']] if 'phone_number' in column_mapping else None)
        if not phone_number:
            raise ValueError("Valid phone number is required but missing or invalid")
        
        # Extract optional fields
        email = self.validate_email(row[column_mapping['email']] if 'email' in column_mapping else None)
        
        clinic_name = str(row[column_mapping['clinic_name']]).strip() if 'clinic_name' in column_mapping and not pd.isna(row[column_mapping['clinic_name']]) else None
        
        # Handle source
        source = 'web'  # Default source for CSV imports
        if 'source' in column_mapping and not pd.isna(row[column_mapping['source']]):
            source_val = str(row[column_mapping['source']]).lower().strip()
            if source_val in self.VALID_SOURCES:
                source = source_val
            else:
                self.warnings.append(f"Row {row_num}: Invalid source '{source_val}', using 'web' as default")
        
        # Handle status
        status = 'new'  # Default status
        if 'status' in column_mapping and not pd.isna(row[column_mapping['status']]):
            status_val = str(row[column_mapping['status']]).lower().strip()
            if status_val in self.VALID_STATUSES:
                status = status_val
            else:
                self.warnings.append(f"Row {row_num}: Invalid status '{status_val}', using 'new' as default")
        
        # Handle notes
        notes = None
        if 'notes' in column_mapping and not pd.isna(row[column_mapping['notes']]):
            notes = str(row[column_mapping['notes']]).strip()
            if not notes:
                notes = None
        
        return {
            'full_name': full_name,
            'phone_number': phone_number,
            'email': email,
            'clinic_name': clinic_name,
            'source': source,
            'status': status,
            'notes': notes,
        }


def parse_csv_leads(file_content: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Convenience function to parse CSV/XLSX leads file
    
    Returns:
        Tuple of (leads_data, errors, warnings)
    """
    parser = LeadCSVParser()
    return parser.parse_file(file_content, filename)