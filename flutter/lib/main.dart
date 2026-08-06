import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/live_air_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/air_map_screen.dart';
import 'screens/org_dashboard_screen.dart';
import 'screens/admin_nodes_screen.dart';
import 'screens/smart_route_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF030810),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LiveAirProvider()),
      ],
      child: const AirWeaveApp(),
    ),
  );
}

class AirWeaveApp extends StatelessWidget {
  const AirWeaveApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AirWeave IoT Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF030810),
        primaryColor: const Color(0xFF00E5FF),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00E5FF),
          secondary: Color(0xFF0077FE),
          surface: Color(0xFF06101E),
          background: Color(0xFF030810),
        ),
        fontFamily: 'Roboto',
      ),
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (!auth.isLoggedIn) {
            return const LoginScreen();
          }
          return const MainNavigationShell();
        },
      ),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({Key? key}) : super(key: key);

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = auth.isAdmin;

    // Tabs cho Admin (đăng nhập tài khoản admin/admin) vs User thường
    final List<Widget> screens = isAdmin
        ? const [
            DashboardScreen(),
            AirMapScreen(),
            OrgDashboardScreen(),
            AdminNodesScreen(),
          ]
        : const [
            DashboardScreen(),
            AirMapScreen(),
            SmartRouteScreen(),
            OrgDashboardScreen(),
          ];

    final List<BottomNavigationBarItem> navItems = isAdmin
        ? const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Tổng quan'),
            BottomNavigationBarItem(icon: Icon(Icons.map_rounded), label: 'Bản đồ'),
            BottomNavigationBarItem(icon: Icon(Icons.business_rounded), label: 'Tổ chức'),
            BottomNavigationBarItem(icon: Icon(Icons.bolt), label: 'IoT Admin'),
          ]
        : const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Tổng quan'),
            BottomNavigationBarItem(icon: Icon(Icons.map_rounded), label: 'Bản đồ'),
            BottomNavigationBarItem(icon: Icon(Icons.navigation_rounded), label: 'Smart Route'),
            BottomNavigationBarItem(icon: Icon(Icons.business_rounded), label: 'Tổ chức'),
          ];

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(36),
        child: SafeArea(
          child: Container(
            color: const Color(0xFF06101E),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isAdmin ? Icons.shield : Icons.person,
                      color: isAdmin ? Colors.amberAccent : const Color(0xFF00E5FF),
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${auth.username} ${isAdmin ? "(Quyền Admin)" : ""}',
                      style: TextStyle(
                        color: isAdmin ? Colors.amberAccent : Colors.white70,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => auth.logout(),
                  child: const Text(
                    'Đăng xuất ➔',
                    style: TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _currentIndex < screens.length ? _currentIndex : 0,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF06101E),
          border: Border(top: BorderSide(color: Colors.white10, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex < navItems.length ? _currentIndex : 0,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: const Color(0xFF06101E),
          selectedItemColor: isAdmin ? Colors.amberAccent : const Color(0xFF00E5FF),
          unselectedItemColor: Colors.white38,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: navItems,
        ),
      ),
    );
  }
}
