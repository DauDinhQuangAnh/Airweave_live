import 'package:flutter/material.dart';

class SmartRouteScreen extends StatefulWidget {
  const SmartRouteScreen({Key? key}) : super(key: key);

  @override
  State<SmartRouteScreen> createState() => _SmartRouteScreenState();
}

class _SmartRouteScreenState extends State<SmartRouteScreen> {
  final _originController = TextEditingController(text: 'Vị trí hiện tại (Tây Hồ, Hà Nội)');
  final _destController = TextEditingController(text: 'Đại học Bách Khoa Hà Nội');
  bool _calculated = false;

  void _calculateRoute() {
    setState(() {
      _calculated = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF06101E),
        elevation: 0,
        title: const Text(
          'Smart Route — Lộ trình Tránh Ô nhiễm',
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Input Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF091424),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _originController,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: const InputDecoration(
                      labelText: 'Điểm đi',
                      labelStyle: TextStyle(color: Colors.white54),
                      prefixIcon: Icon(Icons.trip_origin, color: Color(0xFF00E5FF), size: 18),
                      border: InputBorder.none,
                    ),
                  ),
                  const Divider(color: Colors.white10),
                  TextField(
                    controller: _destController,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: const InputDecoration(
                      labelText: 'Điểm đến',
                      labelStyle: TextStyle(color: Colors.white54),
                      prefixIcon: Icon(Icons.place, color: Colors.orangeAccent, size: 18),
                      border: InputBorder.none,
                    ),
                  ),
                  const SizedBox(height: 12),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _calculateRoute,
                      icon: const Icon(Icons.navigation_rounded, size: 18),
                      label: const Text('Tìm Lộ Trình Xanh Sạch', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: const Color(0xFF030810),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Route Comparison Cards
            if (_calculated) ...[
              const Text(
                'Gợi ý Lộ trình Tối ưu:',
                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              // Option 1: Clean Route (Recommended)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.emerald.withOpacity(0.2),
                      const Color(0xFF091424),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.emerald, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.emerald,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text('🌟 KHUYÊN DÙNG — LỘ TRÌNH SACH', style: TextStyle(color: Color(0xFF030810), fontSize: 10, fontWeight: FontWeight.w900)),
                        ),
                        const Text('AQI 42 · Sạch', style: TextStyle(color: Colors.emeraldAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text('Tuyến đường: Ven Hồ Tây ➔ Đường Vành Đai 2 ➔ Bách Khoa', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('⏱️ 22 phút · 🚗 8.4 km · Giảm 68% phơi nhiễm bụi PM2.5', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11)),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Option 2: Shortest direct route
              Container(
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
                        const Text('Lộ trình Ngắn nhất (Nghẽn Khói Độc)', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                        const Text('AQI 145 · Kém', style: TextStyle(color: Colors.orangeAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('Tuyến đường: Qua Ngã Tư Sở ➔ Trường Chinh', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text('⏱️ 19 phút · 🚗 7.8 km · Đi qua 3 điểm nóng ô nhiễm', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
