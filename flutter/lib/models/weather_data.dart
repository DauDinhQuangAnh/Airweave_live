class WeatherData {
  final int aqi;
  final double pm25;
  final double pm10;
  final double temperature;
  final int humidity;
  final String station;
  final String source;
  final String updatedAt;
  final bool isNodeOverride;

  WeatherData({
    required this.aqi,
    required this.pm25,
    required this.pm10,
    required this.temperature,
    required this.humidity,
    required this.station,
    required this.source,
    required this.updatedAt,
    this.isNodeOverride = false,
  });

  factory WeatherData.initial() {
    return WeatherData(
      aqi: 45,
      pm25: 11.2,
      pm10: 18.5,
      temperature: 28.5,
      humidity: 65,
      station: 'Trạm Chu Văn An',
      source: 'waqi',
      updatedAt: DateTime.now().toIso8601String(),
    );
  }

  factory WeatherData.fromJson(Map<String, dynamic> json) {
    return WeatherData(
      aqi: (json['aqi'] as num?)?.toInt() ?? 0,
      pm25: (json['pm25'] as num?)?.toDouble() ?? 0.0,
      pm10: (json['pm10'] as num?)?.toDouble() ?? 0.0,
      temperature: (json['temperature'] as num?)?.toDouble() ?? 25.0,
      humidity: (json['humidity'] as num?)?.toInt() ?? 60,
      station: json['station'] ?? json['label'] ?? 'Vi vùng',
      source: json['source'] ?? 'waqi',
      updatedAt: json['snapshot_updated_at'] ?? json['updatedAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}
