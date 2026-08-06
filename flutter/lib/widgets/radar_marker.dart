import 'package:flutter/material.dart';

class RadarMarker extends StatefulWidget {
  final int aqi;
  final String label;
  final VoidCallback? onTap;

  const RadarMarker({
    Key? key,
    required this.aqi,
    required this.label,
    this.onTap,
  }) : super(key: key);

  @override
  State<RadarMarker> createState() => _RadarMarkerState();
}

class _RadarMarkerState extends State<RadarMarker> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          return Stack(
            alignment: Alignment.center,
            children: [
              // Sóng radar Cyan nhấp nháy lan tỏa
              Container(
                width: 36 + (_animation.value * 24),
                height: 36 + (_animation.value * 24),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF00E5FF).withOpacity(1.0 - _animation.value),
                ),
              ),

              // Marker chính
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF062C43), Color(0xFF051923)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF00E5FF), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00E5FF).withOpacity(0.5),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.bolt, color: Color(0xFF00E5FF), size: 14),
                    const SizedBox(width: 2),
                    Text(
                      '${widget.aqi}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
