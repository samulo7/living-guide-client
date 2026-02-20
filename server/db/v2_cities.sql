USE nomad_guide;

CREATE TABLE IF NOT EXISTS cities (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(120) NOT NULL DEFAULT '',
  tags TEXT NOT NULL,
  rent_price INT NOT NULL DEFAULT 0,
  buy_price_desc VARCHAR(120) NOT NULL DEFAULT '',
  cover_image VARCHAR(500) NOT NULL DEFAULT '',
  editor_comment VARCHAR(255) NOT NULL DEFAULT '',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  has_hospital_class_a TINYINT(1) NOT NULL DEFAULT 0,
  medical VARCHAR(120) NOT NULL DEFAULT '',
  transport VARCHAR(120) NOT NULL DEFAULT '',
  lat DECIMAL(10, 6) NOT NULL DEFAULT 0,
  lng DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_city_name_location (name, location)
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '鹤岗市',
  '兴安区、东山区',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  100,
  '约2W/套',
  '/static/covers/hegang.png',
  '网上的话题比较高，人气较足',
  1,
  1,
  '三甲医院',
  '高铁/动车',
  47.338571,
  130.317151
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '鹤岗市' AND location = '兴安区、东山区'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '双鸭山',
  '尖山区、集贤县',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  450,
  '约2.5W/套',
  '/static/covers/shuangyashan.png',
  '相对来说交通枢纽，去俄罗斯的跳板之一',
  0,
  1,
  '三甲医院',
  '高铁/动车',
  46.728448,
  131.141452
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '双鸭山' AND location = '尖山区、集贤县'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '伊春市',
  '铁力区',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  500,
  '约9W/套',
  '/static/covers/yichun.png',
  '有机场，说来就来是说走就走',
  1,
  0,
  '没有',
  '飞机,高铁在建',
  46.986604,
  128.032554
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '伊春市' AND location = '铁力区'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '大庆市',
  '红岗区',
  '["旅游度假区","雪景","短暂居住的年轻人"]',
  300,
  '约2W/套',
  '/static/covers/daqing.png',
  '博物馆多，有人文历史',
  0,
  1,
  '三甲医院',
  '高铁/动车,飞机',
  46.398567,
  124.891041
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '大庆市' AND location = '红岗区'
);
