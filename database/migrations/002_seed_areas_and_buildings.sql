-- Seed Da Nang area boundaries
-- Polygons are approximate rectangles; refine with OpenStreetMap data later

INSERT INTO areas (name, name_vn, slug, district, description, description_en, center_lat, center_lon, avg_price_1br, avg_price_2br, lifestyle_tags, boundary) VALUES

(
  'An Thuong / My An',
  'An Thượng / Mỹ An',
  'an-thuong',
  'Ngũ Hành Sơn',
  'Trái tim của cộng đồng người nước ngoài tại Đà Nẵng. Đi bộ đến bãi biển Mỹ Khê, đầy nhà hàng quốc tế, quán cà phê và quán bar.',
  'The beating heart of expat life in Da Nang. Walking distance to My Khe Beach, packed with international restaurants, cafes, and bars. Most serviced apartments are here.',
  16.0466, 108.2432,
  10000000, 15000000,
  '["beach", "expat-friendly", "nightlife", "cafes", "walkable"]',
  ST_GeogFromText('SRID=4326;POLYGON((108.2350 16.0520, 108.2510 16.0520, 108.2510 16.0400, 108.2350 16.0400, 108.2350 16.0520))')
),

(
  'Son Tra',
  'Sơn Trà',
  'son-tra',
  'Sơn Trà',
  'Khu vực cao cấp ven biển gần Linh Ứng và bán đảo Sơn Trà. Nổi tiếng với tầm nhìn ra biển và lối sống nghỉ dưỡng.',
  'Beachfront premium area near Lady Buddha and Monkey Mountain. Popular for ocean views and resort-style living. Studios still snapped up quickly.',
  16.1000, 108.2500,
  9000000, 14000000,
  '["beach", "ocean-view", "nature", "premium", "quiet"]',
  ST_GeogFromText('SRID=4326;POLYGON((108.2200 16.1200, 108.2800 16.1200, 108.2800 16.0600, 108.2200 16.0600, 108.2200 16.1200))')
),

(
  'Hai Chau (Downtown)',
  'Hải Châu',
  'hai-chau',
  'Hải Châu',
  'Trung tâm thương mại dọc sông Hàn. Trải nghiệm sống địa phương với cầu Rồng gần đó. Giá trị tốt nhất cho tiếp cận trung tâm thành phố.',
  'The central business district along the Han River. More local living experience with Dragon Bridge nearby. Best value for city-center access.',
  16.0678, 108.2208,
  7500000, 12000000,
  '["city-center", "local", "riverside", "affordable", "business"]',
  ST_GeogFromText('SRID=4326;POLYGON((108.2050 16.0850, 108.2350 16.0850, 108.2350 16.0520, 108.2050 16.0520, 108.2050 16.0850))')
),

(
  'Ngu Hanh Son (Marble Mountains)',
  'Ngũ Hành Sơn',
  'ngu-hanh-son',
  'Ngũ Hành Sơn',
  'Khu vực đang phát triển gần Ngũ Hành Sơn và khu công nghệ FPT. Các dự án mới với giá trị tốt.',
  'Growing area near Marble Mountains and FPT tech park. Newer developments with good value pricing. Popular with tech workers.',
  16.0200, 108.2500,
  7000000, 11000000,
  '["growing", "value", "tech", "nature", "new-builds"]',
  ST_GeogFromText('SRID=4326;POLYGON((108.2300 16.0400, 108.2650 16.0400, 108.2650 16.0000, 108.2300 16.0000, 108.2300 16.0400))')
),

(
  'Lien Chieu (North)',
  'Liên Chiểu',
  'lien-chieu',
  'Liên Chiểu',
  'Bắc Đà Nẵng gần đèo Hải Vân. Giá phải chăng với cảm giác dân cư địa phương. Ít cơ sở hạ tầng du lịch nhưng trải nghiệm Việt Nam đích thực.',
  'North Da Nang near Hai Van Pass. Budget-friendly with a more local residential feel. Less tourist infrastructure but authentic Vietnamese living.',
  16.0900, 108.1500,
  5000000, 8000000,
  '["budget", "local", "residential", "quiet", "authentic"]',
  ST_GeogFromText('SRID=4326;POLYGON((108.1200 16.1100, 108.1700 16.1100, 108.1700 16.0700, 108.1200 16.0700, 108.1200 16.1100))')
);

-- Seed known buildings
INSERT INTO known_buildings (name, aliases) VALUES
  ('Monarchy', '["Monarchy Tower", "Monarchy Da Nang"]'),
  ('Azura', '["Azura Da Nang", "Azura Apartment"]'),
  ('Hiyori Garden Tower', '["Hiyori", "Hiyori Tower"]'),
  ('Fivitel', '["Fivitel Living"]'),
  ('Indochina Riverside', '["Indochina Riverside Towers", "Indochina Tower"]'),
  ('Blooming Tower', '["Blooming", "Blooming Da Nang"]'),
  ('Fusion Suites', '["Fusion", "Fusion Da Nang"]'),
  ('Alphanam Luxury', '["Alphanam Luxury Apartment", "Alphanam"]'),
  ('Danang Daewoo', '["Daewoo", "Daewoo Hotel"]'),
  ('Premier Sky Residences', '["Premier Sky", "Premier"]'),
  ('Filmore', '["Filmore Da Nang"]'),
  ('Risemount', '["Risemount Apartment", "Risemount Da Nang"]'),
  ('Sun Cosmo', '["Sun Cosmo Residence"]'),
  ('Soleil', '["Soleil Da Nang", "Soleil Anh Duong"]'),
  ('F.Home', '["FHome", "F Home"]'),
  ('OceanView', '["Ocean View", "Ocean View Da Nang"]'),
  ('Zen Diamond', '["Zen Diamond Suites"]'),
  ('Altara Suites', '["Altara", "Altara Da Nang"]'),
  ('The Sang Residence', '["The Sang", "Sang Residence"]'),
  ('Peninsula', '["Peninsula Da Nang"]'),
  ('Vinpearl Condotel', '["Vinpearl", "Vinpearl Da Nang"]'),
  ('Samatha', '["Samatha Hotel"]'),
  ('Green Diamond', '["Green Diamond Apartment"]'),
  ('Son Tra Ocean View', '["Sơn Trà Ocean View", "STOV"]'),
  ('Hilton', '["Hilton Da Nang"]'),
  ('Novotel', '["Novotel Da Nang"]'),
  ('Four Points Sheraton', '["Four Points", "Four Points by Sheraton", "Sheraton"]'),
  ('Hyatt Regency', '["Hyatt", "Hyatt Da Nang"]'),
  ('Marriott', '["Marriott Da Nang"]'),
  ('Muong Thanh', '["Mường Thanh", "Muong Thanh Da Nang"]'),
  ('Hoang Anh Gia Lai', '["HAGL", "HAGL Lake View"]'),
  ('Da Nang Plaza', '["Danang Plaza", "DN Plaza"]'),
  ('Naman Retreat', '["Naman"]'),
  ('Chicland', '["Chicland Hotel"]'),
  ('Belle Maison', '["Belle Maison Parosand"]'),
  ('Central Coast', '["Central Coast Da Nang"]'),
  ('BRG Diamond', '["BRG"]'),
  ('Wyndham', '["Wyndham Da Nang", "Wyndham Soleil"]'),
  ('FPT Plaza', '["FPT Plaza 1", "FPT Plaza 2"]'),
  ('Thanh Binh Green', '["Thanh Binh", "TBG"]');
