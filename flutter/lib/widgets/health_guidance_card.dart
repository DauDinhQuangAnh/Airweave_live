import 'package:flutter/material.dart';

class HealthGuidanceCard extends StatefulWidget {
  final int aqi;

  const HealthGuidanceCard({Key? key, required this.aqi}) : super(key: key);

  @override
  State<HealthGuidanceCard> createState() => _HealthGuidanceCardState();
}

class _HealthGuidanceCardState extends State<HealthGuidanceCard> {
  String _selectedGroup = 'asthma';

  final Map<String, String> _groups = {
    'general': '👤 Người khỏe mạnh',
    'asthma': '🫁 Hen suyễn / Hô hấp',
    'children': '👶 Trẻ nhỏ',
    'elderly': '👴 Người cao tuổi',
  };

  String _getAdvice() {
    if (widget.aqi <= 50) {
      return 'Không khí tuyệt vời! Rất thích hợp cho các hoạt động thể thao ngoài trời.';
    }
    if (widget.aqi <= 100) {
      if (_selectedGroup == 'asthma') {
        return 'Chất lượng trung bình. Nhóm nhạy cảm hô hấp nên mang khẩu trang khi ra đường.';
      }
      return 'Không khí chấp nhận được. Thoải mái mở cửa sổ thông thoáng nhà cửa.';
    }
    if (widget.aqi <= 150) {
      if (_selectedGroup == 'asthma' || _selectedGroup == 'children') {
        return '⚠️ CẢNH BÁO: Hạn chế hoạt động gắng sức ngoài trời. Hãy mang khẩu trang N95 khi di chuyển!';
      }
      return 'Không khí ở mức kém. Nên đeo khẩu trang khi di chuyển trên đường.';
    }
    return '🚨 CẢNH BÁO XẤU: Hãy ở trong nhà, bật máy lọc không khí và hạn chế tối đa ra ngoài!';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
            children: [
              const Icon(Icons.medical_services_rounded, color: Color(0xFF00E5FF), size: 18),
              const SizedBox(width: 8),
              const Text(
                'Khuyến cáo Sức khỏe Cá nhân hóa',
                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Group selector chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _groups.entries.map((entry) {
                final isSelected = _selectedGroup == entry.key;
                return GestureDetector(
                  onTap: () => setState(() => _selectedGroup = entry.key),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF00E5FF).withOpacity(0.2) : Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF00E5FF) : Colors.white10,
                      ),
                    ),
                    child: Text(
                      entry.value,
                      style: TextStyle(
                        color: isSelected ? const Color(0xFF00E5FF) : Colors.white70,
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.4),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: Colors.amberAccent, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _getAdvice(),
                    style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
