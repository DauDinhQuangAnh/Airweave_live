import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoggedIn = true; // Mặc định vào thẳng với quyền User thử nghiệm
  bool _isAdmin = false;
  String _username = 'Người dùng Vi vùng';
  String _role = 'user';

  AuthProvider() {
    _loadState();
  }

  bool get isLoggedIn => _isLoggedIn;
  bool get isAdmin => _isAdmin;
  String get username => _username;
  String get role => _role;

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    _isLoggedIn = prefs.getBool('isLoggedIn') ?? true;
    _isAdmin = prefs.getBool('isAdmin') ?? false;
    _username = prefs.getString('username') ?? (_isAdmin ? 'Quản trị viên Hệ thống' : 'Người dùng Vi vùng');
    _role = prefs.getString('role') ?? (_isAdmin ? 'admin' : 'user');
    notifyListeners();
  }

  Future<bool> login(String user, String pass) async {
    final prefs = await SharedPreferences.getInstance();

    if (user.trim() == 'admin' && pass.trim() == 'admin') {
      _isLoggedIn = true;
      _isAdmin = true;
      _username = 'Quản trị viên Hệ thống';
      _role = 'admin';
    } else {
      _isLoggedIn = true;
      _isAdmin = false;
      _username = user.isNotEmpty ? user : 'Người dùng Vi vùng';
      _role = 'user';
    }

    await prefs.setBool('isLoggedIn', _isLoggedIn);
    await prefs.setBool('isAdmin', _isAdmin);
    await prefs.setString('username', _username);
    await prefs.setString('role', _role);

    notifyListeners();
    return true;
  }

  Future<void> loginAsGuest() async {
    final prefs = await SharedPreferences.getInstance();
    _isLoggedIn = true;
    _isAdmin = false;
    _username = 'Khách vi phạm ô nhiễm';
    _role = 'guest';

    await prefs.setBool('isLoggedIn', true);
    await prefs.setBool('isAdmin', false);
    await prefs.setString('username', _username);
    await prefs.setString('role', _role);

    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    _isLoggedIn = false;
    _isAdmin = false;
    _username = '';
    _role = '';
    await prefs.clear();
    notifyListeners();
  }
}
