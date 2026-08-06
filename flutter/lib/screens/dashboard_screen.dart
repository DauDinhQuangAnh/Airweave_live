import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/live_air_provider.dart';
import '../widgets/node_proximity_badge.dart';
import '../widgets/health_guidance_card.dart';
import '../widgets/report_incident_dialog.dart';
import 'smart_route_screen.dart';


class DashboardScreen extends StatelessWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  Color _getAqiColor(int aqi) {
    if (aqi <= 50) return const Color(0xFF00E676);
    if (aqi <= 100) return const Color(0xFFFFD600);
    if (aqi <= 150) return const Color(0xFFFF9100);
    if (aqi <= 200) return const Color(0xFFFF1744);
    if (aqi <= 300) return const Color(0xFFAA00FF);
    return const Color(0xFF880E4F);
  }

  String _getAqiStatusText(int aqi) {
    if (aqi <= 50) return 'Tốt — Không khí trong lành';
    if (aqi <= 100) return 'Trung bình — Chấp nhận được';
    if (aqi <= 150) return 'Kém — Nhạy cảm nên hạn chế ra ngoài';
    if (aqi <= 200) return 'Xấu — Hạn chế thể dục ngoài trời';
    if (aqi <= 300) return 'Rất Xấu — Tránh hoạt động ngoài trời';
    return 'Nguy hại — Hãy ở trong nhà!';
  }

  @override
  Widget build(BuildContext context) {
    final airProvider = Provider.of<LiveAirProvider>(context);
    final weather = airProvider.weather;
    final matchedNode = airProvider.matchedNode;
    final distanceMeters = airProvider.distanceMeters;

    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF06101E),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on, color: Color(0xFF00E5FF), size: 16),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    airProvider.userLocationLabel,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            Text(
              'Trạm: ${weather.station}',
              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: airProvider.isLoading ? const Color(0xFF00E5FF) : Colors.white70),
            onPressed: () => airProvider.refreshData(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => airProvider.refreshData(),
        color: const Color(0xFF00E5FF),
        backgroundColor: const Color(0xFF06101E),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            children: [
              // Banner Node Proximity (<500m)
              if (airProvider.isConnectedToNode && matchedNode != null && distanceMeters != null)
                NodeProximityBadge(
                  matchedNode: matchedNode,
                  distanceMeters: distanceMeters,
                ),

              // Main AQI Card
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _getAqiColor(weather.aqi).withOpacity(0.25),
                      const Color(0xFF091424),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: _getAqiColor(weather.aqi).withOpacity(0.5), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: _getAqiColor(weather.aqi).withOpacity(0.15),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getAqiColor(weather.aqi).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _getAqiColor(weather.aqi)),
                          ),
                          child: Text(
                            'US EPA AQI',
                            style: TextStyle(
                              color: _getAqiColor(weather.aqi),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Text(
                          weather.source == 'iot-node' ? '⚡ Đo Trực Tiếp từ Node' : '🌐 Dữ liệu WAQI',
                          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Số AQI khổng lồ
                    Text(
                      '${weather.aqi}',
                      style: TextStyle(
                        fontSize: 64,
                        fontWeight: FontWeight.w900,
                        color: _getAqiColor(weather.aqi),
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Trạng thái AQI
                    Text(
                      _getAqiStatusText(weather.aqi),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),

                    // Grid các thông số chỉ số phụ (PM2.5, PM10, Temp, Humidity)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSubMetric('PM2.5', '${weather.pm25}', 'µg/m³'),
                        _buildSubMetric('PM10', '${weather.pm10}', 'µg/m³'),
                        _buildSubMetric('Nhiệt độ', '${weather.temperature}°C', 'Khí hậu'),
                        _buildSubMetric('Độ ẩm', '${weather.humidity}%', 'Nồm ẩm'),
                      ],
                    ),
                  ],
                ),
              ),

              // Quick Action Bar: Báo cáo Sự cố & Smart Route
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (_) => ReportIncidentDialog(lat: airProvider.userLat, lng: airProvider.userLng),
                          );
                        },
                        icon: const Icon(Icons.warning_amber_rounded, size: 16),
                        label: const Text('Báo cáo Ô nhiễm', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.withOpacity(0.2),
                          foregroundColor: Colors.orangeAccent,
                          elevation: 0,
                          side: const BorderSide(color: Colors.orangeAccent),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const SmartRouteScreen()),
                          );
                        },
                        icon: const Icon(Icons.navigation_rounded, size: 16),
                        label: const Text('Smart Route', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00E5FF).withOpacity(0.2),
                          foregroundColor: const Color(0xFF00E5FF),
                          elevation: 0,
                          side: const BorderSide(color: Color(0xFF00E5FF)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Khuyến cáo Sức khỏe Cá nhân hóa
              HealthGuidanceCard(aqi: weather.aqi),


              // Widget Danh sách các Node IoT gần nhất
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF091424),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '🌐 Node IoT Khu Vực Gần Nhất',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${airProvider.nodes.length} Node',
                          style: const TextStyle(color: Color(0xFF00E5FF), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    ...airProvider.nodes.map((node) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.white.withOpacity(0.08)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.emeraldAccent,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      node.name,
                                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      '🏢 ${node.organizationName ?? "Vi vùng"} ${node.distanceKm != null ? "· Cách ${node.distanceKm}km" : ""}',
                                      style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getAqiColor(node.aqi).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'AQI ${node.aqi}',
                                  style: TextStyle(
                                    color: _getAqiColor(node.aqi),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubMetric(String label, String value, String unit) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
        Text(unit, style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
      ],
    );
  }
}
