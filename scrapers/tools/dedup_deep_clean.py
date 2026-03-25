"""Deep clean database: standardize text, populate USD prices, flag amenity images, and deduplicate listings."""

import asyncio
import json
import logging
import sys
from collections import defaultdict
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from loguru import logger

from config import Config
from utils.text_cleaner import TextCleaner

# Configure logging
logger.remove()
logger.add(sys.stderr, level="INFO")

# Constants
VND_USD_RATE = 25500

def get_db_connection():
    return psycopg2.connect(Config.DATABASE_URL)

def setup_amenity_table(conn):
    """Create table for flagging building amenity images."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS amenity_hashes (
                phash TEXT PRIMARY KEY,
                detection_count INT,
                detected_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        conn.commit()

def flag_amenity_images(conn):
    """Identify images that appear in >3 distinct listings with DIFFERENT prices."""
    logger.info("Scanning for amenity images...")
    
    with conn.cursor() as cur:
        # Get hashes that appear in multiple listings
        cur.execute("""
            SELECT ih.phash, ARRAY_AGG(DISTINCT l.price_vnd) as prices, COUNT(DISTINCT l.id) as listing_count
            FROM image_hashes ih
            JOIN listings l ON ih.listing_id = l.id
            WHERE l.price_vnd IS NOT NULL
            GROUP BY ih.phash
            HAVING COUNT(DISTINCT l.id) > 3
        """)
        
        candidates = cur.fetchall()
        amenity_hashes = []
        
        for phash, prices, count in candidates:
            # Check if prices vary significantly (indicating different units sharing amenities)
            # If all prices are identical, it might just be the SAME unit listed many times (duplicate)
            # If prices vary, it's likely a shared amenity (pool, gym)
            if len(set(prices)) > 1:
                amenity_hashes.append((phash, count))
                
        if amenity_hashes:
            logger.info(f"Found {len(amenity_hashes)} amenity image hashes.")
            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO amenity_hashes (phash, detection_count) VALUES %s ON CONFLICT (phash) DO UPDATE SET detection_count = EXCLUDED.detection_count",
                amenity_hashes
            )
            conn.commit()
        else:
            logger.info("No new amenity images found.")

def standardize_listings(conn):
    """Clean titles, descriptions, and ensure USD prices."""
    logger.info("Standardizing listings...")
    cleaner = TextCleaner()
    
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute("SELECT id, title, title_en, description, description_en, price_vnd, price_usd FROM listings WHERE is_active = true")
        rows = cur.fetchall()
        
        updated_count = 0
        
        for row in rows:
            updates = {}
            
            # 1. Clean Title
            old_title = row['title_en'] or row['title']
            if old_title:
                new_title = cleaner.clean_title(old_title)
                if new_title != old_title:
                    updates['title_en'] = new_title
            
            # 2. Clean Description
            old_desc = row['description_en'] or row['description']
            if old_desc:
                new_desc = cleaner.clean_description(old_desc)
                if len(new_desc) != len(old_desc): # Simple check if changed
                    updates['description_en'] = new_desc

            # 3. Populate USD Price
            if row['price_vnd'] and not row['price_usd']:
                updates['price_usd'] = round(row['price_vnd'] / VND_USD_RATE, 2)
                
            if updates:
                set_clauses = ", ".join([f"{k} = %s" for k in updates.keys()])
                values = list(updates.values()) + [row['id']]
                cur.execute(f"UPDATE listings SET {set_clauses} WHERE id = %s", values)
                updated_count += 1
                
        conn.commit()
        logger.info(f"Standardized {updated_count} listings.")

def deduplicate_listings(conn):
    """
    Deduplicate based on: Same Phone + Same Bedrooms + Price within 5%.
    Merge logic: Keep the one with highest quality_score or most recent last_seen_at.
    """
    logger.info("Running deduplication pass...")
    
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        # Fetch relevant fields for active listings
        cur.execute("""
            SELECT id, contact_phone, bedrooms, price_vnd, quality_score, last_seen_at, source_url
            FROM listings
            WHERE is_active = true AND contact_phone IS NOT NULL AND price_vnd > 0
        """)
        listings = cur.fetchall()
        
    # Group by Phone + Bedrooms
    groups = defaultdict(list)
    for l in listings:
        # Normalize phone (remove non-digits)
        phone = "".join(filter(str.isdigit, l['contact_phone'] or ""))
        if len(phone) < 8: continue # Skip invalid phones
        
        key = (phone, l['bedrooms'])
        groups[key].append(l)
        
    merged_count = 0
    
    with conn.cursor() as cur:
        for key, group in groups.items():
            if len(group) < 2: continue
            
            # Sort by price to find close matches
            group.sort(key=lambda x: x['price_vnd'])
            
            # Simple clustering: iterate and find neighbors within 5% price
            while group:
                base = group.pop(0)
                cluster = [base]
                
                # Check remaining items
                i = 0
                while i < len(group):
                    candidate = group[i]
                    price_diff = abs(base['price_vnd'] - candidate['price_vnd'])
                    percent_diff = price_diff / base['price_vnd']
                    
                    if percent_diff <= 0.05: # 5% variance
                        cluster.append(candidate)
                        group.pop(i)
                    else:
                        i += 1
                
                if len(cluster) > 1:
                    # Found duplicates! Pick the winner.
                    # Criteria: Max quality_score, then max last_seen_at
                    cluster.sort(key=lambda x: (x['quality_score'] or 0, x['last_seen_at'] or datetime.min), reverse=True)
                    winner = cluster[0]
                    losers = cluster[1:]
                    
                    logger.info(f"Merging {len(losers)} duplicates into {winner['id']} (Phone: {key[0]}, Beds: {key[1]}, Price: {winner['price_vnd']})")
                    
                    for loser in losers:
                        # Archive loser
                        cur.execute("""
                            UPDATE listings 
                            SET is_active = false, 
                                is_duplicate = true, 
                                duplicate_of = %s,
                                status = 'archived_duplicate',
                                deactivated_at = NOW()
                            WHERE id = %s
                        """, (winner['id'], loser['id']))
                        merged_count += 1
                        
        conn.commit()
    
    logger.info(f"Deduplication complete. Merged {merged_count} listings.")

def main():
    conn = get_db_connection()
    try:
        setup_amenity_table(conn)
        flag_amenity_images(conn)
        standardize_listings(conn)
        deduplicate_listings(conn)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
