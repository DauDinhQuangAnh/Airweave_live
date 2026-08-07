-- Migration: Tạo các bảng cho hệ sinh thái IoT (Tổ chức + Node + Telemetry).
-- Trước đây các model này đã có trong schema.prisma nhưng CHƯA có migration nào tạo bảng,
-- nên NodesService buộc phải fallback in-memory. Migration này tạo bảng thật để persist dữ liệu.

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'school',
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_nodes" (
    "id" UUID NOT NULL,
    "chip_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" UUID,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "battery" INTEGER NOT NULL DEFAULT 100,
    "rssi" INTEGER NOT NULL DEFAULT -65,
    "edition" TEXT NOT NULL DEFAULT 'outdoor_solar',
    "power_source" TEXT NOT NULL DEFAULT 'solar',
    "hardware_ver" TEXT NOT NULL DEFAULT 'ESP32-v2',
    "mqtt_topic" TEXT,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "iot_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_telemetry" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "pm25" DOUBLE PRECISION NOT NULL,
    "pm10" DOUBLE PRECISION NOT NULL,
    "aqi" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "uv_index" DOUBLE PRECISION,
    "co2" DOUBLE PRECISION,
    "voc_index" DOUBLE PRECISION,
    "battery" INTEGER,
    "rssi" INTEGER,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_users_organization_id_user_id_key" ON "organization_users"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "iot_nodes_chip_id_key" ON "iot_nodes"("chip_id");

-- CreateIndex
CREATE INDEX "iot_nodes_organization_id_idx" ON "iot_nodes"("organization_id");

-- CreateIndex
CREATE INDEX "iot_nodes_lat_lng_idx" ON "iot_nodes"("lat", "lng");

-- CreateIndex
CREATE INDEX "iot_telemetry_node_id_recorded_at_idx" ON "iot_telemetry"("node_id", "recorded_at" DESC);

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_nodes" ADD CONSTRAINT "iot_nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_telemetry" ADD CONSTRAINT "iot_telemetry_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "iot_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
