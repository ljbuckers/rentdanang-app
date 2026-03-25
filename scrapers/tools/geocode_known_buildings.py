import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import psycopg2
from config import Config

DATABASE_URL = Config.DATABASE_URL
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set in Config.")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Get buildings with missing coordinates
cur.execute("SELECT id, name FROM known_buildings WHERE latitude IS NULL OR longitude IS NULL;")
missing_coords_buildings = cur.fetchall()

print(f"Found {len(missing_coords_buildings)} known buildings with missing coordinates.")

updated_count = 0
for building_id, building_name in missing_coords_buildings:
    print(f"Processing '{building_name}' (ID: {building_id})...")
    
    # Try to find average coordinates from existing listings with the same building_name
    cur.execute(f"""
        SELECT AVG(latitude) as avg_lat, AVG(longitude) as avg_lon
        FROM listings
        WHERE LOWER(building_name) = LOWER(%s)
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL;
    """, (building_name,))
    
    result = cur.fetchone()
    
    if result and result[0] is not None and result[1] is not None:
        avg_lat = round(float(result[0]), 7)
        avg_lon = round(float(result[1]), 7)
        
        print(f"  Found average coordinates: Lat {avg_lat}, Lon {avg_lon}")
        
        # Update known_buildings table
        cur.execute("""
            UPDATE known_buildings
            SET latitude = %s, longitude = %s
            WHERE id = %s;
        """, (avg_lat, avg_lon, building_id))
        conn.commit()
        updated_count += 1
        print(f"  Updated '{building_name}'.")
    else:
        print(f"  No valid listings found for '{building_name}' to derive coordinates.")

print(f"\nFinished. Updated {updated_count} known buildings with coordinates.")

cur.close()
conn.close()