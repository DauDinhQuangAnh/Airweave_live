import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/live_air_provider.dart';

class OrgDashboardScreen extends StatelessWidget {
  const OrgDashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final airProvider = Provider.of<LiveAirProvider>(context);
    final orgs = airProvider.organizations;

    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF06101E),
        elevation: 0,
        title: const Text(
          'Bảng điều khiển Tổ chức',
          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: orgs.length,
        itemBuilder: (context, index) {
          final org = orgs[index];
          final orgNodes = airProvider.nodes.where((n) => n.organizationId == org.id || n.organizationName == org.name).toList();

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            org.name,
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '📍 ${org.address}',
                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${orgNodes.length} Node Active',
                        style: const TextStyle(color: Color(0xFF00E5FF), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: Colors.white10),
                const SizedBox(height: 8),

                ...orgNodes.map((node) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(node.name, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              Text('📍 ${node.locationName}', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            ],
                          ),
                          Text('AQI ${node.aqi}', style: const TextStyle(color: Colors.emeraldAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}
