import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import {
  CreateOrganizationDto,
  CreateIotNodeDto,
  IngestTelemetryDto,
} from './nodes.dto';

@ApiTags('IoT Nodes & Organizations')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get('admin/stats')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Admin Dashboard' })
  getAdminStats() {
    return this.nodesService.getAdminStats();
  }

  @Get('admin/simulator/status')
  @ApiOperation({ summary: 'Lấy trạng thái Telemetry Simulator' })
  getSimulatorStatus() {
    return this.nodesService.getSimulatorStatus();
  }

  @Post('admin/simulator/toggle')
  @ApiOperation({ summary: 'Bật / Tắt Telemetry Simulator Engine' })
  toggleSimulator() {
    return this.nodesService.toggleSimulator();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Danh sách các Tổ chức (Trường học, Bệnh viện, Cơ quan)' })
  listOrganizations() {
    return this.nodesService.listOrganizations();
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Tạo mới Tổ chức' })
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.nodesService.createOrganization(dto);
  }

  @Get('list')
  @ApiOperation({ summary: 'Danh sách tất cả IoT Nodes' })
  listNodes(@Query('orgId') orgId?: string) {
    return this.nodesService.listNodes(orgId);
  }

  @Get('details/:id')
  @ApiOperation({ summary: 'Chi tiết 1 IoT Node kèm lịch sử đo' })
  getNodeDetails(@Param('id') id: string) {
    return this.nodesService.getNodeDetails(id);
  }

  @Post('create')
  @ApiOperation({ summary: 'Tạo mới / Thêm 1 IoT Node mới' })
  createNode(@Body() dto: CreateIotNodeDto) {
    return this.nodesService.createNode(dto);
  }

  @Patch('assign/:nodeId/org/:orgId')
  @ApiOperation({ summary: 'Gán IoT Node vào Tổ chức' })
  assignNodeToOrg(
    @Param('nodeId') nodeId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.nodesService.assignNodeToOrg(nodeId, orgId);
  }

  @Post('telemetry/ingest')
  @ApiOperation({ summary: 'API nhận số liệu từ thiết bị phần cứng ESP32 thật' })
  ingestTelemetry(@Body() dto: IngestTelemetryDto) {
    return this.nodesService.ingestTelemetry(dto);
  }

  @Post('autodiscover')
  @ApiOperation({ summary: 'API Tự động Khai báo Node mới cắm nguồn qua MQTT (Zero-Touch Provisioning)' })
  autoDiscoverNode(@Body() dto: { chip_id: string; hardware_ver?: string; edition?: string; mac?: string }) {
    return this.nodesService.autoDiscoverNode(dto);
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Lấy danh sách các Node mới phát hiện chưa gán Tổ chức' })
  getUnassignedNodes() {
    return this.nodesService.getUnassignedNodes();
  }

  @Get('org-dashboard/:orgId')
  @ApiOperation({ summary: 'Dữ liệu Bảng điều khiển riêng cho đại diện Tổ chức' })
  getOrgDashboard(@Param('orgId') orgId: string) {
    return this.nodesService.getOrgDashboard(orgId);
  }
}

