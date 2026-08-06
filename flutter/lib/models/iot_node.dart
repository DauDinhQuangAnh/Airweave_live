class IotNode {
  final String id;
  final String chipId;
  final String name;
  final String? organizationId;
  final String? organizationName;
  final double lat;
  final double lng;
  final String locationName;
  final String status;
  final String edition; // 'outdoor_solar' | 'indoor_grid'
  final String powerSource; // 'solar' | 'grid'
  final int battery;
  final int rssi;
  final String hardwareVer;
  final String mqttTopic;
  final double pm25;
  final double pm10;
  final int aqi;
  final double temperature;
  final int humidity;
  final double? uvIndex;
  final int? co2;
  final int? vocIndex;
  final String lastSeenAt;
  double? distanceKm;

  IotNode({
    required this.id,
    required this.chipId,
    required this.name,
    this.organizationId,
    this.organizationName,
    required this.lat,
    required this.lng,
    required this.locationName,
    required this.status,
    this.edition = 'outdoor_solar',
    this.powerSource = 'solar',
    required this.battery,
    required this.rssi,
    required this.hardwareVer,
    required this.mqttTopic,
    required this.pm25,
    required this.pm10,
    required this.aqi,
    required this.temperature,
    required this.humidity,
    this.uvIndex,
    this.co2,
    this.vocIndex,
    required this.lastSeenAt,
    this.distanceKm,
  });

  factory IotNode.fromJson(Map<String, dynamic> json) {
    return IotNode(
      id: json['id'] ?? '',
      chipId: json['chip_id'] ?? '',
      name: json['name'] ?? 'IoT Node',
      organizationId: json['organization_id'],
      organizationName: json['organization_name'],
      lat: (json['lat'] as num?)?.toDouble() ?? 21.0285,
      lng: (json['lng'] as num?)?.toDouble() ?? 105.8542,
      locationName: json['location_name'] ?? 'Vi vùng',
      status: json['status'] ?? 'online',
      edition: json['edition'] ?? 'outdoor_solar',
      powerSource: json['power_source'] ?? 'solar',
      battery: (json['battery'] as num?)?.toInt() ?? 100,
      rssi: (json['rssi'] as num?)?.toInt() ?? -60,
      hardwareVer: json['hardware_ver'] ?? 'ESP32-v2',
      mqttTopic: json['mqtt_topic'] ?? '',
      pm25: (json['pm25'] as num?)?.toDouble() ?? 12.0,
      pm10: (json['pm10'] as num?)?.toDouble() ?? 20.0,
      aqi: (json['aqi'] as num?)?.toInt() ?? 50,
      temperature: (json['temperature'] as num?)?.toDouble() ?? 28.0,
      humidity: (json['humidity'] as num?)?.toInt() ?? 60,
      uvIndex: (json['uv_index'] as num?)?.toDouble(),
      co2: (json['co2'] as num?)?.toInt(),
      vocIndex: (json['voc_index'] as num?)?.toInt(),
      lastSeenAt: json['last_seen_at'] ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'chip_id': chipId,
        'name': name,
        'organization_id': organizationId,
        'organization_name': organizationName,
        'lat': lat,
        'lng': lng,
        'location_name': locationName,
        'status': status,
        'edition': edition,
        'power_source': powerSource,
        'battery': battery,
        'rssi': rssi,
        'hardware_ver': hardwareVer,
        'mqtt_topic': mqttTopic,
        'pm25': pm25,
        'pm10': pm10,
        'aqi': aqi,
        'temperature': temperature,
        'humidity': humidity,
        'uv_index': uvIndex,
        'co2': co2,
        'voc_index': vocIndex,
        'last_seen_at': lastSeenAt,
      };
}
