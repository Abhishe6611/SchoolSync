import csv
import io
from typing import Any, Dict, List
import openpyxl
from fastapi import UploadFile, HTTPException

async def parse_import_file(file: UploadFile) -> List[Dict[str, Any]]:
    """
    Parses an uploaded CSV or Excel file and returns a list of dictionaries.
    Keys are lowercased and stripped of whitespace to match model fields.
    """
    contents = await file.read()
    filename = file.filename.lower()
    
    rows = []
    
    if filename.endswith(".csv"):
        try:
            # Decode bytes to string
            text = contents.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                # Clean up keys (remove spaces, lowercase)
                cleaned_row = {k.strip().lower(): v.strip() if isinstance(v, str) else v 
                               for k, v in row.items() if k}
                rows.append(cleaned_row)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
            
    elif filename.endswith(".xlsx"):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            sheet = wb.active
            
            # Read header row
            headers = []
            for cell in sheet[1]:
                if cell.value:
                    headers.append(str(cell.value).strip().lower())
                else:
                    headers.append(None)
                    
            if not headers:
                raise ValueError("Excel file is empty or missing headers")
                
            # Read data rows
            for row in sheet.iter_rows(min_row=2):
                row_data = {}
                is_empty = True
                for i, cell in enumerate(row):
                    if i < len(headers) and headers[i]:
                        val = cell.value
                        if val is not None:
                            is_empty = False
                        row_data[headers[i]] = str(val).strip() if isinstance(val, str) else val
                if not is_empty:
                    rows.append(row_data)
                    
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .csv or .xlsx")
        
    return rows
