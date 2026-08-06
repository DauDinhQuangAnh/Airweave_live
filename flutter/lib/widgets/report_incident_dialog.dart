import 'package:flutter/material.dart';

class ReportIncidentDialog extends StatefulWidget {
  final double lat;
  final double lng;

  const ReportIncidentDialog({Key? key, required this.lat, required this.lng}) : super(key: key);

  @override
  State<ReportIncidentDialog> createState() => _ReportIncidentDialogState();
}

class _ReportIncidentDialogState extends State<ReportIncidentDialog> {
  String _selectedKind = 'trash_fire';
  final _descriptionController = TextEditingController();

  final Map<String, String> _kinds = {
    'trash_fire': '🔥 Đốt rác / Khói độc ngột ngạt',
    'construction_dust': '🏗️ Mù bụi công trình',
    'chemical_odor': '☣️ Mùi hóa chất / Thuốc trừ sâu',
    'heavy_traffic_smoke': '🚚 Xe xả khói đen ô nhiễm',
  };

  void _submitReport() {
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: Color(0xFF00E5FF),
        content: Text(
          '🎉 Đã gửi Báo cáo Ô nhiễm thành công! Cảm ơn bạn đã đóng góp cho cộng đồng.',
          style: TextStyle(color: Color(0xFF030810), fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF06101E),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
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
                    color: Colors.orange.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.warning_amber_rounded, color: Colors.orangeAccent, size: 22),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Gửi Báo cáo Ô nhiễm Vi vùng',
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            const Text('Loại sự cố phát hiện:', style: TextStyle(color: Colors.white70, fontSize: 12)),
            const SizedBox(height: 8),

            ..._kinds.entries.map((entry) => RadioListTile<String>(
                  title: Text(entry.value, style: const TextStyle(color: Colors.white, fontSize: 12)),
                  value: entry.key,
                  groupValue: _selectedKind,
                  activeColor: const Color(0xFF00E5FF),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (val) => setState(() => _selectedKind = val!),
                )),

            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Mô tả chi tiết vị trí hoặc tình trạng ô nhiễm...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.white10),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF00E5FF)),
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('Hủy', style: TextStyle(color: Colors.white.withOpacity(0.5))),
                  ),
                ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submitReport,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E5FF),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Gửi Báo cáo', style: TextStyle(color: Color(0xFF030810), fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
