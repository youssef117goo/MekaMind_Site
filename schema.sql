PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'hardware',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '/assets/gateway-board.jpg',
  badge TEXT NOT NULL DEFAULT 'منتج MekaMind',
  price_label TEXT NOT NULL DEFAULT 'اطلب عرض سعر',
  price_egp REAL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','out_of_stock')),
  featured INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK(order_type IN ('product','service','consultation')),
  item_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  timeline TEXT NOT NULL DEFAULT 'غير محدد',
  details TEXT NOT NULL DEFAULT '',
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','quoted','confirmed','in_progress','completed','cancelled')),
  admin_notes TEXT NOT NULL DEFAULT '',
  notification_status TEXT NOT NULL DEFAULT 'not_configured',
  notification_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_public ON products(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_public ON services(status, sort_order);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(ip_hash, created_at DESC);

INSERT OR IGNORE INTO products (id,name,slug,category,short_description,description,image_url,badge,price_label,status,featured,sort_order)
VALUES ('gateway-v1','MekaMind IoT Edge Gateway V1','mekamind-iot-edge-gateway-v1','hardware','وحدة تحكم واتصال مبنية على ESP32، تضم 3 مخارج Relay وشاشة OLED واتصال Wi-Fi وتنبيهات للوظائف التي تم اختبارها.','نموذج أولي للمطورين ومشروعات Embedded وIoT. تُراجع المواصفات وحدود التشغيل والتطبيق النهائي حسب احتياج المشروع قبل الاتفاق.','/assets/gateway-board.jpg','نموذج أولي','اطلب عرض سعر','published',1,1);

INSERT OR IGNORE INTO services (id,name,slug,short_description,description,status,sort_order) VALUES
('svc-pcb','PCB Design & Circuit Design','pcb-design','تصميم دوائر ولوحات PCB وتجهيز ملفات التصنيع وفق نطاق المشروع.','تصميم الدوائر والمخططات وتخطيط PCB ومراجعة مخرجات التصنيع حسب نطاق العمل المتفق عليه.','published',1),
('svc-embedded','Embedded Systems & IoT','embedded-systems-iot','تطوير Firmware والتعامل مع المتحكمات والحساسات والاتصالات.','تطوير البرامج المدمجة، والتعامل مع المتحكمات والحساسات وواجهات الاتصال حسب المتطلبات.','published',2),
('svc-integration','Hardware Integration & Prototyping','hardware-integration-prototyping','دمج مكونات النظام واختبار الوظائف الأساسية للنموذج.','دمج المكونات والبرمجيات واختبار وظائف النموذج الأولي بحدود موثقة.','published',3),
('svc-custom','Custom Engineering','custom-engineering','دراسة وظائف إضافية حسب احتياج مشروعك والقدرة الفنية المتاحة.','تقييم احتياجات خاصة وتصميم وتنفيذ نطاق محدد بعد مراجعة الجدوى والتكلفة والاختبارات.','published',4);

CREATE TABLE IF NOT EXISTS order_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_rate_limits ON order_rate_limits(ip_hash, created_at DESC);
