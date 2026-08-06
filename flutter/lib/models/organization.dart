class Organization {
  final String id;
  final String name;
  final String code;
  final String type;
  final String address;
  final double lat;
  final double lng;
  final String contactName;
  final String contactPhone;
  final int activeNodesCount;

  Organization({
    required this.id,
    required this.name,
    required this.code,
    required this.type,
    required this.address,
    required this.lat,
    required this.lng,
    required this.contactName,
    required this.contactPhone,
    this.activeNodesCount = 0,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      code: json['code'] ?? '',
      type: json['type'] ?? 'school',
      address: json['address'] ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 21.0285,
      lng: (json['lng'] as num?)?.toDouble() ?? 105.8542,
      contactName: json['contact_name'] ?? '',
      contactPhone: json['contact_phone'] ?? '',
      activeNodesCount: (json['_count']?['nodes'] as num?)?.toInt() ?? 0,
    );
  }
}
