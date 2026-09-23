ALTER TABLE "organizations" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "iot_nodes" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- Preserve, but quarantine, the exact records created by the legacy startup seed.
UPDATE "organizations" SET "is_demo" = true
WHERE "code" IN ('CVA-HA-NOI', 'BV-HONG-NGOC', 'KEANGNAM-HN');

UPDATE "iot_nodes" SET "is_demo" = true
WHERE "chip_id" IN ('ESP32-CVA-01', 'ESP32-CVA-02', 'ESP32-BVHN-01', 'ESP32-KGN-01');
