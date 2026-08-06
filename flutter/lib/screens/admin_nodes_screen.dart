import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/live_air_provider.dart';
import '../services/api_service.dart';

class AdminNodesScreen extends StatelessWidget {
  const AdminNodesScreen({Key? key}) : super(key: key);

  void _triggerAutoDiscover(BuildContext context, LiveAirProvider provider) async {
    final chipId = 'ESP32-AUTO-${1000 + (DateTime.now().millisecond % 9000)}';
    final success = await ApiService.autoDiscoverNode(chipId);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF062C43),
        content: Text(
          success
              ? '✨ Đã nhận tín hiệu Zero-Touch MQTT Auto-Discover: [$chipId]!'
              : 'Lỗi phát hiện node tự động',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
    provider.refreshData();
  }

  @override
  Widget build(BuildContext context) {
    final airProvider = Provider.of<LiveAirProvider>(context);
    final nodes = airProvider.nodes;

    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF06101E),
        elevation: 0,
        title: const Text(
          'Quản trị IoT Nodes Vật lý',
          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.bolt, color: Colors.amberAccent),
            tooltip: 'Zero-Touch MQTT Auto-Discover',
            onPressed: () => _triggerAutoDiscover(context, airProvider),
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: nodes.length,
        itemBuilder: (context, index) {
          final node = nodes[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF091424),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(node.name, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.emerald.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('Pin ${node.battery}%', style: const TextStyle(color: Colors.emeraldAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('CHIP: ${node.chipId} · Version: ${node.hardwareVer}', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                Text('📍 ${node.locationName}', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10)),
                const SizedBox(height: 8),

                Row(
                  children: [
                    Text('Nguồn: ${node.powerSource == "solar" ? "☀️ Tấm pin Solar" : "⚡ Điện lưới 220V"}', style: const TextStyle(color: Color(0xFF00E5FF), fontSize: 10)),
                    const Spacer(),
                    Text('Sóng: ${node.rssi} dBm', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
