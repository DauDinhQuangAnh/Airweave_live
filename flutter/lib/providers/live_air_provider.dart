import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/iot_node.dart';
import '../models/weather_data.dart';
import '../models/organization.dart';
import '../services/api_service.dart';

class LiveAirProvider extends ChangeNotifier {
  double _userLat = 21.0430;
  double _userLng = 105.8320;
  String _userLocationLabel = 'Gần Trường THPT Chu Văn An, Hà Nội';

  WeatherData _weather = WeatherData.initial();
  List<IotNode> _nodes = [];
  List<Organization> _organizations = [];

  IotNode? _matchedNode;
  int? _distanceMeters;
  bool _isConnectedToNode = false;
  String? _activeMatchedNodeId;

  Timer? _refreshTimer;
  bool _isLoading = false;

  LiveAirProvider() {
    init();
  }

  double get userLat => _userLat;
  double get userLng => _userLng;
  String get userLocationLabel => _userLocationLabel;
  WeatherData get weather => _weather;
  List<IotNode> get nodes => _nodes;
  List<Organization> get organizations => _organizations;
  IotNode? get matchedNode => _isConnectedToNode ? _matchedNode : null;
  int? get distanceMeters => _isConnectedToNode ? _distanceMeters : null;
  bool get isConnectedToNode => _isConnectedToNode;
  bool get isLoading => _isLoading;

  void init() {
    refreshData();
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) => refreshTelemetryOnly());
  }

  Future<void> refreshData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final fetchedNodes = await ApiService.fetchNodes();
      final fetchedOrgs = await ApiService.fetchOrganizations();
      final fetchedWeather = await ApiService.fetchLiveAir(_userLat, _userLng);

      _nodes = fetchedNodes;
      _organizations = fetchedOrgs;

      _evaluateProximityAndOverride(fetchedWeather);
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshTelemetryOnly() async {
    try {
      final fetchedNodes = await ApiService.fetchNodes();
      _nodes = fetchedNodes;
      _evaluateProximityAndOverride(_weather);
      notifyListeners();
    } catch (_) {}
  }

  void updateUserLocation(double lat, double lng, String label) {
    _userLat = lat;
    _userLng = lng;
    _userLocationLabel = label;
    refreshData();
  }

  /** Thuật toán Haversine tính khoảng cách giữa 2 điểm GPS (mét) */
  int _calculateDistanceMeters(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180.0;
    final dLng = (lng2 - lng1) * pi / 180.0;

    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180.0) * cos(lat2 * pi / 180.0) * sin(dLng / 2) * sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return (R * c).round();
  }

  /** Thuật toán Hysteresis Geofencing (<500m kết nối, >650m ngắt) + Override */
  void _evaluateProximityAndOverride(WeatherData baseWeather) {
    if (_nodes.isEmpty) {
      _isConnectedToNode = false;
      _matchedNode = null;
      _weather = baseWeather;
      return;
    }

    IotNode? closestNode;
    int minDistance = 9999999;

    for (final node in _nodes) {
      if (node.status != 'offline') {
        final d = _calculateDistanceMeters(_userLat, _userLng, node.lat, node.lng);
        node.distanceKm = (d / 1000.0);
        if (d < minDistance) {
          minDistance = d;
          closestNode = node;
        }
      }
    }

    const connectThreshold = 500; // 500m
    const disconnectThreshold = 650; // 650m

    if (_activeMatchedNodeId != null) {
      if (minDistance > disconnectThreshold) {
        _activeMatchedNodeId = null;
        _isConnectedToNode = false;
        _matchedNode = null;
      }
    } else {
      if (minDistance <= connectThreshold && closestNode != null) {
        _activeMatchedNodeId = closestNode.id;
        _isConnectedToNode = true;
        _matchedNode = closestNode;
      }
    }

    // Telemetry Override khi kết nối trực tiếp với Node gần nhất
    if (_isConnectedToNode && closestNode != null) {
      _matchedNode = closestNode;
      _distanceMeters = minDistance;
      _weather = WeatherData(
        aqi: closestNode.aqi,
        pm25: closestNode.pm25,
        pm10: closestNode.pm10,
        temperature: closestNode.temperature,
        humidity: closestNode.humidity,
        station: '${closestNode.name} (${closestNode.organizationName ?? 'Vi vùng'})',
        source: 'iot-node',
        updatedAt: closestNode.lastSeenAt,
        isNodeOverride: true,
      );
    } else {
      _weather = baseWeather;
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
