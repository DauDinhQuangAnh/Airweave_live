import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passController = TextEditingController();

  void _handleLogin() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    auth.login(_userController.text, _passController.text);
  }

  void _fillAdminPreset() {
    _userController.text = 'admin';
    _passController.text = 'admin';
    _handleLogin();
  }

  void _fillUserPreset() {
    _userController.text = 'User Demo';
    _passController.text = '123456';
    _handleLogin();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo Brand AirWeave
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF00E5FF), Color(0xFF0077FE)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00E5FF).withOpacity(0.35),
                        blurRadius: 24,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.air, color: Colors.white, size: 44),
                ),
                const SizedBox(height: 16),

                const Text(
                  'AirWeave IoT',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
                Text(
                  'Giám sát Chất lượng Không khí Vi vùng & IoT Nodes',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // Form Đăng nhập
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF06101E),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    children: [
                      TextField(
                        controller: _userController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Tài khoản / Email',
                          labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                          prefixIcon: const Icon(Icons.person, color: Color(0xFF00E5FF)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Colors.white10),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Color(0xFF00E5FF)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _passController,
                        obscureText: true,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Mật khẩu',
                          labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                          prefixIcon: const Icon(Icons.lock, color: Color(0xFF00E5FF)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Colors.white10),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Color(0xFF00E5FF)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00E5FF),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'Đăng Nhập',
                            style: TextStyle(
                              color: Color(0xFF030810),
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Fast Presets for Quick Testing & Admin Entry Point
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.amber.withOpacity(0.15),
                        Colors.orange.withOpacity(0.08),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.amberAccent.withOpacity(0.4)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.shield_rounded, color: Colors.amberAccent, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'Bạn là Quản trị viên / Quản lý Trạm?',
                            style: TextStyle(
                              color: Colors.amberAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Đăng nhập với tài khoản admin / admin để mở toàn bộ tính năng Bảng điều khiển Quản trị IoT Nodes.',
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _fillAdminPreset,
                          icon: const Icon(Icons.bolt, color: Colors.amberAccent, size: 18),
                          label: const Text(
                            '🔑 1-Click Đăng nhập Admin (admin/admin)',
                            style: TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.amber.withOpacity(0.1),
                            side: const BorderSide(color: Colors.amberAccent),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Nút Đăng nhập Người dùng Demo & Khách
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _fillUserPreset,
                        icon: const Icon(Icons.person, color: Color(0xFF00E5FF), size: 18),
                        label: const Text('Người dùng Demo', style: TextStyle(color: Color(0xFF00E5FF), fontSize: 11)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF00E5FF)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                TextButton(
                  onPressed: () => auth.loginAsGuest(),
                  child: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    decoration: TextDecoration.underline,
                  ),
                ),

              ],
            ),
          ),
        ),
      ),
    );
  }
}
