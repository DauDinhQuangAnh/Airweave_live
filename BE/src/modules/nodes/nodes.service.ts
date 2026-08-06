import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { calculateAqiFromPm25, applyHumidityCorrection } from '../../common/air-analytics.util';
import {
  CreateOrganizationDto,
  CreateIotNodeDto,
  IngestTelemetryDto,
  AssignUserToOrgDto,
} from './nodes.dto';



// Initial pre-seeded IoT Nodes for immediate demonstration & fallback
const SAMPLE_ORGS = [
  {
    id: 'org-001',
    name: 'Trường THPT Chu Văn An',
    code: 'CVA-HA-NOI',
    type: 'school',
    address: '10 Thụy Khuê, Tây Hồ, Hà Nội',
    lat: 21.0425,
    lng: 105.8284,
    contact_name: 'Thầy Nguyễn Văn A',
    contact_phone: '0912345678',
    created_at: new Date().toISOString(),
  },
  {
    id: 'org-002',
    name: 'Bệnh viện Đa khoa Hồng Ngọc',
    code: 'BV-HONG-NGOC',
    type: 'hospital',
    address: '55 Yên Ninh, Ba Đình, Hà Nội',
    lat: 21.0402,
    lng: 105.8451,
    contact_name: 'Bs. Bùi Thị B',
    contact_phone: '0987654321',
    created_at: new Date().toISOString(),
  },
  {
    id: 'org-003',
    name: 'Tòa nhà Văn phòng Keangnam Landmark',
    code: 'KEANGNAM-HN',
    type: 'office',
    address: 'Phạm Hùng, Nam Từ Liêm, Hà Nội',
    lat: 21.0168,
    lng: 105.7839,
    contact_name: 'Ban Quản lý Tòa nhà',
    contact_phone: '0243999888',
    created_at: new Date().toISOString(),
  },
];

const SAMPLE_NODES = [
  {
    id: 'node-001',
    chip_id: 'ESP32-CVA-01',
    name: 'Node Sân trường CVA',
    organization_id: 'org-001',
    organization_name: 'Trường THPT Chu Văn An',
    lat: 21.0428,
    lng: 105.8286,
    location_name: 'Sân trung tâm',
    status: 'online',
    edition: 'outdoor_solar',
    power_source: 'solar',
    battery: 98,
    rssi: -58,
    hardware_ver: 'ESP32-Solar-v2.1',
    mqtt_topic: 'airweave/nodes/ESP32-CVA-01/telemetry',
    pm25: 18.4,
    pm10: 32.1,
    aqi: 64,
    temperature: 28.5,
    humidity: 62,
    uv_index: 5.4,
    last_seen_at: new Date().toISOString(),
  },
  {
    id: 'node-002',
    chip_id: 'ESP32-CVA-02',
    name: 'Node Phòng Thể thao CVA',
    organization_id: 'org-001',
    organization_name: 'Trường THPT Chu Văn An',
    lat: 21.0422,
    lng: 105.8281,
    location_name: 'Nhà thi đấu đa năng',
    status: 'online',
    edition: 'indoor_grid',
    power_source: 'grid',
    battery: 100,
    rssi: -64,
    hardware_ver: 'ESP32-Grid-v2.1',
    mqtt_topic: 'airweave/nodes/ESP32-CVA-02/telemetry',
    pm25: 14.2,
    pm10: 25.8,
    aqi: 55,
    temperature: 26.0,
    humidity: 58,
    co2: 620,
    voc_index: 38,
    last_seen_at: new Date().toISOString(),
  },
  {
    id: 'node-003',
    chip_id: 'ESP32-BVHN-01',
    name: 'Node Sảnh Cấp cứu BV Hồng Ngọc',
    organization_id: 'org-002',
    organization_name: 'Bệnh viện Đa khoa Hồng Ngọc',
    lat: 21.0405,
    lng: 105.8453,
    location_name: 'Sảnh chính Tầng 1',
    status: 'online',
    edition: 'indoor_grid',
    power_source: 'grid',
    battery: 100,
    rssi: -52,
    hardware_ver: 'ESP32-Grid-v3.0',
    mqtt_topic: 'airweave/nodes/ESP32-BVHN-01/telemetry',
    pm25: 11.5,
    pm10: 20.4,
    aqi: 48,
    temperature: 24.2,
    humidity: 50,
    co2: 480,
    voc_index: 22,
    last_seen_at: new Date().toISOString(),
  },
  {
    id: 'node-004',
    chip_id: 'ESP32-KGN-01',
    name: 'Node Khuôn viên Keangnam',
    organization_id: 'org-003',
    organization_name: 'Tòa nhà Văn phòng Keangnam Landmark',
    lat: 21.0169,
    lng: 105.7841,
    location_name: 'Cổng B1',
    status: 'maintenance',
    edition: 'outdoor_solar',
    power_source: 'solar',
    battery: 45,
    rssi: -78,
    hardware_ver: 'ESP32-Solar-v1.0',
    mqtt_topic: 'airweave/nodes/ESP32-KGN-01/telemetry',
    pm25: 35.8,
    pm10: 68.2,
    aqi: 101,
    temperature: 31.0,
    humidity: 70,
    uv_index: 7.8,
    last_seen_at: new Date(Date.now() - 3600000).toISOString(),
  },
];


