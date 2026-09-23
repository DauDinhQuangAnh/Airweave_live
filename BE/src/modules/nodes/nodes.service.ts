import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { calculateAqiFromPm25, applyHumidityCorrection } from '../../common/air-analytics.util';
import { REDIS_CLIENT } from '../../common/redis.module';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import {
  CreateOrganizationDto,
  CreateIotNodeDto,
  IngestTelemetryDto,
} from './nodes.dto';

// Dữ liệu mẫu chỉ dùng để SEED lần đầu vào DB (khi bảng organizations còn trống).
const SEED_ORGS = [
  {
    name: 'Trường THPT Chu Văn An',
    code: 'CVA-HA-NOI',
    type: 'school',
    address: '10 Thụy Khuê, Tây Hồ, Hà Nội',
    lat: 21.0425,
    lng: 105.8284,
    contact_name: 'Thầy Nguyễn Văn A',
    contact_phone: '0912345678',
  },
  {
    name: 'Bệnh viện Đa khoa Hồng Ngọc',
    code: 'BV-HONG-NGOC',
    type: 'hospital',
    address: '55 Yên Ninh, Ba Đình, Hà Nội',
    lat: 21.0402,
    lng: 105.8451,
    contact_name: 'Bs. Bùi Thị B',
    contact_phone: '0987654321',
  },
  {
    name: 'Tòa nhà Văn phòng Keangnam Landmark',
    code: 'KEANGNAM-HN',
    type: 'office',
    address: 'Phạm Hùng, Nam Từ Liêm, Hà Nội',
    lat: 21.0168,
    lng: 105.7839,
    contact_name: 'Ban Quản lý Tòa nhà',
    contact_phone: '0243999888',
  },
];

interface SeedNode {
  chip_id: string;
  name: string;
  org: string;
  lat: number;
  lng: number;
  location_name: string;
  edition: string;
  power_source: string;
  hardware_ver: string;
  battery: number;
  rssi: number;
  pm25: number;
  status?: string;
}

const SEED_NODES: SeedNode[] = [
  { chip_id: 'ESP32-CVA-01', name: 'Node Sân trường CVA', org: 'CVA-HA-NOI', lat: 21.0428, lng: 105.8286, location_name: 'Sân trung tâm', edition: 'outdoor_solar', power_source: 'solar', hardware_ver: 'ESP32-Solar-v2.1', battery: 98, rssi: -58, pm25: 18.4 },
  { chip_id: 'ESP32-CVA-02', name: 'Node Phòng Thể thao CVA', org: 'CVA-HA-NOI', lat: 21.0422, lng: 105.8281, location_name: 'Nhà thi đấu đa năng', edition: 'indoor_grid', power_source: 'grid', hardware_ver: 'ESP32-Grid-v2.1', battery: 100, rssi: -64, pm25: 14.2 },
  { chip_id: 'ESP32-BVHN-01', name: 'Node Sảnh Cấp cứu BV Hồng Ngọc', org: 'BV-HONG-NGOC', lat: 21.0405, lng: 105.8453, location_name: 'Sảnh chính Tầng 1', edition: 'indoor_grid', power_source: 'grid', hardware_ver: 'ESP32-Grid-v3.0', battery: 100, rssi: -52, pm25: 11.5 },
  { chip_id: 'ESP32-KGN-01', name: 'Node Khuôn viên Keangnam', org: 'KEANGNAM-HN', lat: 21.0169, lng: 105.7841, location_name: 'Cổng B1', edition: 'outdoor_solar', power_source: 'solar', hardware_ver: 'ESP32-Solar-v1.0', battery: 45, rssi: -78, status: 'offline', pm25: 35.8 },
];


const LEADER_KEY = 'airweave:iot:simulator:leader';

// Prisma include dùng lại: node kèm bản đo mới nhất + tên tổ chức.
const NODE_WITH_LATEST = {
  organization: { select: { name: true } },
  telemetry: { orderBy: { recorded_at: 'desc' as const }, take: 1 },
} satisfies Prisma.IotNodeInclude;

type NodeWithLatest = Prisma.IotNodeGetPayload<{ include: typeof NODE_WITH_LATEST }>;

