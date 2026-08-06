import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/iot_node.dart';
import '../models/organization.dart';
import '../models/weather_data.dart';

class ApiService {
  // Mặc định hỗ trợ Android Emulator (10.0.2.2) & Localhost (127.0.0.1)
  static String baseUrl = 'http://10.0.2.2:3000/api';

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  // --- IOT NODES APIS ---
  static Future<List<IotNode>> fetchNodes({String? orgId}) async {
    try {
      final uri = Uri.parse('$baseUrl/nodes/list${orgId != null ? '?orgId=$orgId' : ''}');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        return list.map((item) => IotNode.fromJson(item)).toList();
      }
    } catch (_) {}
    return _sampleNodes();
  }

  static Future<List<Organization>> fetchOrganizations() async {
    try {
      final uri = Uri.parse('$baseUrl/nodes/organizations');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        return list.map((item) => Organization.fromJson(item)).toList();
      }
    } catch (_) {}
    return _sampleOrgs();
  }

  static Future<bool> createNode(Map<String, dynamic> payload) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/nodes/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> assignNodeToOrg(String nodeId, String orgId) async {
    try {
      final res = await http.patch(
        Uri.parse('$baseUrl/nodes/assign/$nodeId/org/$orgId'),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> autoDiscoverNode(String chipId) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/nodes/autodiscover'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'chip_id': chipId,
          'hardware_ver': 'ESP32-MobileZeroTouch',
          'edition': 'outdoor_solar',
        }),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  static Future<WeatherData> fetchLiveAir(double lat, double lng) async {
    try {
      final uri = Uri.parse('$baseUrl/air/current?lat=$lat&lng=$lng');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        return WeatherData.fromJson(jsonDecode(res.body));
      }
    } catch (_) {}
    return WeatherData.initial();
  }

  // --- FALLBACK MOCK DATA FOR ZERO-DOWNTIME DEMO ---
  static List<IotNode> _sampleNodes() {
    return [
      IotNode(
        id: 'node-001',
        chipId: 'ESP32-SOLAR-CVA01',
        name: 'Node Cảm biến Sân trường THPT Chu Văn An',
        organizationId: 'org-001',
        organizationName: 'Trường THPT Chu Văn An',
        lat: 21.0435,
        lng: 105.8324,
        locationName: 'Thụy Khuê, Tây Hồ, Hà Nội',
        status: 'online',
        edition: 'outdoor_solar',
        powerSource: 'solar',
        battery: 98,
        rssi: -58,
        hardwareVer: 'ESP32-Solar-v2.1',
        mqttTopic: 'airweave/nodes/cva01/telemetry',
        pm25: 14.2,
        pm10: 22.5,
        aqi: 55,
        temperature: 28.5,
        humidity: 62,
        uvIndex: 8.2,
        co2: 430,
        vocIndex: 28,
        lastSeenAt: DateTime.now().toIso8601String(),
      ),
      IotNode(
        id: 'node-002',
        chipId: 'ESP32-GRID-KEANG02',
        name: 'Node Cảm biến Keangnam Landmark 72',
        organizationId: 'org-002',
        organizationName: 'Keangnam Landmark 72',
        lat: 21.0168,
        lng: 105.7839,
        locationName: 'Phạm Hùng, Nam Từ Liêm, Hà Nội',
        status: 'online',
        edition: 'indoor_grid',
        powerSource: 'grid',
        battery: 100,
        rssi: -52,
        hardwareVer: 'ESP32-Grid-v2.1',
        mqttTopic: 'airweave/nodes/keang02/telemetry',
        pm25: 28.6,
        pm10: 44.0,
        aqi: 86,
        temperature: 25.2,
        humidity: 58,
        uvIndex: 2.1,
        co2: 1280,
        vocIndex: 85,
        lastSeenAt: DateTime.now().toIso8601String(),
      ),
    ];
  }

  static List<Organization> _sampleOrgs() {
    return [
      Organization(
        id: 'org-001',
        name: 'Trường THPT Chu Văn An',
        code: 'CVA-HANOI',
        type: 'school',
        address: '10 Thụy Khuê, Tây Hồ, Hà Nội',
        lat: 21.0435,
        lng: 105.8324,
        contactName: 'Thầy Nguyễn Văn Nam',
        contactPhone: '0912345678',
        activeNodesCount: 1,
      ),
      Organization(
        id: 'org-002',
        name: 'Keangnam Landmark 72',
        code: 'KEANGNAM-HQ',
        type: 'office',
        address: 'Phạm Hùng, Nam Từ Liêm, Hà Nội',
        lat: 21.0168,
        lng: 105.7839,
        contactName: 'Ban Quản lý Tòa nhà',
        contactPhone: '02437722888',
        activeNodesCount: 1,
      ),
    ];
  }
}