@Injectable()
export class NodesService implements OnModuleInit {
  private readonly logger = new Logger(NodesService.name);
  private isSimulating = true;
  private memoryOrgs = [...SAMPLE_ORGS];
  private memoryNodes = [...SAMPLE_NODES];
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}


  onModuleInit() {
    this.startSimulator();
  }

  // --- SIMULATION ENGINE ---
  public startSimulator() {
    if (this.simulationInterval) return;
    this.isSimulating = true;
    this.logger.log('🚀 IoT Telemetry Simulation Engine started');

    this.simulationInterval = setInterval(() => {
      if (!this.isSimulating) return;

      // Update in-memory nodes with smooth realistic telemetry fluctuations
      this.memoryNodes = this.memoryNodes.map((node) => {
        if (node.status === 'offline') return node;

        const pm25Delta = (Math.random() - 0.48) * 3;
        const newPm25 = Math.max(5, Math.min(180, Number((node.pm25 + pm25Delta).toFixed(1))));
        const newPm10 = Number((newPm25 * 1.6 + Math.random() * 2).toFixed(1));
        const newAqi = calculateAqiFromPm25(newPm25);
        const tempDelta = (Math.random() - 0.5) * 0.4;
        const newTemp = Number((node.temperature + tempDelta).toFixed(1));
        const hour = new Date().getHours();
        const baseUv = hour >= 6 && hour <= 17 ? Math.sin(((hour - 6) / 11) * Math.PI) * 8.5 : 0;
        const newUv = Number((Math.max(0, baseUv + (Math.random() - 0.5) * 0.8)).toFixed(1));
        const newCo2 = Math.round(420 + Math.random() * 250 + (hour >= 8 && hour <= 17 ? 180 : 0));
        const newVoc = Math.round(25 + Math.random() * 45);

        const updatedNode = {
          ...node,
          pm25: newPm25,
          pm10: newPm10,
          aqi: newAqi,
          temperature: newTemp,
          uv_index: newUv,
          co2: newCo2,
          voc_index: newVoc,
          last_seen_at: new Date().toISOString(),
        };

        // Evaluate smart alerts for CO2 & UV thresholds
        void this.notificationsService.evaluateIotNodeAlerts(updatedNode, {
          co2: newCo2,
          uv_index: newUv,
          aqi: newAqi,
        });

        return updatedNode;



      });
    }, 4000);
  }

  public stopSimulator() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
    this.logger.log('⏸️ IoT Telemetry Simulation Engine paused');
  }

  public toggleSimulator() {
    if (this.isSimulating) {
      this.stopSimulator();
    } else {
      this.startSimulator();
    }
    return { isSimulating: this.isSimulating };
  }

  public getSimulatorStatus() {
    return { isSimulating: this.isSimulating };
  }

  // --- ADMIN DASHBOARD METRICS ---
  async getAdminStats() {
    const totalNodes = this.memoryNodes.length;
    const onlineNodes = this.memoryNodes.filter((n) => n.status === 'online').length;
    const offlineNodes = this.memoryNodes.filter((n) => n.status === 'offline').length;
    const maintenanceNodes = this.memoryNodes.filter((n) => n.status === 'maintenance').length;
    const totalOrgs = this.memoryOrgs.length;

    const avgAqi = Math.round(
      this.memoryNodes.reduce((acc, n) => acc + n.aqi, 0) / (totalNodes || 1),
    );

    return {
      totalNodes,
      onlineNodes,
      offlineNodes,
      maintenanceNodes,
      totalOrgs,
      avgAqi,
      isSimulating: this.isSimulating,
      mqttStatus: 'connected',
      mqttBroker: 'mqtt://broker.airweave.vn:1883',
      totalTelemetry24h: 1440 * totalNodes,
    };
  }

  // --- ORGANIZATIONS CRUD ---
  async listOrganizations() {
    try {
      const dbOrgs = await this.prisma.organization.findMany({
        include: { _count: { select: { nodes: true, users: true } } },
      });
      if (dbOrgs.length > 0) return dbOrgs;
    } catch {
      // Fallback to memory
    }

    return this.memoryOrgs.map((org) => {
      const nodesCount = this.memoryNodes.filter((n) => n.organization_id === org.id).length;
      return {
        ...org,
        _count: { nodes: nodesCount, users: 3 },
      };
    });
  }

  async createOrganization(dto: CreateOrganizationDto) {
    const newOrg = {
      id: `org-${Date.now()}`,
      name: dto.name,
      code: dto.code.toUpperCase(),
      type: dto.type || 'school',
      address: dto.address || null,
      lat: dto.lat || 21.0285,
      lng: dto.lng || 105.8542,
      contact_name: dto.contact_name || null,
      contact_phone: dto.contact_phone || null,
      created_at: new Date().toISOString(),
    };

    try {
      return await this.prisma.organization.create({ data: newOrg });
    } catch {
      this.memoryOrgs.push(newOrg);
      return newOrg;
    }
  }

  // --- IOT NODES CRUD ---
  async listNodes(orgId?: string) {
    let nodes = this.memoryNodes;
    if (orgId) {
      nodes = nodes.filter((n) => n.organization_id === orgId);
    }
    return nodes;
  }

  async getNodeDetails(id: string) {
    const node = this.memoryNodes.find((n) => n.id === id || n.chip_id === id);
    if (!node) throw new NotFoundException('IoT Node không tồn tại');

    // Generate recent 10 telemetry historical points for charting
    const history = Array.from({ length: 12 }).map((_, i) => {
      const time = new Date(Date.now() - (11 - i) * 300000);
      const varPm = Math.max(5, node.pm25 + (Math.sin(i) * 4));
      return {
        recorded_at: time.toISOString(),
        pm25: Number(varPm.toFixed(1)),
        pm10: Number((varPm * 1.5).toFixed(1)),
        aqi: calculateAqiFromPm25(varPm),
        temperature: node.temperature,
        humidity: node.humidity,
        battery: node.battery,
        rssi: node.rssi,
      };
    });

    return { ...node, history };
  }

  async createNode(dto: CreateIotNodeDto) {
    const org = this.memoryOrgs.find((o) => o.id === dto.organization_id);

    const newNode = {
      id: `node-${Date.now()}`,
      chip_id: dto.chip_id,
      name: dto.name,
      organization_id: dto.organization_id || null,
      organization_name: org?.name || 'Tự do (Chưa gán)',
      lat: dto.lat,
      lng: dto.lng,
      location_name: dto.location_name || 'Khu vực chưa đặt tên',
      status: 'online',
      battery: 100,
      rssi: -60,
      hardware_ver: dto.hardware_ver || 'ESP32-Air-v2.1',
      mqtt_topic: `airweave/nodes/${dto.chip_id}/telemetry`,
      pm25: 15.0,
      pm10: 25.0,
      aqi: 57,
      temperature: 27.0,
      humidity: 60,
      last_seen_at: new Date().toISOString(),
    };

    this.memoryNodes.push(newNode);
    return newNode;
  }

  async assignNodeToOrg(nodeId: string, orgId: string) {
    const node = this.memoryNodes.find((n) => n.id === nodeId);
    const org = this.memoryOrgs.find((o) => o.id === orgId);

    if (!node) throw new NotFoundException('IoT Node không tồn tại');
    if (!org) throw new NotFoundException('Tổ chức không tồn tại');

    node.organization_id = org.id;
    (node as any).organization_name = org.name;

    return node;
  }

  // --- TELEMETRY INGESTION (API endpoint for real physical ESP32 devices) ---
  async ingestTelemetry(dto: IngestTelemetryDto) {
    let node = this.memoryNodes.find((n) => n.chip_id === dto.chip_id);

    const aqi = calculateAqiFromPm25(dto.pm25);

    if (!node) {
      // Auto register auto-discovered ESP32 node
      node = {
        id: `node-${Date.now()}`,
        chip_id: dto.chip_id,
        name: `IoT Node (${dto.chip_id})`,
        organization_id: null,
        organization_name: 'Tự do (Chưa gán)',
        lat: 21.0285,
        lng: 105.8542,
        location_name: 'Vị trí mới phát hiện',
        status: 'online',
        battery: dto.battery ?? 100,
        rssi: dto.rssi ?? -65,
        hardware_ver: 'ESP32-Auto',
        mqtt_topic: `airweave/nodes/${dto.chip_id}/telemetry`,
        pm25: dto.pm25,
        pm10: dto.pm10,
        aqi,
        temperature: dto.temperature ?? 26,
        humidity: dto.humidity ?? 60,
        last_seen_at: new Date().toISOString(),
      };
      this.memoryNodes.push(node);
    } else {
      node.pm25 = dto.pm25;
      node.pm10 = dto.pm10;
      node.aqi = aqi;
      if (dto.temperature !== undefined) node.temperature = dto.temperature;
      if (dto.humidity !== undefined) node.humidity = dto.humidity;
      if (dto.battery !== undefined) node.battery = dto.battery;
      if (dto.rssi !== undefined) node.rssi = dto.rssi;
      node.status = 'online';
      node.last_seen_at = new Date().toISOString();
    }

    return { success: true, chip_id: dto.chip_id, aqi };
  }

  // --- MQTT AUTO-DISCOVERY & ZERO-TOUCH PROVISIONING ---
  async autoDiscoverNode(dto: { chip_id: string; hardware_ver?: string; edition?: string; mac?: string; lat?: number; lng?: number }) {
    let existing = this.memoryNodes.find((n) => n.chip_id === dto.chip_id);

    if (existing) {
      existing.status = 'online';
      existing.last_seen_at = new Date().toISOString();
      return { isNew: false, node: existing };
    }

    const newNode = {
      id: `node-${Date.now()}`,
      chip_id: dto.chip_id,
      name: `✨ Node Mới Phát Hiện (${dto.chip_id})`,
      organization_id: null,
      organization_name: 'Chưa gán (Node Mới Khai Báo)',
      lat: dto.lat || 21.0285,
      lng: dto.lng || 105.8542,
      location_name: 'Khai báo tự động qua MQTT',
      status: 'online',
      edition: dto.edition || 'outdoor_solar',
      power_source: dto.edition === 'indoor_grid' ? 'grid' : 'solar',
      battery: 100,
      rssi: -58,
      hardware_ver: dto.hardware_ver || 'ESP32-AutoDiscover-v2.0',
      mqtt_topic: `airweave/nodes/${dto.chip_id}/telemetry`,
      pm25: 12.0,
      pm10: 20.0,
      aqi: 50,
      temperature: 27.0,
      humidity: 55,
      last_seen_at: new Date().toISOString(),
    };

    this.memoryNodes.push(newNode);
    this.logger.log(`✨ AUTO-DISCOVERY: Đã phát hiện và ghi nhận Zero-Touch IoT Node mới: ${dto.chip_id}`);

    return { isNew: true, node: newNode };
  }

  async getUnassignedNodes() {
    return this.memoryNodes.filter((n) => !n.organization_id || n.organization_name?.includes('Chưa gán'));
  }

  // --- USER ORG DASHBOARD METRICS ---
  async getOrgDashboard(orgId: string) {
    const org = this.memoryOrgs.find((o) => o.id === orgId) || this.memoryOrgs[0];
    const nodes = this.memoryNodes.filter((n) => n.organization_id === org.id);

    const avgAqi = nodes.length
      ? Math.round(nodes.reduce((s, n) => s + n.aqi, 0) / nodes.length)
      : 50;

    return {
      organization: org,
      nodes,
      summary: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((n) => n.status === 'online').length,
        avgAqi,
        airQualityCategory:
          avgAqi <= 50 ? 'Tốt' : avgAqi <= 100 ? 'Trung bình' : 'Kém',
      },
    };
  }
}