@Injectable()
export class NodesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodesService.name);
  private readonly instanceId = randomUUID();
  private isSimulating = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly simulatorEnabled: boolean;
  private readonly demoDataEnabled: boolean;
  private readonly nodeStaleMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    this.intervalMs = Number(this.config.get('IOT_SIMULATOR_INTERVAL_MS')) || 15_000;
    // Synthetic telemetry must be explicitly enabled; never present it as live by default.
    this.simulatorEnabled = this.config.get<string>('IOT_SIMULATOR_ENABLED') === 'true';
    this.demoDataEnabled = this.config.get<string>('IOT_DEMO_SEED_ENABLED') === 'true';
    const configuredStaleMs = Number(this.config.get('IOT_NODE_STALE_MS'));
    this.nodeStaleMs = Number.isFinite(configuredStaleMs) && configuredStaleMs > 0 ? configuredStaleMs : 5 * 60_000;
  }

  async onModuleInit() {
    let dbReady = true;
    try {
      if (this.demoDataEnabled) {
        await this.seedIfEmpty();
      }
    } catch (err) {
      dbReady = false;
      this.logger.error(
        `IoT DB chưa sẵn sàng — hãy chạy "npx prisma migrate deploy". Chi tiết: ${(err as Error).message}`,
      );
    }
    if (this.simulatorEnabled && dbReady) this.startSimulator();
  }

  onModuleDestroy() {
    this.stopSimulator();
  }

  // ---------- SEED ----------

  private async seedIfEmpty() {
    const count = await this.prisma.organization.count();
    if (count > 0) return;

    this.logger.log('Seed dữ liệu IoT mẫu vào DB (lần đầu)...');
    for (const org of SEED_ORGS) {
      const created = await this.prisma.organization.create({ data: { ...org, is_demo: true } });
      const nodes = SEED_NODES.filter((n) => n.org === created.code);
      for (const n of nodes) {
        const node = await this.prisma.iotNode.create({
          data: {
            chip_id: n.chip_id,
            is_demo: true,
            name: n.name,
            organization_id: created.id,
            lat: n.lat,
            lng: n.lng,
            location_name: n.location_name,
            status: n.status ?? 'online',
            battery: n.battery,
            rssi: n.rssi,
            edition: n.edition,
            power_source: n.power_source,
            hardware_ver: n.hardware_ver,
            mqtt_topic: `airweave/nodes/${n.chip_id}/telemetry`,
          },
        });
        await this.prisma.iotTelemetry.create({
          data: { node_id: node.id, ...this.genReading(node, n.pm25) },
        });
      }
    }
    this.logger.log(`Seed xong: ${SEED_ORGS.length} tổ chức, ${SEED_NODES.length} node.`);
  }

  // ---------- SIMULATION ENGINE ----------

  startSimulator() {
    if (!this.simulatorEnabled || this.simulationInterval) return;
    this.isSimulating = true;
    this.logger.log(`🚀 IoT Telemetry Simulator bật (mỗi ${this.intervalMs}ms, instance ${this.instanceId.slice(0, 8)})`);
    this.simulationInterval = setInterval(() => {
      void this.simulationTick().catch((err) =>
        this.logger.error(`Simulator tick lỗi: ${(err as Error).message}`),
      );
    }, this.intervalMs);
  }

  stopSimulator() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
  }

  toggleSimulator() {
    if (this.isSimulating) this.stopSimulator();
    else this.startSimulator();
    return { isSimulating: this.isSimulating };
  }

  getSimulatorStatus() {
    return { isSimulating: this.isSimulating, simulatorEnabled: this.simulatorEnabled };
  }

  getAlertStatus() {
    return this.notificationsService.getIotAlertStatus();
  }

  /** Đảm bảo chỉ MỘT instance chạy simulator (tránh ghi trùng khi scale nhiều pod). */
  private async acquireLeader(): Promise<boolean> {
    if (!this.redis) return true; // single instance / không có Redis
    try {
      const ttl = this.intervalMs * 3;
      const got = await this.redis.set(LEADER_KEY, this.instanceId, 'PX', ttl, 'NX');
      if (got === 'OK') return true;
      const holder = await this.redis.get(LEADER_KEY);
      if (holder === this.instanceId) {
        await this.redis.pexpire(LEADER_KEY, ttl);
        return true;
      }
      return false;
    } catch {
      return true; // Redis lỗi → không chặn simulator ở single instance
    }
  }

  private async simulationTick() {
    if (!this.isSimulating) return;
    if (!(await this.acquireLeader())) return;

    const nodes = await this.prisma.iotNode.findMany({
      where: { is_demo: true, status: { not: 'offline' } },
      include: NODE_WITH_LATEST,
    });

    await Promise.all(
      nodes.map(async (node) => {
        const reading = this.genReading(node, node.telemetry[0]?.pm25);
        await this.prisma.iotTelemetry.create({ data: { node_id: node.id, ...reading } });
        await this.prisma.iotNode.update({
          where: { id: node.id },
          data: { last_seen_at: new Date(), battery: reading.battery ?? node.battery, rssi: reading.rssi ?? node.rssi },
        });

        void this.notificationsService.evaluateIotNodeAlerts(
          { id: node.id, name: node.name, organization_id: node.organization_id, organization_name: node.organization?.name ?? null },
          { co2: reading.co2 ?? undefined, uv_index: reading.uv_index ?? undefined, aqi: reading.aqi },
        );
      }),
    );
  }

  /** Sinh một bản đo giả lập realistic, dựa trên giá trị PM2.5 trước đó của node. */
  private genReading(node: { edition?: string | null; battery?: number | null; rssi?: number | null }, prevPm25?: number | null) {
    const basePm25 = prevPm25 ?? 15;
    const pm25 = Math.max(5, Math.min(180, Number((basePm25 + (Math.random() - 0.48) * 3).toFixed(1))));
    const pm10 = Number((pm25 * 1.6 + Math.random() * 2).toFixed(1));
    const aqi = calculateAqiFromPm25(pm25);
    const temperature = Number((26 + (Math.random() - 0.5) * 4).toFixed(1));
    const humidity = Math.round(55 + Math.random() * 20);

    const isIndoor = node.edition === 'indoor_grid';
    const hour = new Date().getHours();
    const uv_index = isIndoor
      ? null
      : Number(Math.max(0, (hour >= 6 && hour <= 17 ? Math.sin(((hour - 6) / 11) * Math.PI) * 8.5 : 0) + (Math.random() - 0.5) * 0.8).toFixed(1));
    const co2 = isIndoor ? Math.round(420 + Math.random() * 250 + (hour >= 8 && hour <= 17 ? 180 : 0)) : null;
    const voc_index = isIndoor ? Math.round(25 + Math.random() * 45) : null;

    return {
      pm25,
      pm10,
      aqi,
      temperature,
      humidity,
      uv_index,
      co2,
      voc_index,
      battery: node.battery ?? 100,
      rssi: node.rssi ?? -65,
    };
  }

  /** Làm phẳng node + bản đo mới nhất về đúng shape mà FE đang dùng. */
  private isFresh(date: Date | null | undefined): boolean {
    if (!date) return false;
    const ageMs = Date.now() - date.getTime();
    return ageMs >= -5 * 60_000 && ageMs <= this.nodeStaleMs;
  }

  private isNodeOnline(node: NodeWithLatest): boolean {
    return node.status === 'online' && this.isFresh(node.last_seen_at) && this.isFresh(node.telemetry[0]?.recorded_at);
  }

  private shapeNode(node: NodeWithLatest) {
    const t = node.telemetry[0];
    const isOnline = this.isNodeOnline(node);
    const current = isOnline ? t : null;
    const { telemetry, organization, ...rest } = node;
    return {
      ...rest,
      status: node.status === 'maintenance' ? 'maintenance' : isOnline ? 'online' : 'offline',
      edition_type: rest.edition === 'indoor_grid' ? 'indoor' : 'outdoor',
      organization_name: organization?.name ?? 'Tự do (Chưa gán)',
      pm25: current?.pm25 ?? null,
      pm10: current?.pm10 ?? null,
      aqi: current?.aqi ?? null,
      temperature: current?.temperature ?? null,
      humidity: current?.humidity ?? null,
      uv_index: current?.uv_index ?? null,
      co2: current?.co2 ?? null,
      voc_index: current?.voc_index ?? null,
      last_reading_at: t?.recorded_at ?? null,
    };
  }

  // ---------- ADMIN DASHBOARD METRICS ----------

  async getAdminStats() {
    const since24h = new Date(Date.now() - 24 * 3_600_000);
    const [totalNodes, totalOrgs, totalTelemetry24h, nodes] =
      await Promise.all([
        this.prisma.iotNode.count({ where: this.demoDataEnabled ? {} : { is_demo: false } }),
        this.prisma.organization.count({ where: this.demoDataEnabled ? {} : { is_demo: false } }),
        this.prisma.iotTelemetry.count({ where: { recorded_at: { gte: since24h }, ...(this.demoDataEnabled ? {} : { node: { is_demo: false } }) } }),
        this.prisma.iotNode.findMany({ where: this.demoDataEnabled ? {} : { is_demo: false }, include: NODE_WITH_LATEST }),
      ]);

    const onlineNodes = nodes.filter((n) => this.isNodeOnline(n)).length;
    const offlineNodes = nodes.filter((n) => n.status !== 'maintenance' && !this.isNodeOnline(n)).length;
    const aqis = nodes.filter((n) => this.isNodeOnline(n)).map((n) => n.telemetry[0]?.aqi).filter((v): v is number => typeof v === 'number');
    const avgAqi = aqis.length ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : null;

    return {
      totalNodes,
      onlineNodes,
      offlineNodes,
      totalOrgs,
      avgAqi,
      totalTelemetry24h,
      isSimulating: this.isSimulating,
      simulatorEnabled: this.simulatorEnabled,
      ingestConfigured: !!this.config.get<string>('DEVICE_INGEST_TOKEN'),
    };
  }


  // ---------- ORGANIZATIONS ----------

  private isAdmin(user: JwtUser): boolean {
    return (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .some((email) => email.trim().toLowerCase() === user.email.toLowerCase());
  }

  async listOrganizations(user: JwtUser) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        ...(this.demoDataEnabled ? {} : { is_demo: false }),
        ...(this.isAdmin(user) ? {} : { users: { some: { user_id: user.id } } }),
      },
      include: { _count: { select: { nodes: { where: this.demoDataEnabled ? {} : { is_demo: false } }, users: true } } },
      orderBy: { created_at: 'asc' },
    });
    return organizations.map((organization) => ({
      ...organization,
      nodesCount: organization._count.nodes,
    }));
  }

  async createOrganization(dto: CreateOrganizationDto) {
    try {
      return await this.prisma.organization.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          type: dto.type || 'school',
          address: dto.address ?? null,
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
          contact_name: dto.contact_name ?? null,
          contact_phone: dto.contact_phone ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã tổ chức (code) đã tồn tại');
      }
      throw err;
    }
  }

  // ---------- IOT NODES ----------

  async listNodes(orgId?: string) {
    const nodes = await this.prisma.iotNode.findMany({
      where: { ...(orgId ? { organization_id: orgId } : {}), ...(this.demoDataEnabled ? {} : { is_demo: false }) },
      include: NODE_WITH_LATEST,
      orderBy: { created_at: 'asc' },
    });
    return nodes.map((n) => this.shapeNode(n));
  }

  async getNodeDetails(id: string) {
    const node = await this.prisma.iotNode.findFirst({
      where: { OR: [{ id }, { chip_id: id }], ...(this.demoDataEnabled ? {} : { is_demo: false }) },
      include: {
        organization: { select: { name: true } },
        telemetry: { orderBy: { recorded_at: 'desc' }, take: 12 },
      },
    });
    if (!node) throw new NotFoundException('IoT Node không tồn tại');

    const { telemetry, organization, ...rest } = node;
    const latest = telemetry[0];
    const isOnline = node.status === 'online' && this.isFresh(node.last_seen_at) && this.isFresh(latest?.recorded_at);
    const current = isOnline ? latest : null;
    return {
      ...rest,
      status: node.status === 'maintenance' ? 'maintenance' : isOnline ? 'online' : 'offline',
      organization_name: organization?.name ?? null,
      pm25: current?.pm25 ?? null,
      pm10: current?.pm10 ?? null,
      aqi: current?.aqi ?? null,
      temperature: current?.temperature ?? null,
      humidity: current?.humidity ?? null,
      uv_index: current?.uv_index ?? null,
      co2: current?.co2 ?? null,
      voc_index: current?.voc_index ?? null,
      // Cũ → mới để FE vẽ biểu đồ theo trục thời gian tăng dần.
      history: [...telemetry].reverse(),
    };
  }

  async createNode(dto: CreateIotNodeDto) {
    if (dto.organization_id) {
      const organization = await this.prisma.organization.findUnique({ where: { id: dto.organization_id } });
      if (!organization || (organization.is_demo && !this.demoDataEnabled)) {
        throw new NotFoundException('Tổ chức không tồn tại');
      }
    }
    try {
      const node = await this.prisma.iotNode.create({
        data: {
          chip_id: dto.chip_id,
          name: dto.name,
          organization_id: dto.organization_id ?? null,
          lat: dto.lat,
          lng: dto.lng,
          location_name: dto.location_name ?? 'Khu vực chưa đặt tên',
          hardware_ver: dto.hardware_ver?.trim() || 'unknown',
          edition: dto.edition ?? 'outdoor_solar',
          power_source: dto.edition === 'indoor_grid' ? 'grid' : 'solar',
          mqtt_topic: `airweave/nodes/${dto.chip_id}/telemetry`,
        },
        include: NODE_WITH_LATEST,
      });
      return this.shapeNode(node);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Chip ID "${dto.chip_id}" đã tồn tại`);
      }
      throw err;
    }
  }

  async assignNodeToOrg(nodeId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || (org.is_demo && !this.demoDataEnabled)) throw new NotFoundException('Tổ chức không tồn tại');

    const result = await this.prisma.iotNode.updateMany({
      where: { id: nodeId, ...(this.demoDataEnabled ? {} : { is_demo: false }) },
      data: { organization_id: orgId },
    });
    if (result.count === 0) throw new NotFoundException('IoT Node không tồn tại');

    const node = await this.prisma.iotNode.findUnique({ where: { id: nodeId }, include: NODE_WITH_LATEST });
    return this.shapeNode(node!);
  }

  async getUnassignedNodes() {
    const nodes = await this.prisma.iotNode.findMany({
      where: { organization_id: null, ...(this.demoDataEnabled ? {} : { is_demo: false }) },
      include: NODE_WITH_LATEST,
      orderBy: { created_at: 'desc' },
    });
    return nodes.map((n) => this.shapeNode(n));
  }

  // ---------- TELEMETRY INGESTION (ESP32 thật) ----------

  async ingestTelemetry(dto: IngestTelemetryDto) {
    // Cảm biến laser (ESP32) đọc PM2.5 cao ảo khi độ ẩm > 70% (hạt bụi hút nước nở to).
    // Áp hygroscopic correction ở đây — đúng nơi cần (dữ liệu THÔ của thiết bị) — rồi
    // mới tính AQI và lưu giá trị đã hiệu chỉnh.
    const pm25 = dto.humidity !== undefined ? applyHumidityCorrection(dto.pm25, dto.humidity) : dto.pm25;
    const aqi = calculateAqiFromPm25(pm25);

    const registeredNode = await this.prisma.iotNode.findUnique({ where: { chip_id: dto.chip_id } });
    if (!registeredNode || registeredNode.is_demo) {
      throw new NotFoundException('Node chưa đăng ký; hãy khai báo node và vị trí thật trước khi gửi telemetry');
    }
    const node = await this.prisma.iotNode.update({
      where: { id: registeredNode.id },
      data: {
        status: 'online',
        last_seen_at: new Date(),
        ...(dto.battery !== undefined ? { battery: dto.battery } : {}),
        ...(dto.rssi !== undefined ? { rssi: dto.rssi } : {}),
      },
      include: { organization: { select: { name: true } } },
    });

    await this.prisma.iotTelemetry.create({
      data: {
        node_id: node.id,
        pm25,
        pm10: dto.pm10,
        aqi,
        temperature: dto.temperature ?? null,
        humidity: dto.humidity ?? null,
        uv_index: dto.uv_index ?? null,
        co2: dto.co2 ?? null,
        voc_index: dto.voc_index ?? null,
        battery: dto.battery ?? null,
        rssi: dto.rssi ?? null,
      },
    });

    void this.notificationsService.evaluateIotNodeAlerts(
      { id: node.id, name: node.name, organization_id: node.organization_id, organization_name: node.organization?.name ?? null },
      { co2: dto.co2, uv_index: dto.uv_index, aqi },
    );

    return { success: true, chip_id: dto.chip_id, aqi };
  }

  async autoDiscoverNode(dto: { chip_id: string; hardware_ver?: string; edition?: string; mac?: string; lat?: number; lng?: number }) {
    const existing = await this.prisma.iotNode.findUnique({ where: { chip_id: dto.chip_id }, include: NODE_WITH_LATEST });
    if (existing) {
      if (existing.is_demo) throw new ConflictException('Chip ID dành cho dữ liệu demo; hãy dùng ID thiết bị thật');
      return { isNew: false, node: this.shapeNode(existing) };
    }

    if (!Number.isFinite(dto.lat) || !Number.isFinite(dto.lng)) {
      throw new BadRequestException('Node mới cần tọa độ thật; không thể đặt mặc định tại Hà Nội');
    }
    const node = await this.prisma.iotNode.create({
      data: {
        chip_id: dto.chip_id,
        name: `✨ Node Mới Phát Hiện (${dto.chip_id})`,
        lat: dto.lat!,
        lng: dto.lng!,
        location_name: 'Khai báo tự động qua MQTT',
        edition: dto.edition || 'outdoor_solar',
        power_source: dto.edition === 'indoor_grid' ? 'grid' : 'solar',
        hardware_ver: dto.hardware_ver?.trim() || 'unknown',
        mqtt_topic: `airweave/nodes/${dto.chip_id}/telemetry`,
      },
      include: NODE_WITH_LATEST,
    });
    this.logger.log(`✨ AUTO-DISCOVERY: Zero-Touch node mới: ${dto.chip_id}`);
    return { isNew: true, node: this.shapeNode(node) };
  }

  // ---------- ORG DASHBOARD ----------

  async getOrgDashboard(orgId: string, user: JwtUser) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id: orgId,
        ...(this.demoDataEnabled ? {} : { is_demo: false }),
        ...(this.isAdmin(user) ? {} : { users: { some: { user_id: user.id } } }),
      },
    });
    if (!org) throw new NotFoundException('Tổ chức không tồn tại');

    const raw = await this.prisma.iotNode.findMany({
      where: { organization_id: orgId, ...(this.demoDataEnabled ? {} : { is_demo: false }) },
      include: NODE_WITH_LATEST,
      orderBy: { created_at: 'asc' },
    });
    const nodes = raw.map((n) => this.shapeNode(n));

    const aqis = nodes.map((n) => n.aqi).filter((v): v is number => typeof v === 'number');
    const avgAqi = aqis.length ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : null;

    return {
      organization: org,
      nodes,
      summary: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((n) => n.status === 'online').length,
        avgAqi,
        airQualityCategory: avgAqi === null ? 'Chưa có dữ liệu' : avgAqi <= 50 ? 'Tốt' : avgAqi <= 100 ? 'Trung bình' : 'Kém',
      },
    };
  }

  // ---------- HOUSEKEEPING ----------

  /** Dọn telemetry cũ để bảng không phình vô hạn (giữ mặc định 7 ngày). */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeOldTelemetry() {
    if (this.redis && !(await this.acquireLeader())) return; // chỉ leader dọn
    const keepDays = Number(this.config.get('IOT_TELEMETRY_RETENTION_DAYS')) || 7;
    const cutoff = new Date(Date.now() - keepDays * 86_400_000);
    const { count } = await this.prisma.iotTelemetry.deleteMany({ where: { recorded_at: { lt: cutoff } } });
    if (count > 0) this.logger.log(`Đã dọn ${count} bản telemetry cũ hơn ${keepDays} ngày`);
  }
}
