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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import {
  CreateOrganizationDto,
  CreateIotNodeDto,
  IngestTelemetryDto,
  AutoDiscoverNodeDto,
} from './nodes.dto';

@ApiTags('IoT Nodes & Organizations')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  // ---------- Admin dashboard (yêu cầu quyền quản trị) ----------

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thống kê tổng quan cho Admin Dashboard' })
  getAdminStats() {
    return this.nodesService.getAdminStats();
  }

  @Get('admin/simulator/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy trạng thái Telemetry Simulator' })
  getSimulatorStatus() {
    return this.nodesService.getSimulatorStatus();
  }

  @Post('admin/simulator/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bật / Tắt Telemetry Simulator Engine' })
  toggleSimulator() {
    return this.nodesService.toggleSimulator();
  }

  // ---------- Tổ chức ----------

  @Get('organizations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách các Tổ chức (Trường học, Bệnh viện, Cơ quan)' })
  listOrganizations() {
    return this.nodesService.listOrganizations();
  }

  @Post('organizations')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới Tổ chức' })
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.nodesService.createOrganization(dto);
  }

  // ---------- IoT Nodes (đọc: người dùng đã đăng nhập) ----------

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách tất cả IoT Nodes' })
  listNodes(@Query('orgId') orgId?: string) {
    return this.nodesService.listNodes(orgId);
  }

  @Get('details/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết 1 IoT Node kèm lịch sử đo' })
  getNodeDetails(@Param('id') id: string) {
    return this.nodesService.getNodeDetails(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới / Thêm 1 IoT Node mới' })
  createNode(@Body() dto: CreateIotNodeDto) {
    return this.nodesService.createNode(dto);
  }

  @Patch('assign/:nodeId/org/:orgId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gán IoT Node vào Tổ chức' })
  assignNodeToOrg(
    @Param('nodeId') nodeId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.nodesService.assignNodeToOrg(nodeId, orgId);
  }

  @Get('unassigned')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các Node mới phát hiện chưa gán Tổ chức' })
  getUnassignedNodes() {
    return this.nodesService.getUnassignedNodes();
  }

  @Get('org-dashboard/:orgId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dữ liệu Bảng điều khiển riêng cho đại diện Tổ chức' })
  getOrgDashboard(@Param('orgId') orgId: string) {
    return this.nodesService.getOrgDashboard(orgId);
  }

  // ---------- Endpoint cho thiết bị phần cứng ESP32 (xác thực bằng device token) ----------

  @Post('telemetry/ingest')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({ summary: 'API nhận số liệu từ thiết bị phần cứng ESP32 thật' })
  ingestTelemetry(@Body() dto: IngestTelemetryDto) {
    return this.nodesService.ingestTelemetry(dto);
  }

  @Post('autodiscover')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({ summary: 'API Tự động Khai báo Node mới cắm nguồn qua MQTT (Zero-Touch Provisioning)' })
  autoDiscoverNode(@Body() dto: AutoDiscoverNodeDto) {
    return this.nodesService.autoDiscoverNode(dto);
  }
}
