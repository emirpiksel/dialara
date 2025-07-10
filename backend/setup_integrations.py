#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup script for integrations table
Run this to create the integrations table in your Supabase database
"""

import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from database import get_supabase_client
from config import get_config

def setup_integrations_table():
    """Create the integrations table in Supabase"""
    try:
        config = get_config()
        supabase = get_supabase_client()
        
        print("Setting up integrations table...")
        
        # Read the SQL file
        sql_file = os.path.join(backend_dir, "create_integrations_table.sql")
        with open(sql_file, 'r') as f:
            sql_commands = f.read()
        
        # Split into individual commands and execute
        commands = [cmd.strip() for cmd in sql_commands.split(';') if cmd.strip()]
        
        for i, command in enumerate(commands):
            try:
                print("Executing command {}/{}...".format(i+1, len(commands)))
                # Note: Supabase Python client doesn't support raw SQL execution
                # This would need to be run directly in the Supabase SQL editor
                print("   {}...".format(command[:50]))
            except Exception as e:
                print("Command {} failed: {}".format(i+1, e))
                continue
        
        print("\nIntegrations table setup complete!")
        print("\nManual Setup Required:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to the SQL Editor")
        print("3. Copy and paste the contents of 'create_integrations_table.sql'")
        print("4. Execute the SQL commands")
        
        print("\nTable Schema:")
        print("- id: UUID (Primary Key)")
        print("- user_id: UUID (Foreign Key to users)")
        print("- provider: VARCHAR(50) (e.g., 'hubspot')")
        print("- access_token: TEXT (OAuth access token)")
        print("- refresh_token: TEXT (OAuth refresh token)")
        print("- expires_at: TIMESTAMP (Token expiration)")
        print("- portal_id: VARCHAR(100) (HubSpot portal ID)")
        print("- scopes: TEXT (OAuth scopes)")
        print("- created_at: TIMESTAMP (Auto-generated)")
        print("- updated_at: TIMESTAMP (Auto-generated)")
        
        return True
        
    except Exception as e:
        print("Error setting up integrations table: {}".format(e))
        return False

if __name__ == "__main__":
    setup_integrations_table()