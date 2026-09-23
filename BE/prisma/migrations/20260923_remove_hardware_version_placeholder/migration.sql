-- A missing hardware revision is unknown, not evidence of a particular ESP32 version.
ALTER TABLE "iot_nodes" ALTER COLUMN "hardware_ver" SET DEFAULT 'unknown';
