
import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

# Load environment variables from the parent directory's .env file
# Assuming run_scanner.py is in backend/ and .env is in ../.env or backend/.env
# The user seems to have .env in root d:\Work\Photoviewer\.env based on prompt.
# So we look in ..
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.services.scanner import scan_directory
from app.core import config
import logging

# Configure logging to show info on console
logging.basicConfig(level=logging.INFO)

def main():
    photos_dir = os.environ.get("PHOTOS_DIR")
    if not photos_dir:
        print("Error: PHOTOS_DIR not found in environment variables.")
        return

    print(f"Starting scan on: {photos_dir}")
    
    # Handle multiple paths if separated by ;
    paths = [p.strip() for p in photos_dir.split(';') if p.strip()]
    
    for path in paths:
        if os.path.exists(path):
            scan_directory(path)
        else:
            print(f"Warning: Path does not exist: {path}")

    print("Scan complete.")

if __name__ == "__main__":
    main()
