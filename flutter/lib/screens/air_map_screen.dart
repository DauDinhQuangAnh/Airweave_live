import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/live_air_provider.dart';
import '../models/iot_node.dart';
import '../widgets/radar_marker.dart';

class AirMapScreen extends StatefulWidget {
  const AirMapScreen({Key? key}) : super(key: key);

  @override
  State<AirMapScreen> createState() => _AirMapScreenState();
}

class _AirMapScreenState extends State<AirMapScreen> {
  final MapController _mapController = MapController();

  void _showNodeModal(BuildContext context, IotNode node) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF06101E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E5FF).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.bolt, color: Color(0xFF00E5FF), size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          node.name,
                          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '🏢 ${node.organizationName ?? "Vi vùng"}',
                          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.emerald.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.emerald),
                    ),
                    child: Text(
                      'AQI ${node.aqi}',
                      style: const TextStyle(color: Colors.emeraldAccent, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(color: Colors.white10),
              const SizedBox(height: 8),

              // Chỉ số môi trường đo trực tiếp
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetricTile('PM2.5', '${node.pm25} µg/m³'),
                  _buildMetricTile('PM10', '${node.pm10} µg/m³'),
                  _buildMetricTile('Nhiệt độ', '${node.temperature}°C'),
                  _buildMetricTile('Độ ẩm', '${node.humidity}%'),
                ],
              ),
              const SizedBox(height: 12),

              if (node.uvIndex != null || node.co2 != null)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    if (node.uvIndex != null) _buildMetricTile('Tia UV', '${node.uvIndex}'),
                    if (node.co2 != null) _buildMetricTile('Khí CO2', '${node.co2} ppm'),
                    _buildMetricTile('Nguồn', node.powerSource == 'solar' ? '☀️ Solar' : '⚡ Grid'),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricTile(String label, String value) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final airProvider = Provider.of<LiveAirProvider>(context);
    final userCenter = LatLng(airProvider.userLat, airProvider.userLng);

    final markers = <Marker>[
      // User Location Marker
      Marker(
        point: userCenter,
        width: 40,
        height: 40,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF00E5FF).withOpacity(0.3),
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFF00E5FF), width: 2),
          ),
          child: const Icon(Icons.my_location, color: Colors.white, size: 20),
        ),
      ),

      // IoT Physical Node Markers with animated cyan radar pulse
      ...airProvider.nodes.map(
        (node) => Marker(
          point: LatLng(node.lat, node.lng),
          width: 80,
          height: 50,
          child: RadarMarker(
            aqi: node.aqi,
            label: node.name,
            onTap: () => _showNodeModal(context, node),
          ),
        ),
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: userCenter,
              initialZoom: 13.5,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
              ),
              MarkerLayer(markers: markers),
            ],
          ),

          // Header Overlay Bar
          SafeArea(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF06101E).withOpacity(0.9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.map, color: Color(0xFF00E5FF), size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Bản đồ vi vùng IoT AirWeave',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.center_focus_strong, color: Colors.white70, size: 20),
                    onPressed: () => _mapController.move(userCenter, 14.0),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
