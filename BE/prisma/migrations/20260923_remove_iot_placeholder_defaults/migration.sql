-- New devices must not look connected or measured before their first real telemetry.
ALTER TABLE "iot_nodes" ALTER COLUMN "status" SET DEFAULT 'offline';
ALTER TABLE "iot_nodes" ALTER COLUMN "battery" DROP NOT NULL;
ALTER TABLE "iot_nodes" ALTER COLUMN "battery" DROP DEFAULT;
ALTER TABLE "iot_nodes" ALTER COLUMN "rssi" DROP NOT NULL;
ALTER TABLE "iot_nodes" ALTER COLUMN "rssi" DROP DEFAULT;
ALTER TABLE "iot_nodes" ALTER COLUMN "last_seen_at" DROP NOT NULL;
ALTER TABLE "iot_nodes" ALTER COLUMN "last_seen_at" DROP DEFAULT;
